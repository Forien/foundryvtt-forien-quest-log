import Socket        from '../src/control/Socket.js';
import Utils         from '../src/control/Utils.js';
import { constants } from '../src/model/constants.js';

import { V10Compat } from '../src/V10Compat.js';

import dbSchema_1    from './dbSchema_1.js';
import dbSchema_2    from './dbSchema_2.js';
import dbSchema_3    from './dbSchema_3.js';

/**
 * Defines the callback functions to execute for each schemaVersion level.
 *
 * @type {Object<number, Function>}
 */
const migrateImpl = {
   0: () => {},   // Schema level 0 is a noop / assume all data is stored in JE content.
   1: dbSchema_1, // Migrate to schema 1 transferring any old data to JE flags.
   2: dbSchema_2, // Schema 2 - store quest giver data in Quest data instead of doing a UUID lookup in Enrich.
   3: dbSchema_3, // V10 image / name refresh - dnd5e system amongst others have significant image path changes for compendiums.
};

/**
 * Provides a utility module to manage DB migrations when new versions of FQL are installed / loaded for the first time.
 * These updates are organized as schema versions with callback functions defined above. Each schema migration function
 * stores the version number in module settings for {@link DBMigration.setting}. On startup {@link DBMigration.migrate}
 * is invoked in the `ready` Hook callback from `./src/init.js`. If the current schema version already equals
 * {@link DBMigration.version} no migration occurs. Also if there are no journal entries in the `_fql_quests` folder
 * no migration occurs which is often the case with a new world and the module setting is set to not run migration
 * again.
 *
 * In the case that a GM needs to manually run migration there is a hook defined in {@link FQLHooks.runDBMigration}.
 * This is `ForienQuestLog.Run.DBMigration` which can be executed by a macro with
 * `Hooks.call('ForienQuestLog.Run.DBMigration', <schemaVersion>);`. To run all migration manually substitute
 * `<schemaVersion>` with `0`.
 *
 * @see registerHooks
 */
export default class DBMigration
{
   /**
    * Defines the current max schema version.
    * NOTE: schema v3 is only run on V10 thus the ternary below.
    *
    * @returns {number} max schema version.
    */
   static get version() { return V10Compat.isV10 ? 3 : 2; }

   /**
    * Defines the module setting key to store current level DB migration level that already has run for schemaVersion.
    *
    * @returns {string} module setting for schemaVersion.
    */
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

         // If no schemaVersion is defined then pull the value from module settings.
         if (schemaVersion === void 0)
         {
            schemaVersion = game.settings.get(constants.moduleName, this.setting);
         }
         else
         {
            // Otherwise make sure that the schemaVersion supplied to migrate is valid.
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

         // Increment the schema version to run against the proper callback function.
         schemaVersion++;

         // Sanity check to make sure there is a schema migration function for the next schema update.
         if (typeof migrateImpl[schemaVersion] !== 'function') { return; }

         const folder = await Utils.initializeQuestFolder();

         // Early out if there are no journal entries / quests in the `_fql-quests` folder.
         // Note: v10 compatibility w/ `folder.contents` vs `folder.content`.
         const folderContentLength = folder?.contents?.length ?? folder?.content?.length ?? 0;
         if (folderContentLength === 0)
         {
            await game.settings.set(constants.moduleName, DBMigration.setting, DBMigration.version);
            return;
         }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Notifications.Start'));

         // Start at the schema version and stop when the version exceeds the max version.
         for (let version = schemaVersion; version <= this.version; version++)
         {
            if (version !== 0)
            {
               ui.notifications.info(game.i18n.format('ForienQuestLog.Migration.Notifications.Schema', { version }));
            }

            await migrateImpl[version]();
         }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Notifications.Complete'));

         Socket.refreshAll();
      }
      catch (err)
      {
         console.error(err);
      }
   }
}