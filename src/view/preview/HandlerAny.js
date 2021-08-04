import QuestAPI   from '../../control/public/QuestAPI.js';
import QuestDB    from '../../control/QuestDB.js';
import Socket     from '../../control/Socket.js';
import FQLDialog  from '../FQLDialog.js';

/**
 * These handler {@link JQuery} callbacks can be called on any tab.
 */
export default class HandlerAny
{
   /**
    * Confirms deleting a quest with {@link FQLDialog.confirmDeleteQuest} before invoking {@link QuestDB.deleteQuest}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    *
    * @param {Quest}             quest - The current quest being manipulated.
    *
    * @returns {Promise<void>}
    */
   static async questDelete(event, quest)
   {
      const questId = $(event.target).data('quest-id');
      const name = $(event.target).data('quest-name');

      const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId: quest.id });
      if (result)
      {
         await QuestDB.deleteQuest({ questId: result });
      }
   }

   /**
    * Opens a {@link QuestPreview} via {@link QuestAPI.open}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent.
    */
   static questOpen(event)
   {
      const questId = $(event.currentTarget).data('quest-id');
      QuestAPI.open({ questId });
   }

   /**
    * Potentially sets a new {@link Quest.status} via {@link Socket.setQuestStatus}. If the current user is not a GM
    * a GM level user must be logged in for a successful completion of the set status operation.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    *
    * @returns {Promise<void>}
    */
   static async questStatusSet(event)
   {
      const target = $(event.target).data('target');
      const questId = $(event.target).data('quest-id');

      const quest = QuestDB.getQuest(questId);
      if (quest) { await Socket.setQuestStatus({ quest, target }); }
   }
}