import DBMigration   from './DBMigration.js';
import { constants } from '../modules/model/constants.js';

/**
 * Performs DB migration from schema 0 to 1.
 *
 * @returns {Promise<void>}
 */
export default async function()
{
   console.log('!!! migrate - 1');

   // await game.settings.set(constants.moduleName, DBMigration.setting, 1);
}