import { constants } from '../model/constants.js';

/**
 * Attempts to migrate data from FQL 0.6.0 or prior to new 0.7.0 data format. This function also attempts to reverse any
 * damage that the initial server side sanitation filters may have caused to the old data format.
 *
 * @param {JournalEntry}   entry - The source journal entry storing quest data.
 *
 * @returns {object|null} Loaded Quest data or null if loading fails.
 */
export function migrateData_070(entry)
{
   let content;

   try
   {
      console.log(`${constants.moduleLabel} | Quest Folder contains old data. Attempting to read old quest format for '${entry.data.name}'.`);

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
         console.log(`${constants.moduleLabel} | Quest Folder contains invalid data attempting to reverse damage for '${entry.data.name}'.`);

         try
         {
            // These regex substitutions will attempt to reverse damage to the stored JSON.
            entryContent = entryContent.replace(/("\\&quot;|\\&quot;")/gm, '\\"');
            entryContent = entryContent.replace(/:">/gm, '\\">');
            entryContent = entryContent.replace(/:" /gm, '\\" ');

            content = JSON.parse(entryContent);
         }
         catch (e2)
         {
            console.log(`${constants.moduleLabel} | Quest Folder contains invalid data that can not be migrated for '${entry.data.name}'.`);
            console.error(e2);
            return null;
         }
      }

      console.log(`${constants.moduleLabel} | Quest Folder contained old quest format in '${entry.data.name}'. Please save this quest again to convert.`);
   }
   catch (e)
   {
      console.log(`${constants.moduleLabel} | Quest Folder contains invalid entry. The '${entry.data.name}' is either corrupted Quest Entry, or non-Quest Journal Entry.`);
      console.error(e);
      return null;
   }

   // Convert title to name; all new Quest use `name` instead of `title` to match Foundry document model
   content.name = content.title;
   delete content.title;

   // Old FQL will often store the entire actor data as the giver, so if it is not a string then set to null.
   if (typeof content.giver !== 'string')
   {
      content.giver = null;
   }

   // As things go the rewards format for the new FQL is minimal / only stores UUID and basic info. Can't support old
   // rewards format.
   content.rewards = [];

   return content;
}