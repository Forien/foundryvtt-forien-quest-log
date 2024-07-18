import { DBMigration }  from '../DBMigration.js';

import {
   FVTTCompat,
   Utils }              from '../../src/control/index.js';

import { Quest }        from '../../src/model/index.js';

import {
   constants,
   questStatus }        from '../../src/model/constants.js';

/**
 * Performs DB migration from schema 0 to 1.
 *
 * Moves serialized quest data from journal entry content field to flags stored by the {@link constants.moduleName}
 * and {@link constants.flagDB}. In the process perform any reversal of potential corrupted data which can occur on
 * Foundry versions `0.7.10` and `0.8.6` which have improperly configured content sanitation filters that affect the
 * journal entry content field.
 *
 * New data fields:
 * - location -> {string}; default: null
 * - priority -> {number}; default: 0
 * - type -> {string}; default: null
 * - date -> {object}
 *    - {number} create - Date.now().
 *    - {number} active - set if quest is in progress to Date.now().
 *    - {number} end - set if quest is completed / failed to Date.now().
 *
 * @returns {Promise<void>}
 */
export async function dbSchema_1()
{
   const folder = await Utils.initializeQuestFolder();
   if (!folder) { return; }

   // Iterate through all journal entries from `_fql_quests`.
   for (const entry of FVTTCompat.folderContents(folder))
   {
      try
      {
         const flagContent = entry.getFlag(constants.moduleName, constants.flagDB);

         // If there is flag content don't migrate the data otherwise execute `migrateData`.
         const content = flagContent ? flagContent : await migrateData(entry);

         if (content !== null)
         {
            // The new DB schema gets picked up in Quest -> initData.
            const quest = new Quest(content, entry);

            // Accept the default permission if defined otherwise set to observer.
            const defaultPermission = FVTTCompat.ownership(entry)?.default ?? CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;

            const data = {
               name: quest.name,
               content: '',
               flags: {
                  [constants.moduleName]: { json: quest.toJSON() }
               }
            };

            data.ownership = { default: defaultPermission };

            await entry.update(data);
         }
         else
         {
            // Must delete any no conforming journal entries. This likely never occurs.
            console.log(game.i18n.format('ForienQuestLog.Migration.Notifications.CouldNotMigrate',
             { name: FVTTCompat.get(entry, 'name') }));
            await entry.delete();
         }
      }
      catch (err)
      {
         // Must delete any journal entries / quests that fail the migration process.
         console.log(game.i18n.format('ForienQuestLog.Migration.Notifications.CouldNotMigrate',
          { name: FVTTCompat.get(entry, 'name') }));
         await entry.delete();
      }
   }

   // Set the DBMigration.setting to `1` indicating that migration to schema version `1` is complete.
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
      let entryContent = FVTTCompat.get(entry, 'content');
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

   // Note: in DB schema v2 update status hidden is renamed to 'inactive'; use bare strings here instead of questStatus.
   try
   {
      if (!questStatus[content.status]) { content.status = 'hidden'; }
   }
   catch (err) { content.status = 'hidden'; }

   return content;
}
