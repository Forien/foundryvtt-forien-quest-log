import Socket        from '../modules/control/Socket.js';

import dbSchema_1    from './dbSchema_1.js';

import { constants } from '../modules/model/constants.js';

const migrateImpl = {
   0: () => {},   // Schema level 0 is a noop / assume all data is stored in JE content.
   1: dbSchema_1  // Migrate to schema 1 transferring any old data to JE flags.
};

export default class DBMigration
{
   static get version() { return 1; }
   static get setting() { return 'dbSchema'; }

   static async migrate()
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

         const schemaVersion = game.settings.get(constants.moduleName, this.setting);

         // The DB schema matches the current version
         if (schemaVersion === this.version) { return; }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Start'));

         for (let version = schemaVersion; version <=  this.version; version++)
         {
            if (version !== 0)
            {
               ui.notifications.info(game.i18n.format('ForienQuestLog.Migration.Schema', { version }));
            }

            await migrateImpl[version]();
         }

         ui.notifications.info(game.i18n.localize('ForienQuestLog.Migration.Complete'));

         Socket.refreshQuestLog();
      }
      catch (err)
      {
         console.error(err);
      }
   }
}