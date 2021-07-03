import Enrich        from './Enrich.js';
import Utils         from './Utils.js';
import QuestFolder   from '../model/QuestFolder.js';
import Quest         from '../model/Quest.js';
import FastMap       from '../../external/FastMap.js';

import { constants, questTypes } from '../model/constants.js';

const s_QUESTS = new FastMap([
   [questTypes.active, new FastMap()],
   [questTypes.available, new FastMap()],
   [questTypes.completed, new FastMap()],
   [questTypes.failed, new FastMap()],
   [questTypes.hidden, new FastMap()]
]);

const s_QUEST_INDEX = new FastMap();

const s_SORT_ALPHA = (a, b) => a.enrich.name.localeCompare(b.enrich.name);
const s_SORT_DATE_CREATE = (a, b) => a.quest.date.create - b.quest.date.create;  // eslint-disable-line no-unused-vars
const s_SORT_DATE_START = (a, b) => a.quest.date.start - b.quest.date.start;     // eslint-disable-line no-unused-vars
const s_SORT_DATE_END = (a, b) => b.quest.date.end - a.quest.date.end;

const s_DELETE_QUEST = (questId) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   if (questTypes[currentStatus]) { return s_QUESTS.get(currentStatus).delete(questId); }
   return false;
};

/**
 * @param {string}   questId - The Quest / JournalEntry ID.
 *
 * @returns {QuestEntry} The stored QuestEntry.
 */
const s_GET_QUEST = (questId) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   return currentStatus && questTypes[currentStatus] ? s_QUESTS.get(currentStatus).get(questId) : null;
};

/**
 * @param {QuestEntry}  entry - QuestEntry to set.
 */
const s_SET_QUEST = (entry) =>
{
   const currentStatus = s_QUEST_INDEX.get(entry.id);
   if (questTypes[currentStatus] && currentStatus !== entry.status)
   {
      s_QUESTS.get(currentStatus).delete(entry.id);
   }

   if (!questTypes[entry.status])
   {
      console.error(`ForienQuestLog - QuestDB - set quest error - unknown status: ${entry.status}`);
   }

   s_QUEST_INDEX.set(entry.id, entry.status);
   s_QUESTS.get(entry.status).set(entry.id, entry);
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
            s_SET_QUEST(new QuestEntry(quest, void 0));
         }
      }

      for (const questEntry of s_QUESTS.flatten()) { questEntry.hydrate(); }

      Hooks.on('createJournalEntry', this.createJournalEntry);
      Hooks.on('deleteJournalEntry', this.deleteJournalEntry);
      Hooks.on('updateJournalEntry', this.updateJournalEntry);
   }

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

   static deleteJournalEntry(entry, options, id)
   {
      const questEntry = s_GET_QUEST(entry.id);
      if (questEntry && s_DELETE_QUEST(entry.id))
      {
         Hooks.callAll('deleteQuestEntry', questEntry, options, id);
      }
   }

   /**
    * Provides a quicker method to get the count of active quests.
    *
    * @returns {number} Quest count for active quests.
    */
   static getActiveCount()
   {
      return s_QUESTS.get(questTypes.active).length;
   }

   static getAllEnrich()
   {
      return s_QUESTS.flatten().map((entry) => entry.enrich);
   }

   static getAllEntries()
   {
      return s_QUESTS.flatten();
   }

   static getAllQuests()
   {
      return s_QUESTS.flatten().map((entry) => entry.quest);
   }

   static getEnrich(questId)
   {
      const entry = s_GET_QUEST(questId);
      return entry ? entry.enrich : null;
   }

   static getName(name)
   {
      return s_QUESTS.flatten().find((entry) => entry.quest.name === name);
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
    * @returns {null|SortedQuests|QuestEntry[]} The complete sorted quests or just a particular quest status.
    */
   static sorted({ status = void 0 } = {})
   {
      if (typeof status === 'string')
      {
         switch (status)
         {
            case questTypes.active: return s_QUESTS.get(questTypes.active).sorted(s_SORT_ALPHA);
            case questTypes.available: return s_QUESTS.get(questTypes.available).sorted(s_SORT_ALPHA);
            case questTypes.completed: return s_QUESTS.get(questTypes.completed).sorted(s_SORT_DATE_END);
            case questTypes.failed: return s_QUESTS.get(questTypes.failed).sorted(s_SORT_DATE_END);
            case questTypes.hidden:
               return Utils.isTrustedPlayer() ? s_QUESTS.get(questTypes.hidden).filter((e) => e.isOwner).sorted(
                s_SORT_ALPHA) : s_QUESTS.get(questTypes.hidden).sorted(s_SORT_ALPHA);
            default:
               console.error(`Forien Quest Log - QuestDB - sorted - unknown status: ${status}`);
               return null;
         }
      }

      return {
         active: s_QUESTS.get(questTypes.active).sorted(s_SORT_ALPHA),
         available: s_QUESTS.get(questTypes.available).sorted(s_SORT_ALPHA),
         completed: s_QUESTS.get(questTypes.completed).sorted(s_SORT_DATE_END),
         failed: s_QUESTS.get(questTypes.failed).sorted(s_SORT_DATE_END),
         hidden: Utils.isTrustedPlayer() ? s_QUESTS.get(questTypes.hidden).filter((e) => e.isOwner).sorted(
          s_SORT_ALPHA) : s_QUESTS.get(questTypes.hidden).sorted(s_SORT_ALPHA)
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

         // setTimeout(() =>
         // {
         //    Hooks.call('updateQuestEntry', questEntry, flags, options, id);
         // }, 0);
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

      if (status !== this.quest.status)
      {
         s_SET_QUEST(this);

         // Must hydrate any parent quest on status change
         if (this.quest.parent)
         {
            const parentEntry = s_GET_QUEST(this.quest.parent);
            if (parentEntry) { parentEntry.hydrate(); }
         }
      }
   }
}