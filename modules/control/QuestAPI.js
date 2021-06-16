import Socket        from './Socket.js';
import Quest         from '../model/Quest.js';
import QuestPreview  from '../view/QuestPreview.js';

/**
 * Quest public Api available under `Quests.`
 */
export default class QuestAPI
{
   /**
    * Retrieves Quest instance for given quest ID
    *
    * @param questId
    *
    * @returns {Quest}
    */
   static get(questId)
   {
      return Quest.get(questId);
   }

   static getQuests()
   {
      return Quest.getQuests()
   }

   /**
    * Opens Quest Details for given quest ID
    *
    * @param questId
    *
    * @param notify
    */
   static open(questId, notify = true)
   {
      try
      {
         const quest = Quest.get(questId);
         const questPreview = new QuestPreview(quest);
         questPreview.render(true);
      }
      catch (error)
      {
         if (notify)
         {
            ui.notifications.error(game.i18n.localize('ForienQuestLog.Notifications.CannotOpen'), {});
         }
         else
         {
            Socket.userCantOpenQuest();
         }
      }
   }
}
