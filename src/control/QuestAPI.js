import Socket        from './Socket.js';
import QuestDB       from './QuestDB.js';
import ViewManager   from './ViewManager.js';

import { constants, settings } from '../model/constants.js';

/**
 * Quest public API. QuestAPI exposes certain QuestDB methods that are available for any player as only currently
 * observable quests are loaded. Other methods include opening a quest if it is observable.
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

   /**
    * Filter the entire QuestDB, returning an Array of entries which match a functional condition.
    *
    * @param {Function} condition  The functional condition to test
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to iterate.
    *
    * @returns {QuestEntry[]}  An Array of matched values
    * @see {Array#filter}
    */
   static filter(condition, options)
   {
      return QuestDB.filter(condition, options);
   }

   /**
    * Filters the CollectJS collections and returns a single collection if status is specified otherwise filters all
    * quest collections and returns a QuestCollect object with all status categories. At minimum you must provide a
    * filter function `options.filter` which will be applied across all collections otherwise you may also provide
    * separate filters for each status category.
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {string}   [options.status] - Specific quest status to return filtered.
    *
    * @param {Function} [options.filter] - The filter function for any quest status that doesn't have a filter
    *                                      defined.
    *
    * @param {Function} [options.filterActive] - The filter function for active quests.
    *
    * @param {Function} [options.filterAvailable] - The filter function for available quests.
    *
    * @param {Function} [options.filterCompleted] - The filter function for completed quests.
    *
    * @param {Function} [options.filterFailed] - The filter function for failed quests.
    *
    * @param {Function} [options.filterInactive] - The filter function for inactive quests.
    *
    * @returns {QuestsCollect|collect<QuestEntry>|void} An object of all QuestEntries filtered by status or individual
    *                                                   status or undefined.
    */
   static filterCollect(options)
   {
      return QuestDB.filterCollect(options);
   }

   /**
    * Find an entry in the QuestDB using a functional condition.
    *
    * @param {Function} condition - The functional condition to test.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to iterate.
    *
    * @returns {QuestEntry} The QuestEntry, if found, otherwise undefined.
    * @see {Array#find}
    */
   static find(condition, options)
   {
      return QuestDB.find(condition, options);
   }

   /**
    * Returns all QuestEntry instances.
    *
    * @returns {QuestEntry[]} All QuestEntry instances.
    */
   static getAllQuestEntries()
   {
      return QuestDB.getAllQuestEntries();
   }

   /**
    * Returns all Quest instances.
    *
    * @returns {Quest[]} All quest instances.
    */
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
    * Gets the Quest by quest ID.
    *
    * @param {string}   questId - A Foundry ID
    *
    * @returns {Quest|null} The Quest or null.
    */
   static getQuest(questId)
   {
      return QuestDB.getQuest(questId);
   }

   /**
    * Retrieves a QuestEntry by quest ID.
    *
    * @param {string}   questId - A Foundry ID
    *
    * @returns {QuestEntry|null} The QuestEntry or null.
    */
   static getQuestEntry(questId)
   {
      return QuestDB.getQuestEntry(questId);
   }

   /**
    * Provides an iterator across the QuestEntry map of maps.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to iterate.
    *
    * @yields {QuestEntry} The QuestEntry iterator.
    */
   static *iteratorEntries({ type = void 0 } = {})
   {
      // TODO CHECK IF WE CAN JUST RETURN THE ITERATOR
      for (const entry of QuestDB.iteratorEntries(type)) { yield entry; }
   }

   /**
    * Provides an iterator across the QuestEntry map of maps.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to iterate.
    *
    * @yields {Quest} The Quest iterator.
    */
   static *iteratorQuests({ type = void 0 } = {})
   {
      // TODO CHECK IF WE CAN JUST RETURN THE ITERATOR
      for (const quest of QuestDB.iteratorQuests(type)) { yield quest; }
   }

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

   /**
    * @param {object}   options - Optional parameters.
    *
    * @param {string}   [options.status] - Quest status to return sorted.
    *
    * @param {Function} [options.sortActive] - The sort function for active quests.
    *
    * @param {Function} [options.sortAvailable] - The sort function for available quests.
    *
    * @param {Function} [options.sortCompleted] - The sort function for completed quests.
    *
    * @param {Function} [options.sortFailed] - The sort function for failed quests.
    *
    * @param {Function} [options.sortInactive] - The sort function for inactive quests.
    *
    * @returns {QuestsCollect|collect<QuestEntry>|void} The complete sorted quests or just a particular quest status.
    */
   static sortCollect(options)
   {
      return QuestDB.sortCollect(options);
   }
}

Object.freeze(QuestAPI);

export default QuestAPI;