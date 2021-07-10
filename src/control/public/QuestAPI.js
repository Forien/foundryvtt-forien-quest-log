import QuestDBShim   from './QuestDBShim.js';
import Socket        from '../Socket.js';

import ViewManager   from '../ViewManager.js';

import { constants, settings } from '../../model/constants.js';

/**
 * Quest public API. QuestAPI exposes certain QuestDB methods that are available for any player as only currently
 * observable quests are loaded. Other methods include opening a quest if it is observable.
 */
class QuestAPI
{
   /**
    * @returns {QuestDBShim} The public QuestDB.
    */
   static get DB() { return QuestDBShim; }

   /**
    * Opens the Quest sheet / QuestPreview for the given questID. A check for the module setting
    * {@link settings.hideFQLFromPlayers} provides an early out if FQL is hidden from players causing the sheet to
    * not render. {@link ViewManager.questPreview} provides an object.
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
         const questPreview = ViewManager.questPreview.get(questId);

         // Optimization to render an existing open QuestPreview with the given quest ID instead of opening a new
         // app / view.
         if (questPreview !== void 0)
         {
            questPreview.render(true, { focus: true });
            return;
         }

         const quest = QuestDBShim.getQuest(questId);

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

Object.freeze(QuestAPI);

export default QuestAPI;