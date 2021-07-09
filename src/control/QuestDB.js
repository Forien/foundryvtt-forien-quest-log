import Enrich        from './Enrich.js';
import Socket        from './Socket.js';
import Utils         from './Utils.js';
import QuestFolder   from '../model/QuestFolder.js';
import Quest         from '../model/Quest.js';
import collect       from '../../external/collect.js';

import { constants, questTypes, settings } from '../model/constants.js';

/**
 * @type {Object.<string, Map<string, QuestEntry>>}
 */
const s_QUESTS = {
   active: new Map(),
   available: new Map(),
   completed: new Map(),
   failed: new Map(),
   inactive: new Map()
};

/**
 * @type {Object.<string, Collection<QuestEntry>>}
 */
const s_QUESTS_COLLECT = {
   active: collect(),
   available: collect(),
   completed: collect(),
   failed: collect(),
   inactive: collect()
};

// Set to true after the first call to `QuestDB.init`. Protects against adding hooks multiple times.
let s_QUEST_DB_INITIALIZED = false;

/**
 * @type {Map<string, string>}
 */
const s_QUEST_INDEX = new Map();

export default class QuestDB
{
   static async init()
   {
      const folder = await QuestFolder.initializeJournals();

      if (!Utils.isFQLHiddenFromPlayers())
      {
         const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();

         for (const entry of folder.content)
         {
            const content = entry.getFlag(constants.moduleName, constants.flagDB);

            if (content && s_IS_OBSERVABLE(content, entry, isTrustedPlayerEdit))
            {
               const quest = new Quest(content, entry);

               // Must set a QuestEntry w/ an undefined enrich as all quest data must be loaded before enrichment.
               s_SET_QUEST_ENTRY(new QuestEntry(quest, void 0), false);
            }
         }

         for (const questEntry of QuestDB.iteratorEntries()) { questEntry.hydrate(); }

         for (const key of Object.keys(s_QUESTS))
         {
            s_QUESTS_COLLECT[key] = collect(Array.from(s_QUESTS[key].values()));
         }
      }

      if (!s_QUEST_DB_INITIALIZED)
      {
         Hooks.on('createJournalEntry', s_JOURNAL_ENTRY_CREATE);
         Hooks.on('deleteJournalEntry', s_JOURNAL_ENTRY_DELETE);
         Hooks.on('updateJournalEntry', s_JOURNAL_ENTRY_UPDATE);
      }

      s_QUEST_DB_INITIALIZED = true;
   }

   /**
    * @returns {FilterFunctions}
    */
   static get Filter() { return Filter; }

   static get Sort() { return Sort; }

   /**
    * Loads all quests again removing any quests from the in-memory DB that are no longer observable by the current
    * user or adding quests that are now observable. This only really needs to occur after particular module setting
    * changes Which right now is trusted player edit.
    *
    * @see ModuleSettings.
    */
   static consistencyCheck()
   {
      const folder = QuestFolder.get();

      if (!folder || Utils.isFQLHiddenFromPlayers()) { return; }

      const questEntryMap = new Map(QuestDB.getAllQuestEntries().map((e) => [e.id, e]));

      const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();

      for (const entry of folder.content)
      {
         const content = entry.getFlag(constants.moduleName, constants.flagDB);

         if (content)
         {
            if (s_IS_OBSERVABLE(content, entry, isTrustedPlayerEdit))
            {
               let questEntry = questEntryMap.get(entry.id);

               if (!questEntry)
               {
                  questEntry = new QuestEntry(new Quest(content, entry));
                  s_SET_QUEST_ENTRY(questEntry.hydrate());

                  Hooks.callAll('addQuestEntry', questEntry, entry.flags, { diff: false, render: true }, entry.id);
               }
               else
               {
                  questEntry.update(content, entry);
               }
            }
            else
            {
               const questEntry = questEntryMap.get(entry.id);
               if (questEntry)
               {
                  questEntryMap.delete(entry.id);
                  s_REMOVE_QUEST_ENTRY(entry.id);

                  // This quest is not deleted; it has been removed from the in-memory DB.
                  Hooks.callAll('removeQuestEntry', questEntry, entry.flags, { diff: false, render: true }, entry.id);
               }
            }
         }
      }

      this.enrichAll();
   }

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
   static async createQuest({ data = {}, parentId = void 0 } = {})
   {
      // Get the default permission setting and attempt to set it if found in ENTITY_PERMISSIONS.
      const defaultPerm = game.settings.get(constants.moduleName, settings.defaultPermission);

      const permission = {
         default: typeof CONST.ENTITY_PERMISSIONS[defaultPerm] === 'number' ? CONST.ENTITY_PERMISSIONS[defaultPerm] :
          CONST.ENTITY_PERMISSIONS.OBSERVER
      };

      // Used for a player created quest setting and the quest as 'available' for normal players or 'hidden' for
      // trusted players.
      if (!game.user.isGM)
      {
         data.status = Utils.isTrustedPlayerEdit() ? questTypes.inactive : questTypes.available;
         permission[game.user.id] = CONST.ENTITY_PERMISSIONS.OWNER;
      }

      const parentQuest = QuestDB.getQuest(parentId);
      if (parentQuest)
      {
         data.parent = parentId;
      }

      // Creating a new quest will add any missing data / schema.
      const tempQuest = new Quest(data);

      const entry = await JournalEntry.create({
         name: tempQuest.name,
         folder: QuestFolder.get().id,
         permission,
         flags: {
            [constants.moduleName]: {
               json: tempQuest.toJSON()
            }
         }
      });

      if (parentQuest)
      {
         parentQuest.addSubquest(entry.id);
         await parentQuest.save();
         Socket.refreshQuestPreview({ questId: parentQuest.id });
      }

      const quest = QuestDB.getQuest(entry.id);

      // Players don't see Hidden tab, but assistant GM can, so emit anyway
      Socket.refreshAll();

      return quest;
   }

   /**
    * Invoke with either a Quest instance or quest ID to delete the quest and update the QuestDB and parent / child
    * relationships. This is an atomic sequence such that the quest is deleted via deleting the backing journal entry
    * and before control resumes to the invoke point the in-memory DB also has the associated QuestEntry deleted.
    *
    * Please use await when deleting a quest!
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {Quest}    [options.quest] - The Quest instance to delete.
    *
    * @param {string}   [options.questId] - The ID of the quest instance to delete.
    *
    * @returns {Promise<DeleteData|void>} The IDs for quests that were updated.
    */
   static async deleteQuest({ quest, questId })
   {
      const deleteId = quest ? quest.id : questId;

      const deleteQuest = QuestDB.getQuest(deleteId);

      if (!deleteQuest) { return; }

      const parentQuest = QuestDB.getQuest(deleteQuest.parent);
      let parentId = null;

      // Stores the quest IDs which have been saved and need GUI / display aspects updated.
      const savedIds = [];

      // Remove this quest from any parent
      if (parentQuest)
      {
         parentId = parentQuest.id;
         parentQuest.removeSubquest(deleteId);
      }

      // Update children to point to any new parent.
      for (const childId of deleteQuest.subquests)
      {
         const childQuest = QuestDB.getQuest(childId);
         if (childQuest)
         {
            childQuest.parent = parentId;

            await childQuest.save();
            savedIds.push(childId);

            // Update parent with new subquests.
            if (parentQuest)
            {
               parentQuest.addSubquest(childId);
            }
         }
      }

      // Save the parent.
      if (parentQuest)
      {
         await parentQuest.save();
         savedIds.push(parentId);
      }

      // Delete the backing quest journal entry. This will cause the `deleteJournalEntry` hook to fire and QuestDB to
      // delete the QuestEntry from the QuestDB.
      if (deleteQuest.entry)
      {
         await deleteQuest.entry.delete();
      }

      const deleteData = {
         deleteId,
         savedIds
      };

      // Return the delete and saved IDs.
      return deleteData;
   }

   /**
    * Enriches all stored {@link QuestEntry} instances. This is particularly useful in various callbacks when settings
    * change in {@link ModuleSettings}.
    */
   static enrichAll()
   {
      for (const questEntry of QuestDB.iteratorEntries())
      {
         questEntry.enrich = Enrich.quest(questEntry.quest);
      }
   }

   static getAllEnrich()
   {
      return s_MAP_FLATTEN().map((entry) => entry.enrich);
   }

   static getAllQuestEntries()
   {
      return s_MAP_FLATTEN();
   }

   static getAllQuests()
   {
      return s_MAP_FLATTEN().map((entry) => entry.quest);
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
   static getCount({ type = void 0 } = {})
   {
      if (type === void 0)
      {
         return s_QUESTS[questTypes.active].size + s_QUESTS[questTypes.available].size +
          s_QUESTS[questTypes.completed].size + s_QUESTS[questTypes.failed].size + s_QUESTS[questTypes.inactive].size;
      }

      return s_QUESTS[type] ? s_QUESTS[type].size : 0;
   }

   static getEnrich(questId)
   {
      const entry = s_GET_QUEST_ENTRY(questId);
      return entry ? entry.enrich : null;
   }

   static getQuestEntry(questId)
   {
      return s_GET_QUEST_ENTRY(questId);
   }

   static getName(name)
   {
      for (const entry of QuestDB.iteratorEntries())
      {
         if (entry.quest.name === name) { return entry.quest; }
      }

      return void 0;
   }

   static getQuest(questId)
   {
      const entry = s_GET_QUEST_ENTRY(questId);
      return entry ? entry.quest : null;
   }

   /**
    * Provides an iterator across the QuestEntry map of maps.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to count.
    *
    * @yields {QuestEntry} The QuestEntry iterator.
    */
   static *iteratorEntries({ type = void 0 } = {})
   {
      if (type === void 0)
      {
         for (const value of s_QUESTS[questTypes.active].values()) { yield value; }
         for (const value of s_QUESTS[questTypes.available].values()) { yield value; }
         for (const value of s_QUESTS[questTypes.completed].values()) { yield value; }
         for (const value of s_QUESTS[questTypes.failed].values()) { yield value; }
         for (const value of s_QUESTS[questTypes.inactive].values()) { yield value; }
      }
      else if (s_QUESTS[type])
      {
         for (const value of s_QUESTS[type].values()) { yield value; }
      }
   }

   /**
    * Provides an iterator across the QuestEntry map of maps.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to count.
    *
    * @yields {Quest} The Quest iterator.
    */
   static *iteratorQuests({ type = void 0 } = {})
   {
      if (type === void 0)
      {
         for (const value of s_QUESTS[questTypes.active].values()) { yield value.quest; }
         for (const value of s_QUESTS[questTypes.available].values()) { yield value.quest; }
         for (const value of s_QUESTS[questTypes.completed].values()) { yield value.quest; }
         for (const value of s_QUESTS[questTypes.failed].values()) { yield value.quest; }
         for (const value of s_QUESTS[questTypes.inactive].values()) { yield value.quest; }
      }
      else if (s_QUESTS[type])
      {
         for (const value of s_QUESTS[type].values()) { yield value; }
      }
   }

   /**
    * Removes all quests from the in-memory DB.
    */
   static removeAll()
   {
      s_QUESTS[questTypes.active].clear();
      s_QUESTS[questTypes.available].clear();
      s_QUESTS[questTypes.completed].clear();
      s_QUESTS[questTypes.failed].clear();
      s_QUESTS[questTypes.inactive].clear();

      s_QUEST_INDEX.clear();

      s_QUESTS_COLLECT[questTypes.active] = collect();
      s_QUESTS_COLLECT[questTypes.available] = collect();
      s_QUESTS_COLLECT[questTypes.completed] = collect();
      s_QUESTS_COLLECT[questTypes.failed] = collect();
      s_QUESTS_COLLECT[questTypes.inactive] = collect();

      Hooks.callAll('removeAllQuestEntries');
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
    * @returns {SortedQuests|collect<QuestEntry>|null} An object of all QuestEntries sorted by status or individual
    *                                                  status or null.
    */
   static sorted({ status = void 0, sortActive = Sort.ALPHA, sortAvailable = Sort.ALPHA,
    sortCompleted = Sort.DATE_END, sortFailed = Sort.DATE_END, sortInactive = Sort.ALPHA } = {})
   {
      if (typeof status === 'string')
      {
         switch (status)
         {
            case questTypes.active:
               return s_QUESTS_COLLECT[questTypes.active].sort(sortActive);
            case questTypes.available:
               return s_QUESTS_COLLECT[questTypes.available].sort(sortAvailable);
            case questTypes.completed:
               return s_QUESTS_COLLECT[questTypes.completed].sort(sortCompleted);
            case questTypes.failed:
               return s_QUESTS_COLLECT[questTypes.failed].sort(sortFailed);
            case questTypes.inactive:
               return s_QUESTS_COLLECT[questTypes.inactive].sort(sortInactive);
            default:
               console.error(`Forien Quest Log - QuestDB - sorted - unknown status: ${status}`);
               return null;
         }
      }

      return {
         active: s_QUESTS_COLLECT[questTypes.active].sort(sortActive),
         available: s_QUESTS_COLLECT[questTypes.available].sort(sortAvailable),
         completed: s_QUESTS_COLLECT[questTypes.completed].sort(sortCompleted),
         failed: s_QUESTS_COLLECT[questTypes.failed].sort(sortFailed),
         inactive: s_QUESTS_COLLECT[questTypes.inactive].sort(sortInactive)
      };
   }
}

/**
 * Provides the internal object stored in the QuestDB that contains the Quest and enriched data along with
 * several public member variables that are cached from the Quest on any update allowing quick sorting.
 */
export class QuestEntry
{
   /**
    * @param {Quest}    quest - The Quest object
    *
    * @param {object}   [enrich] - The enriched Quest data. If not set be sure to hydrate.
    */
   constructor(quest, enrich = void 0)
   {
      /**
       * @type {string}
       */
      this.id = quest.id;

      /**
       * @type {string}
       */
      this.status = quest.status;

      /**
       * @type {Quest}
       */
      this.quest = quest;

      /**
       * @type {Object}
       */
      this.enrich = enrich;
   }

   /**
    * Hydrates this QuestEntry caching the enriched data and several getter values from Quest.
    *
    * @returns {QuestEntry} This QuestEntry.
    */
   hydrate()
   {
      this.id = this.quest.id;
      this.status = this.quest.status;

      /**
       * @type {boolean}
       */
      this.isHidden = this.quest.isHidden;

      /**
       * @type {boolean}
       */
      this.isInactive = this.quest.isInactive;

      /**
       * @type {boolean}
       */
      this.isObservable = this.quest.isObservable;

      /**
       * @type {boolean}
       */
      this.isOwner = this.quest.isOwner;

      /**
       * @type {boolean}
       */
      this.isPersonal = this.quest.isPersonal;

      /**
       * @type {any}
       */
      this.enrich = Enrich.quest(this.quest);

      return this;
   }

   /**
    * @param {object}   content - The FQL quest data from journal entry.
    *
    * @param {object}   entry - The backing journal entry.
    *
    * @returns {boolean} Was s_SET_QUEST_ENTRY invoked.
    */
   update(content, entry)
   {
      this.quest.entry = entry;
      this.quest.initData(content);
      const status = this.status;
      this.hydrate();

      // Must hydrate any parent on a change.
      if (typeof this.quest.parent === 'string')
      {
         const parentEntry = s_GET_QUEST_ENTRY(this.quest.parent);
         if (parentEntry) { parentEntry.hydrate(); }
      }

      // Must hydrate any subquests on a change.
      for (const subquest of this.quest.subquests)
      {
         const subquestEntry = s_GET_QUEST_ENTRY(subquest);
         if (subquestEntry) { subquestEntry.hydrate(); }
      }

      if (status !== this.quest.status)
      {
         s_SET_QUEST_ENTRY(this);
         return true;
      }

      return false;
   }
}

/**
 * @type {FilterFunctions}
 */
const Filter = {
   IS_OBSERVABLE: (entry) => entry.isObservable,
};

/**
 * @type {{ALPHA: (function(*, *): number), DATE_START: (function(*, *)), DATE_CREATE: (function(*, *)), DATE_END: (function(*, *))}}
 */
const Sort = {
   ALPHA: (a, b) => a.quest.name.localeCompare(b.quest.name),
   DATE_CREATE: (a, b) => a.quest.date.create - b.quest.date.create,
   DATE_START: (a, b) => a.quest.date.start - b.quest.date.start,
   DATE_END: (a, b) => b.quest.date.end - a.quest.date.end
};

Object.freeze(Filter);
Object.freeze(Sort);

/**
 * @param {string}   questId - The Quest / JournalEntry ID.
 *
 * @returns {QuestEntry} The stored QuestEntry.
 */
const s_GET_QUEST_ENTRY = (questId) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   return currentStatus && s_QUESTS[currentStatus] ? s_QUESTS[currentStatus].get(questId) : null;
};

/**
 *
 * @param {object}   content - The serialized Quest data stored in the journal entry.
 *
 * @param {object}   entry - The backing journal entry.
 *
 * @param {boolean}  isTrustedPlayerEdit - Is the user trusted and is the module setting to edit granted.
 *
 * @returns {boolean}   is quest observable.
 */
const s_IS_OBSERVABLE = (content, entry, isTrustedPlayerEdit = Utils.isTrustedPlayerEdit()) =>
{
   let isObservable;

   if (game.user.isGM)
   {
      isObservable = true;
   }
   else
   {
      const isInactive = questTypes.inactive === content.status;

      // Special handling for trusted player edit who can only see owned quests in the hidden / inactive category.
      if (isTrustedPlayerEdit && isInactive)
      {
         isObservable = entry.isOwner;
      }
      else
      {
         // Otherwise no one can see hidden / inactive quests; perform user permission check for observer.
         isObservable = !isInactive && entry.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER);
      }
   }

   return isObservable;
};

const s_JOURNAL_ENTRY_CREATE = (entry, options, id) =>
{
   const content = entry.getFlag(constants.moduleName, constants.flagDB);

   if (content)
   {
      if (s_IS_OBSERVABLE(content, entry) && !Utils.isFQLHiddenFromPlayers())
      {
         const questEntry = new QuestEntry(new Quest(content, entry));
         s_SET_QUEST_ENTRY(questEntry.hydrate());

         Hooks.callAll('createQuestEntry', questEntry, options, id);
      }
   }
};

const s_JOURNAL_ENTRY_DELETE = async (entry, options, id) =>
{
   const questEntry = s_GET_QUEST_ENTRY(entry.id);
   if (questEntry && s_REMOVE_QUEST_ENTRY(entry.id))
   {
      Hooks.callAll('deleteQuestEntry', questEntry, options, id);

      const quest = questEntry.quest;
      const savedIds = quest.parent ? [quest.parent, ...quest.subquests] : [...quest.subquests];

      // Send the delete quest socket message to all clients.
      await Socket.deletedQuest({
         deleteId: entry.id,
         savedIds
      });

      Socket.refreshAll();
   }
};

const s_JOURNAL_ENTRY_UPDATE = (entry, flags, options, id) =>
{
   const content = entry.getFlag(constants.moduleName, constants.flagDB);

   if (content)
   {
      let questEntry = s_GET_QUEST_ENTRY(entry.id);

      const isObservable = s_IS_OBSERVABLE(content, entry) && !Utils.isFQLHiddenFromPlayers();

      if (questEntry)
      {
         if (isObservable)
         {
            questEntry.update(content, entry);
            Hooks.callAll('updateQuestEntry', questEntry, flags, options, id);
         }
         else
         {
            s_REMOVE_QUEST_ENTRY(questEntry.id);

            // Must hydrate any parent on a change.
            if (typeof questEntry.quest.parent === 'string')
            {
               const parentEntry = s_GET_QUEST_ENTRY(questEntry.quest.parent);
               if (parentEntry) { parentEntry.hydrate(); }
            }

            // Must hydrate any subquests on a change.
            for (const subquest of questEntry.quest.subquests)
            {
               const subquestEntry = s_GET_QUEST_ENTRY(subquest);
               if (subquestEntry) { subquestEntry.hydrate(); }
            }

            // This quest is not deleted; it has been removed from the in-memory DB.
            Hooks.callAll('removeQuestEntry', questEntry, flags, options, id);
         }
      }
      else if (isObservable)
      {
         questEntry = new QuestEntry(new Quest(content, entry));
         s_SET_QUEST_ENTRY(questEntry.hydrate());

         // Must hydrate any parent on a change.
         if (typeof questEntry.quest.parent === 'string')
         {
            const parentEntry = s_GET_QUEST_ENTRY(questEntry.quest.parent);
            if (parentEntry) { parentEntry.hydrate(); }
         }

         // Must hydrate any subquests on a change.
         for (const subquest of questEntry.quest.subquests)
         {
            const subquestEntry = s_GET_QUEST_ENTRY(subquest);
            if (subquestEntry) { subquestEntry.hydrate(); }
         }

         Hooks.callAll('addQuestEntry', questEntry, flags, options, id);
      }
   }
};

/**
 * Removes a QuestEntry by quest ID. Removes the quest index and then removes the QuestEntry from the map of maps
 * If this results in a deletion and generate is true then rebuild the QuestEntry Collection.
 *
 * @param {string}   questId - The Quest ID to delete.
 *
 * @param {boolean}  [generate=true] - Generate the associated QuestEntry Collection.
 *
 * @returns {boolean} Whether a QuestEntry was deleted.
 */
const s_REMOVE_QUEST_ENTRY = (questId, generate = true) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   s_QUEST_INDEX.delete(questId);

   let result = false;

   if (s_QUESTS[currentStatus])
   {
      result = s_QUESTS[currentStatus].delete(questId);
   }

   if (result && generate)
   {
      s_QUESTS_COLLECT[currentStatus] = collect(Array.from(s_QUESTS[currentStatus].values()));
   }

   return result;
};

/**
 * @param {QuestEntry}  entry - QuestEntry to set.
 *
 * @param {boolean}     [generate=true] - Regenerate s_QUEST_COLLECT
 */
const s_SET_QUEST_ENTRY = (entry, generate = true) =>
{
   const currentStatus = s_QUEST_INDEX.get(entry.id);
   if (s_QUESTS[currentStatus] && currentStatus !== entry.status)
   {
      if (s_QUESTS[currentStatus].delete(entry.id) && generate)
      {
         s_QUESTS_COLLECT[currentStatus] = collect(Array.from(s_QUESTS[currentStatus].values()));
      }
   }

   if (!s_QUESTS[entry.status])
   {
      console.error(`ForienQuestLog - QuestDB - set quest error - unknown status: ${entry.status}`);
      return;
   }

   s_QUEST_INDEX.set(entry.id, entry.status);
   s_QUESTS[entry.status].set(entry.id, entry);

   if (generate)
   {
      s_QUESTS_COLLECT[entry.status] = collect(Array.from(s_QUESTS[entry.status].values()));
   }
};

/**
 * Flattens the QuestEntry map of maps into and array of all entries.
 *
 * @returns {QuestEntry[]} An array of all QuestEntry values stored.
 */
const s_MAP_FLATTEN = () =>
{
   return [
    ...s_QUESTS[questTypes.active].values(),
    ...s_QUESTS[questTypes.available].values(),
    ...s_QUESTS[questTypes.completed].values(),
    ...s_QUESTS[questTypes.failed].values(),
    ...s_QUESTS[questTypes.inactive].values()
   ];
};

/**
 * @typedef {object} DeleteData The data object returned from `delete` indicating which quests were updated.
 *
 * @property {string}   deleteId - This quest ID which was deleted.
 *
 * @property {string[]} savedIds - The quest IDs of any parent / subquests that were updated.
 */

/**
 * @typedef FilterFunctions
 *
 * @property {Function} IS_OBSERVABLE -
 */

/**
 * @typedef {Object.<string, collect<QuestEntry>>} SortedQuests Provides
 *
 * @property {collect<QuestEntry>} active - Active quest entries
 *
 * @property {collect<QuestEntry>} available - Available quests entries
 *
 * @property {collect<QuestEntry>} completed - Completed quests entries
 *
 * @property {collect<QuestEntry>} failed - Failed quests entries
 *
 * @property {collect<QuestEntry>} hidden - Hidden quests entries
 */