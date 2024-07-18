import { QuestDBShim }  from './QuestDBShim.js';

import {
   Socket,
   ViewManager }        from '../index.js';

import {
   constants,
   settings }           from '../../model/constants.js';

/**
 * Quest public API. QuestAPI exposes control capabilities publicly. This functionality is gated as necessary depending
 * on user level, quest observability and module settings.
 *
 * A shim to the {@link QuestDB} is available via {@link QuestAPI.DB} which exposes certain QuestDB methods that are
 * available for any player as only currently observable quests are loaded into QuestDB.
 */
class QuestAPI
{
   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

   /**
    * @returns {QuestDBShim} Public QuestDB access.
    */
   static get DB() { return QuestDBShim; }

   /**
    * Opens the Quest sheet / QuestPreview for the given questID. A check for the module setting
    * {@link FQLSettings.hideFQLFromPlayers} provides an early out if FQL is hidden from players causing the sheet to
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

         if (quest === void 0)
         {
            if (notify)
            {
               ViewManager.notifications.warn(game.i18n.localize('ForienQuestLog.Notifications.CannotOpen'));
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
            ViewManager.notifications.error(game.i18n.localize('ForienQuestLog.Notifications.CannotOpen'));
         }
         else
         {
            Socket.userCantOpenQuest();
         }
      }
   }
}

Object.freeze(QuestAPI);

export { QuestAPI };