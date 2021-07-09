/**
 * The hidden FQL quests folder name.
 *
 * @type {string}
 */
const s_QUEST_DIR_NAME = '_fql_quests';

/**
 * Provides utility methods to create and retrieve the hidden FQL quests folder.
 */
export default class QuestFolder
{
   /**
    * Returns true if quest directory has been created.
    *
    * @returns {boolean} Whether the quest directory exists.
    */
   static folderExists()
   {
      const result = game.journal.directory.folders.find((f) => f.name === s_QUEST_DIR_NAME);

      return result !== void 0;
   }

   /**
    * Retrieves the Foundry quest folder.
    *
    * @returns {Folder} The quest folder.
    * @see https://foundryvtt.com/api/Folder.html
    */
   static get()
   {
      return game.journal.directory.folders.find((f) => f.name === s_QUEST_DIR_NAME);
   }

   /**
    * Initializes and returns the quest folder. If it doesn't exist it is created.
    *
    * @returns {Promise<Folder>} The quest folder.
    * @see https://foundryvtt.com/api/Folder.html
    */
   static async initializeJournals()
   {
      const dirExists = this.folderExists();

      if (!dirExists)
      {
         await Folder.create({ name: s_QUEST_DIR_NAME, type: 'JournalEntry', parent: null });
      }

      return game.journal.directory.folders.find((f) => f.name === s_QUEST_DIR_NAME);
   }
}
