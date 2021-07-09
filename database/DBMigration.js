import Socket        from '../src/control/Socket.js';
import QuestDB       from '../src/control/QuestDB.js';
import QuestFolder   from '../src/model/QuestFolder.js';
import { constants } from '../src/model/constants.js';

import dbSchema_1    from './dbSchema_1.js';
import dbSchema_2    from './dbSchema_2.js';

const migrateImpl = {
   0: () => {},   // Schema level 0 is a noop / assume all data is stored in JE content.
   1: dbSchema_1, // Migrate to schema 1 transferring any old data to JE flags.
   2: dbSchema_2  // Schema 2 - store quest giver image in Quest data instead of doing a UUID lookup in Enrich
};

export default class DBMigration
{
   static get version() { return 2; }
   static get setting() { return 'dbSchema'; }

   /**
    * Runs DB migration. If no `schemaVersion` is set the module setting {@link DBMigration.setting} is used to get the
    * current schema value which is stored after any migration occurs. There is a hook available
    * `ForienQuestLog.Run.DBMigration`.
    *
    * @param {number}   schemaVersion - A valid schema version from 0 to DBMigration.version - 1
    *
    * @returns {Promise<void>}
    */
   static async migrate(schemaVersion = void 0)
   {
      try
      {
         // Registers the DB Schema world setting. By default this is 0. The `0.7.0` release of FQL has a schema of `1`.
         game.settings.register(constants.moduleName, this.setting, {
            scope: 'world',
            config: false,
            default: 0,
            type: Number
         });

         if (schemaVersion === void 0)
         {
            schemaVersion = game.settings.get(constants.moduleName, this.setting);
         }
         else
         {
            if (!Number.isInteger(schemaVersion) || schemaVersion < 0 || schemaVersion > DBMigration.version - 1)
            {
               const err = `ForienQuestLog - DBMigrate.migrate - schemaVersion must be an integer (0 - ${
                DBMigration.version - 1})`;

               ui.notifications.error(err);
               console.error(err);
            }
         }

         // The DB schema matches the current version
         if (schemaVersion === this.version) { return; }

         schemaVersion++;

         // Sanity check to make sure there is a schema migration function for the next schema update.
         if (typeof migrateImpl[schemaVersion] !== 'function') { return; }

         const folder = await QuestFolder.initializeJournals();

         // Early out if there are no journal entries / quests in the `_fql-quests` folder.
         if (folder?.content?.length === 0)
         {
            await game.settings.set(constants.moduleName, DBMigration.setting, DBMigration.version);
            return;
         }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Start'));

         // Start at the schema version
         for (let version = schemaVersion; version <= this.version; version++)
         {
            if (version !== 0)
            {
               ui.notifications.info(game.i18n.format('ForienQuestLog.Migration.Schema', { version }));
            }

            await migrateImpl[version]();
         }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Complete'));

         Socket.refreshAll();
      }
      catch (err)
      {
         console.error(err);
      }
   }
}