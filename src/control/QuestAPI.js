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
    * @param {object}   [options.data] - Quest data to assign to new quest.
    *
    * @param {string}   [options.parentId] - Any associated parent ID; if set then this is a subquest.
    *
    * @returns {Promise<Quest>} The newly created quest.
    */
   static async createQuest(options)
   {
      if (game.user.isGM) { return QuestDB.createQuest(options); }

      return game.settings.get(constants.moduleName, settings.allowPlayersCreate) &&
       !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers) ? QuestDB.createQuest(options) : null;
   }

   static getAllQuestEntries()
   {
      return QuestDB.getAllQuestEntries();
   }

   static getAllQuests()
   {
      return QuestDB.getAllQuests();
   }

   /**
    * Provides a quicker method to get the count of quests by quest type / status or all quests.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the count of all quests is returned.
    *
    * @param {string}   [options.type] - The quest type / status to count.
    *
    * @returns {number} Quest count for the specified type or the count for all quests.
    */
   static getCount(options)
   {
      return QuestDB.getCount(options);
   }

   /**
    * Retrieves Quest instance for given quest ID
    *
    * @param {string}   questId - Foundry quest ID
    *
    * @returns {Quest|null} The Quest or null if not found.
    */
   static getQuest(questId)
   {
      return QuestDB.getQuest(questId);
   }

   /**
    * Retrieves QuestEntry instance for given quest ID
    *
    * @param questId
    *
    * @returns {QuestEntry|null} The QuestEntry or null if not found.
    */
   static getQuestEntry(questId)
   {
      return QuestDB.getQuestEntry(questId);
   }

   static *iteratorEntries({ type = void 0 } = {})
   {
      for (const entry of QuestDB.iteratorEntries(type)) { yield entry; }
   }

   static *iteratorQuests({ type = void 0 } = {})
   {
      for (const quest of QuestDB.iteratorQuests(type)) { yield quest; }
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