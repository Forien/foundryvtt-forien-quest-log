import QuestAPI   from '../../control/QuestAPI.js';
import QuestDB    from '../../control/QuestDB.js';
import Socket     from '../../control/Socket.js';
import FQLDialog  from '../FQLDialog.js';

/**
 * These handler callbacks can be called on any subpage.
 */
export default class HandlerAny
{
   /**
    * @param {Event}          event - HTML5 / jQuery event.
    *
    * @returns {Promise<void>} A promise
    */
   static async questStatusSet(event)
   {
      const target = $(event.target).data('target');
      const questId = $(event.target).data('quest-id');

      const quest = QuestDB.getQuest(questId);
      if (quest) { await Socket.moveQuest({ quest, target }); }
   }

   /**
    * @param {Event}          event - HTML5 / jQuery event.
    *
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @returns {Promise<void>} A promise
    */
   static async questDelete(event, quest)
   {
      const questId = $(event.target).data('quest-id');
      const name = $(event.target).data('quest-name');

      const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId: quest.id });
      if (result)
      {
         const deleteQuest = QuestDB.getQuest(result);
         if (deleteQuest) { await Socket.deletedQuest(await deleteQuest.delete()); }
      }
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
    */
   static questOpen(event)
   {
      const questId = $(event.currentTarget).data('quest-id');
      QuestAPI.open({ questId });
   }
}