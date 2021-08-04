import QuestAPI from '../../control/public/QuestAPI.js';

/**
 * Provides a very lightweight shim for {@link JournalEntry} documents that are FQL quests. It defers to
 * opening the {@link Quest} to the {@link QuestAPI.open} method. Foundry will invoke this shim when a JournalEntry
 * is clicked in the {@link JournalDirectory} via {@link SidebarDirectory._onClickEntityName}. This shim
 * is set to {@link JournalEntry._sheet} in {@link QuestDB} when JE docs are created or loaded.
 */
export default class QuestPreviewShim
{
   /**
    * Stores the associated JournalEntry / quest ID
    *
    * @param {string}   questId - The quest ID to shim.
    */
   constructor(questId)
   {
      /**
       * @type {string}
       * @private
       */
      this._questId = questId;
   }

   /**
    * Always return false so `render` is invoked.
    *
    * @returns {boolean} False.
    */
   get rendered() { return false; }

   /**
    * Noop shim
    */
   bringToTop() {}

   /**
    * Noop shim
    */
   close() {}

   /**
    * Noop shim
    */
   maximize() {}

   /**
    * Defer to render as in some misuse cases by various modules _render can be invoked directly.
    *
    * @private
    */
   async _render()
   {
      this.render();
   }

   /**
    * Defers to the {@link QuestAPI.open} to potentially open a quest.
    */
   render()
   {
      QuestAPI.open({ questId: this._questId });
   }
}