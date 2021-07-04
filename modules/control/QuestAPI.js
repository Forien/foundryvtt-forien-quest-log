import Socket        from './Socket.js';
import QuestDB       from './QuestDB.js';
import ViewManager   from './ViewManager.js';

import { constants, settings }   from '../model/constants.js';

/**
 * Quest public API
 */
class QuestAPI
{
   /**
    * Creates a new quest and waits for the journal entry to update and QuestDB to pick up the new Quest which
    * is returned.
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {object}   data - Quest data to assign to new quest.
    *
    * @param {string}   parentId - Any associated parent ID; if set then this is a subquest.
    *
    * @param {boolean}  notify - Post a UI message.
    *
    * @returns {Promise<Quest>} The newly created quest.
    */
   static async createQuest(options)
   {
      if (game.user.isGM) { return QuestDB.createQuest(options); }

      return game.settings.get(constants.moduleName, settings.allowPlayersCreate) &&
       !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers) ? QuestDB.createQuest(options) : null;
   }

   /**
    * Retrieves Quest instance for given quest ID
    *
    * @param questId
    *
    * @returns {QuestEntry} The QuestEntry
    */
   static getQuest(questId)
   {
      if (game.user.isGM) { return QuestDB.getQuest(questId); }

      const quest = QuestDB.getQuest(questId);

      return quest.isObservable && !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers) ? quest : null;
   }

   static getAllEntries()
   {
      return game.user.isGM ? QuestDB.getAllEntries() : null;
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
      return game.user.isGM ? QuestDB.sorted(options) : null;
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
         const questPreview = ViewManager.questPreview[questId];

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