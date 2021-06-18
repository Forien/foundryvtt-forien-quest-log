import Socket        from './Socket.js';
import Fetch         from '../control/Fetch.js';
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
      return Fetch.quest(questId);
   }

   static getQuests()
   {
      return Fetch.sorted();
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
         const quest = Fetch.quest(questId);

console.log(`!!!!! QuestAPI - questId: ${questId} - quest: ${quest}`);
         if (quest === null)
         {
            if (notify)
            {
               ui.notifications.error(game.i18n.localize('ForienQuestLog.Notifications.CannotOpen'));
            }
            else
            {
               Socket.userCantOpenQuest();
            }
            return;
         }

         const questPreview = new QuestPreview(quest);
         questPreview.render(true, { focus: true });
      }
      catch (error)
      {
         if (notify)
         {
            ui.notifications.error(game.i18n.localize('ForienQuestLog.Notifications.CannotOpen'));
         }
         else
         {
            Socket.userCantOpenQuest();
         }
      }
   }
}
