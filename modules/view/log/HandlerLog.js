import QuestAPI      from '../../control/QuestAPI.js';
import QuestDB       from '../../control/QuestDB.js';
import ViewManager   from '../../control/ViewManager.js';
import Socket        from '../../control/Socket.js';
import FQLDialog     from '../FQLDialog.js';

export default class HandlerLog
{
   static async questAdd()
   {
      if (ViewManager.verifyQuestCanAdd())
      {
         const quest = await QuestDB.createQuest();
         ViewManager.questAdded({ quest });
      }
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
    *
    * @returns {Promise<void>} A promise
    */
   static async questDelete(event)
   {
      const questId = $(event.target).data('quest-id');
      const name = $(event.target).data('quest-name');

      const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId, isQuestLog: true });
      if (result)
      {
         const deleteQuest = QuestDB.getQuest(result);
         if (deleteQuest) { await Socket.deletedQuest(await deleteQuest.delete()); }
      }
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
    */
   static questDragStart(event)
   {
      const dataTransfer = {
         type: 'Quest',
         id: $(event.target).data('quest-id')
      };

      event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
    */
   static questOpen(event)
   {
      const questId = $(event.target).closest('.title').data('quest-id');
      QuestAPI.open({ questId });
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
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
}