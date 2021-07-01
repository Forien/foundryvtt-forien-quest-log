import Enrich        from './Enrich.js';
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
const s_SORT_DATE_CREATE = (a, b) => a.quest.date.create - b.quest.date.create;
const s_SORT_DATE_START = (a, b) => a.quest.date.start - b.quest.date.start;
const s_SORT_DATE_END = (a, b) => b.quest.date.end - a.quest.date.end;

const s_DELETE_QUEST = (questId) =>
{
   const currentStatus = s_QUEST_INDEX.get(questId);
   if (currentStatus && questTypes[currentStatus]) { s_QUESTS.get(currentStatus).delete(questId); }
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
   if (currentStatus && currentStatus !== entry.status && questTypes[currentStatus])
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

      for (const questEntry of s_QUESTS.flatten())
      {
         questEntry.enrich = Enrich.quest(questEntry.quest);
      }

      Hooks.on('createJournalEntry', this.createJournalEntry);
      Hooks.on('deleteJournalEntry', this.deleteJournalEntry);
      Hooks.on('updateJournalEntry', this.updateJournalEntry);
   }

   static createJournalEntry(entry)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content)
      {
         content.id = entry.id;

         const quest = new Quest(content, entry);
         const enrich = Enrich.quest(quest);

         s_SET_QUEST(new QuestEntry(quest, enrich));
      }
   }

   static deleteJournalEntry(entry)
   {
      s_DELETE_QUEST(entry.id);
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
            case questTypes.hidden: return s_QUESTS.get(questTypes.hidden).sorted(s_SORT_ALPHA);
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
         hidden: s_QUESTS.get(questTypes.hidden).sorted(s_SORT_ALPHA)
      };
   }

   static updateJournalEntry(entry)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content)
      {
         const questEntry = s_GET_QUEST(entry.id);

         if (questEntry)
         {
            questEntry.update(entry, content);
         }
         else
         {
            content.id = entry.id;

            const quest = new Quest(content, entry);
            const enrich = Enrich.quest(quest);

            s_SET_QUEST(new QuestEntry(quest, enrich));
         }
      }
   }
}

class QuestEntry
{
   /**
    * @param {Quest}    quest - The Quest object
    *
    * @param {object}   enrich - The enriched Quest data.
    */
   constructor(quest, enrich)
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
      this.enrich = Enrich.quest(this.quest);
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