import dbSchema_1    from './dbSchema_1.js';

import { constants } from '../modules/model/constants.js';

const migrateImpl = {
   0: () => {},   // Schema level 0 is a noop / assume all data is stored in JE content.
   1: dbSchema_1, // Migrate to schema 1 transferring any old data to JE flags.
   2: () => { console.log('!!! migrate - 2'); },
   3: () => { console.log('!!! migrate - 3'); },
   4: () => { console.log('!!! migrate - 4'); },
   5: () => { console.log('!!! migrate - 5'); },
};

export default class DBMigration
{
   static get version() { return 1; }
   static get setting() { return 'dbSchema'; }

   static async migrate()
   {
      try
      {
         const schemaVersion = game.settings.get(constants.moduleName, this.setting);

console.log(`DBMigration migrate - 0 - schemaVersion: ${schemaVersion}`);

         // The DB schema matches the current version
         if (schemaVersion === this.version) { return; }

         for (let cntr = schemaVersion; cntr <=  this.version; cntr++)
         {
            await migrateImpl[cntr]();
         }
      }
      catch (err)
      {
console.log(`An error has been detected in Forien Quest Log DB migration.`);
console.error(err);
      }
   }

   /**
    * Registers the DB Schema world setting. By default this is 0. The `0.7.0` release of FQL has a schema of `1`.
    */
   static register()
   {
      game.settings.register(constants.moduleName, this.setting, {
         scope: 'world',
         config: false,
         default: 0,
         type: Number
      });
   }
}