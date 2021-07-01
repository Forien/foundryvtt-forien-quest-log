import Socket                    from './Socket.js';
import QuestDB                   from './QuestDB.js';
import Utils                     from './Utils.js';

import { constants, settings }   from '../model/constants.js';

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
    * @returns {QuestEntry} The QuestEntry
    */
   static get(questId)
   {
      return QuestDB.getQuest(questId);
   }

   static getAllEntries()
   {
      return QuestDB.getAllEntries();
   }

   /**
    * @param {object}   options - Optional parameters.
    *
    * @param {string}   [options.status] - Quest status to return sorted.
    *
    * @returns {null|SortedQuests|QuestEntry[]} The complete sorted quests or just a particular quest status.
    */
   static sorted(options)
   {
      return QuestDB.sorted(options);
   }

   /**
    * Opens Quest Details for given quest ID
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {string}   options.questId - Quest ID string to open.
    *
    * @param {boolean}  [options.notify=true] - Post UI notification on any error.
    */
   static open({ questId, notify = true })
   {
      if (!game.user.isGM && game.settings.get(constants.moduleName, settings.hideFQLFromPlayers)) { return; }

      try
      {
         const questPreview = Utils.getFQLPublicAPI().questPreview[questId];

         // Optimization to render an existing open QuestPreview with the given quest ID instead of opening a new
         // app / view.
         if (questPreview !== void 0)
         {
            questPreview.render(true, { focus: true });
            return;
         }

         const quest = QuestDB.getQuest(questId);

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

         if (quest.isObservable)
         {
            quest.sheet.render(true, { focus: true });
         }
         else
         {
console.log(`!!!!!! QuestAPI - open - Quest is not observable - quest.name: ${quest.name}`);
         }
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
