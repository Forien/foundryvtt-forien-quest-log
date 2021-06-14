import QuestPreview  from '../apps/quest-preview.js';
import Quest         from '../entities/quest.js';
import Reward        from '../entities/reward.js';
import Task          from '../entities/task.js';
import Socket        from '../utility/socket.js';

/**
 * Quest public Api available under `Quests.`
 */
export default class QuestAPI
{
   /**
    * Tunnel to `game.quests.reward.create()`. Creates new Reward programmatically through API.
    *
    * @returns {Reward}
    */
   static get reward()
   {
      return Reward;
   }

   /**
    * Tunnel to `game.quests.task.create()`. Creates new Task programmatically through API.
    *
    * @returns {Task}
    */
   static get task()
   {
      return Task;
   }

   /**
    * Creates new Quest programmatically through API
    *
    * @param data
    *
    * @returns {Quest}
    */
   static create(data = {})
   {
      if (data.title === undefined)
      {
         throw new Error(game.i18n.localize('ForienQuestLog.Api.create.title'));
      }

      return new Quest({});
   }

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

   /**
    * Opens Quest Details for given quest ID
    *
    * @param questId
    *
    * @param notif
    */
   static open(questId, notif = true)
   {
      try
      {
         const questPreview = new QuestPreview(questId);
         questPreview.render(true);
      }
      catch (error)
      {
         if (notif)
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
