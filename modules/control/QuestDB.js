import Enrich        from './Enrich.js';
import Socket        from './Socket.js';
import Utils         from './Utils.js';
import QuestFolder   from '../model/QuestFolder.js';
import Quest         from '../model/Quest.js';
import collect       from '../../external/collect.js';

import { constants, questTypes, settings } from '../model/constants.js';

const s_QUESTS = {
   active: new Map(),
   available: new Map(),
   completed: new Map(),
   failed: new Map(),
   inactive: new Map()
};

const s_QUESTS_COLLECT = {
   active: [],
   available: [],
   completed: [],
   failed: [],
   inactive: []
};

const s_QUEST_INDEX = new Map();

const Filter = {
   IS_VISIBLE: (entry) => !entry.isHidden && !entry.isInactive,
   IS_VISIBLE_INACTIVE: (entry) => entry.isTrustedPlayerEdit ? entry.isOwner : !entry.isHidden && !entry.isInactive
};

const Sort = {
   ALPHA: (a, b) => a.enrich.name.localeCompare(b.enrich.name),
   DATE_CREATE: (a, b) => a.quest.date.create - b.quest.date.create,
   DATE_START: (a, b) => a.quest.date.start - b.quest.date.start,
   DATE_END: (a, b) => b.quest.date.end - a.quest.date.end
};

Object.freeze(Filter);
Object.freeze(Sort);

const s_DELETE_QUEST = (questId, generate = true) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);

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
 * @param {string}   questId - The Quest / JournalEntry ID.
 *
 * @returns {QuestEntry} The stored QuestEntry.
 */
const s_GET_QUEST = (questId) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   return currentStatus && s_QUESTS[currentStatus] ? s_QUESTS[currentStatus].get(questId) : null;
};

/**
 * @param {QuestEntry}  entry - QuestEntry to set.
 *
 * @param {boolean}     [generate=true] - Regenerate s_QUEST_COLLECT
 */
const s_SET_QUEST = (entry, generate = true) =>
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

function *s_MAP_ITER()
{
   for (const map of Object.values(s_QUESTS))
   {
      for (const value of map.values())
      {
         yield value;
      }
   }
}

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

export default class QuestDB
{
   static async init()
   {
      const folder = await QuestFolder.initializeJournals();

      for (const entry of folder.content)
      {
         const content = entry.getFlag(constants.moduleName, constants.flagDB);

         if (content)
         {
            content.id = entry.id;
            const quest = new Quest(content, entry);

            // Must set a QuestEntry w/ an undefined enrich as all quest data must be loaded before enrichment.
            s_SET_QUEST(new QuestEntry(quest, void 0), false);
         }
      }

      for (const questEntry of s_MAP_ITER()) { questEntry.hydrate(); }

      for (const key of Object.keys(s_QUESTS))
      {
         s_QUESTS_COLLECT[key] = collect(Array.from(s_QUESTS[key].values()));
      }

      Hooks.on('createJournalEntry', this.createJournalEntry);
      Hooks.on('deleteJournalEntry', this.deleteJournalEntry);
      Hooks.on('updateJournalEntry', this.updateJournalEntry);
   }

   static get Filter() { return Filter; }

   static get Sort() { return Sort; }

   static createJournalEntry(entry, options, id)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content)
      {
         content.id = entry.id;
         const questEntry = new QuestEntry(new Quest(content, entry));
         s_SET_QUEST(questEntry.hydrate());

         Hooks.callAll('createQuestEntry', questEntry, options, id);
      }
   }

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

   static deleteJournalEntry(entry, options, id)
   {
      const questEntry = s_GET_QUEST(entry.id);
      if (questEntry && s_DELETE_QUEST(entry.id))
      {
         Hooks.callAll('deleteQuestEntry', questEntry, options, id);
      }
   }

   static enrichAll()
   {
      for (const questEntry of s_MAP_ITER())
      {
         questEntry.enrich = Enrich.quest(questEntry.quest);
      }
   }

   /**
    * Provides a quicker method to get the count of active quests.
    *
    * @returns {number} Quest count for active quests.
    */
   static getActiveCount()
   {
      return s_QUESTS[questTypes.active].size;
   }

   static getAllEnrich()
   {
      return s_MAP_FLATTEN().map((entry) => entry.enrich);
   }

   static getAllEntries()
   {
      return s_MAP_FLATTEN();
   }

   static getAllQuests()
   {
      return s_MAP_FLATTEN().map((entry) => entry.quest);
   }

   static getEnrich(questId)
   {
      const entry = s_GET_QUEST(questId);
      return entry ? entry.enrich : null;
   }

   static getName(name)
   {
      for (const entry of s_MAP_ITER())
      {
         if (entry.quest.name === name) { return entry.quest; }
      }

      return void 0;
   }

   static getQuest(questId)
   {
      const entry = s_GET_QUEST(questId);
      return entry ? entry.quest : null;
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
    * @returns {null|SortedQuests|QuestEntry[]} The complete sorted quests or just a particular quest status.
    */
   static sorted({ status = void 0, sortActive = Sort.ALPHA, sortAvailable = Sort.ALPHA,
    sortCompleted = Sort.DATE_END, sortFailed = Sort.DATE_END, sortInactive = Sort.ALPHA } = {})
   {
      if (typeof status === 'string')
      {
         switch (status)
         {
            case questTypes.active:
               return s_QUESTS_COLLECT[questTypes.active].filter(Filter.IS_VISIBLE).sort(sortActive);
            case questTypes.available:
               return s_QUESTS_COLLECT[questTypes.available].filter(Filter.IS_VISIBLE).sort(sortAvailable);
            case questTypes.completed:
               return s_QUESTS_COLLECT[questTypes.completed].filter(Filter.IS_VISIBLE).sort(sortCompleted);
            case questTypes.failed:
               return s_QUESTS_COLLECT[questTypes.failed].filter(Filter.IS_VISIBLE).sort(sortFailed);
            case questTypes.inactive:
               return s_QUESTS_COLLECT[questTypes.inactive].filter(Filter.IS_VISIBLE_INACTIVE).sort(sortInactive);
            default:
               console.error(`Forien Quest Log - QuestDB - sorted - unknown status: ${status}`);
               return null;
         }
      }

      return {
         active: s_QUESTS_COLLECT[questTypes.active].filter(Filter.IS_VISIBLE).sort(sortActive),
         available: s_QUESTS_COLLECT[questTypes.available].filter(Filter.IS_VISIBLE).sort(sortAvailable),
         completed: s_QUESTS_COLLECT[questTypes.completed].filter(Filter.IS_VISIBLE).sort(sortCompleted),
         failed: s_QUESTS_COLLECT[questTypes.failed].filter(Filter.IS_VISIBLE).sort(sortFailed),
         inactive: s_QUESTS_COLLECT[questTypes.inactive].filter(Filter.IS_VISIBLE_INACTIVE).sort(sortInactive)
      };
   }

   static updateJournalEntry(entry, flags, options, id)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content)
      {
         let questEntry = s_GET_QUEST(entry.id);

         if (questEntry)
         {
            questEntry.update(entry, content);
         }
         else
         {
            content.id = entry.id;
            questEntry = new QuestEntry(new Quest(content, entry));
            s_SET_QUEST(questEntry.hydrate());
         }

         Hooks.callAll('updateQuestEntry', questEntry, flags, options, id);
      }
   }
}

class QuestEntry
{
   /**
    * @param {Quest}    quest - The Quest object
    *
    * @param {object}   [enrich] - The enriched Quest data. If not set be sure to hydrate.
    */
   constructor(quest, enrich = void 0)
   {
      this.id = quest.id;
      this.status = quest.status;
      this.quest = quest;
      this.enrich = enrich;
   }

   hydrate()
   {
      this.id = this.quest.id;
      this.status = this.quest.status;

      this.isHidden = this.quest.isHidden;
      this.isInactive = this.quest.isInactive;
      this.isObservable = this.quest.isObservable;
      this.isOwner = this.quest.isOwner;
      this.isPersonal = this.quest.isPersonal;

      this.isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();

      this.enrich = Enrich.quest(this.quest);

      return this;
   }

   /**
    * @param {object}   entry - The backing journal entry.
    *
    * @param {object}   content - The FQL quest data from journal entry.
    */
   update(entry, content) // eslint-disable-line no-unused-vars
   {
      this.quest.entry = entry;
      content.id = entry.id;
      this.quest.initData(content);
      const status = this.status;
      this.hydrate();

      // Must hydrate any parent on a change.
      if (typeof this.quest.parent === 'string')
      {
         const parentEntry = s_GET_QUEST(this.quest.parent);
         if (parentEntry) { parentEntry.hydrate(); }
      }

      // Must hydrate any subquests on a change.
      for (const subquest of this.quest.subquests)
      {
         const subquestEntry = s_GET_QUEST(subquest);
         if (subquestEntry) { subquestEntry.hydrate(); }
      }

      if (status !== this.quest.status)
      {
         s_SET_QUEST(this);
      }
   }
}