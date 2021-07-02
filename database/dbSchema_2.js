import DBMigration   from './DBMigration.js';
import Enrich        from '../modules/control/Enrich.js';
import QuestFolder   from '../modules/model/QuestFolder.js';
import Quest         from '../modules/model/Quest.js';
import { constants } from '../modules/model/constants.js';

/**
 * Performs DB migration from schema 1 to 2.
 *
 * New data field:
 * {string} giverImage - Stores the quest giver image.
 *
 * The purpose of this update is to store the quest giver data in the new `giverData` field.
 * Presently the quest giver if non abstract and a Foundry UUID is looked up in the enrich process via `fromUUID` to
 * retrieve this data. This is the only asynchronous action during the enrichment process and to provide QuestDB /
 * in-memory caching of Quest and enriched data the process needs to be synchronous to make sure that order of
 * operations succeeds atomically and as quick as possible. This update will process all quest data and perform that
 * lookup and store the quest giver data in `giverData`. In FQL 0.7.4 and above to update the quest giver data the
 * user needs to open QuestPreview and simply save the quest. A macro will also be provided to update all quest giver
 * data in bulk.
 *
 * @returns {Promise<void>}
 */
export default async function()
{
   const folder = await QuestFolder.initializeJournals();

   /**
    * @type {Quest[]}
    */
   for (const entry of folder.content)
   {
      try
      {
         const content = entry.getFlag(constants.moduleName, constants.flagDB);

         if (content)
         {
            const quest = new Quest(content, entry);

            const data = await Enrich.giverFromQuest(quest);
            if (typeof data.img === 'string' && data.img.length) { quest.giverData = data; }
            await quest.save();
         }
         else
         {
            console.log(game.i18n.format('ForienQuestLog.Migration.CouldNotMigrate', { name: entry.data.name }));
            await entry.delete();
         }
      }
      catch (err)
      {
         console.log(game.i18n.format('ForienQuestLog.Migration.CouldNotMigrate', { name: entry.data.name }));
         await entry.delete();
      }
   }

   await game.settings.set(constants.moduleName, DBMigration.setting, 2);
}
