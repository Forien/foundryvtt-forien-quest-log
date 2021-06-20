import DBMigration               from './DBMigration.js';
import QuestFolder               from '../modules/model/QuestFolder.js';
import Quest                     from '../modules/model/Quest.js';
import { constants, questTypes } from '../modules/model/constants.js';

/**
 * Performs DB migration from schema 0 to 1.
 *
 * New data fields:
 * - location -> string; default: null
 * - priority -> number; default: 0
 * - type -> string; default: null
 * - date -> object
 *    - create
 *    - active
 *    - end
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
         const flagContent = entry.getFlag(constants.moduleName, constants.flagDB);

         const content = flagContent ? flagContent : await migrateData(entry);

         if (content !== null)
         {
            // The new DB schema gets picked up in Quest -> initData.
            const quest = new Quest(content, entry);

            await entry.update({
               content: '',
               permission: { default: CONST.ENTITY_PERMISSIONS.OBSERVER }, // TODO: GET DEFAULT CONFIG SETTING
               flags: {
                  [constants.moduleName]: { json: quest.toJSON() }
               }
            });
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

   await game.settings.set(constants.moduleName, DBMigration.setting, 1);
}

/**
 * Attempts to migrate data from FQL 0.6.0 or prior to new 0.7.0 data format. This function also attempts to reverse any
 * damage that the initial server side sanitation filters may have caused to the old data format.
 *
 * @param {JournalEntry}   entry - The source journal entry storing quest data.
 *
 * @returns {object|null} Loaded Quest data or null if loading fails.
 */
async function migrateData(entry)
{
   let content;

   try
   {
      // Strip leading / trailing HTML tags in case someone attempted to look at / modify the JE.
      let entryContent = entry.data.content;
      entryContent = entryContent.replace(/^<p>/, '');
      entryContent = entryContent.replace(/<\/p>$/, '');

      try
      {
         // If parsing fails here we are then dealing with damaged data likely from 0.7.10 / 0.8.6
         // server side sanitation filters.
         content = JSON.parse(entryContent);
      }
      catch (e1)
      {
         try
         {
            // These regex substitutions will attempt to reverse damage to the stored JSON.
            entryContent = entryContent.replace(/("\\&quot;|\\&quot;")/gm, '\\"');
            entryContent = entryContent.replace(/:">/gm, '\\">');
            entryContent = entryContent.replace(/:" /gm, '\\" ');

            // Non-printable characters need to be removed; replace the entire range of non-printable characters.
            entryContent = entryContent.replace(/[\x00-\x1F]/gm, '');  // eslint-disable-line no-control-regex

            content = JSON.parse(entryContent);
         }
         catch (e2)
         {
            console.error(e2);
            return null;
         }
      }
   }
   catch (e)
   {
      console.error(e);
      return null;
   }

   // Convert title to name; all new Quest use `name` instead of `title` to match Foundry document model
   content.name = content.title;
   delete content.title;

   // As things go the rewards format for the new FQL only stores UUID and basic info. Can't support old
   // rewards format.
   content.rewards = [];

   // Old FQL will often store the entire actor data as the giver, so if it is not a string then set to null.
   // Verify the quest giver exists; look up UUID.
   if (typeof content.giver === 'string')
   {
      try
      {
         const doc = await fromUuid(content.giver);
         if (!doc) { content.giver = null; }
      }
      catch (err) { content.giver = null; }
   }
   else // Handle the situation where the giver could be the complete actor data or is already null.
   {
      content.giver = null;
   }

   // Verify that parent quest is valid.
   if (content.parent)
   {
      try
      {
         const doc = game.journal.get(content.parent);
         if (!doc) { content.parent = null; }
      }
      catch (err) { content.parent = null; }
   }

   // Verify that all subquests refer to active journal entries; if not then remove them.
   if (Array.isArray(content.subquests))
   {
      const subquests = [];
      for (const subquest of content.subquests)
      {
         try
         {
            const doc = game.journal.get(subquest);
            if (doc) { subquests.push(subquest); }
         }
         catch (err) { /* */ }
      }

      content.subquests = subquests;
   }

   try
   {
      if (!questTypes[content.status]) { content.status = 'inactive'; }
   }
   catch (err) { content.status = 'inactive'; }

   return content;
}
