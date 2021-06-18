import Quest               from '../model/Quest.js';
import QuestFolder         from '../model/QuestFolder.js';
import { constants }       from '../model/constants.js';
import { migrateData_070 } from '../utils/migrateData.js';

export default class Fetch
{
   static allQuests()
   {
      const folder = QuestFolder.get();

      /**
       * @type {Quest[]}
       */
      const entries = [];

      for (const entry of folder.content)
      {
         const content = this.content(entry);

         if (content)
         {
            entries.push(new Quest(content, entry));
         }
      }

      return entries;
   }

   static content(entry)
   {
      let content;

      content = entry.getFlag(constants.moduleName, 'json');

      // Attempt to load old quest format which is raw JSON stored in content of JE.
      if (content === void 0)
      {
         content = migrateData_070(entry);

         if (content === null) { return null; }
      }

      content.id = entry.id;

      return content;
   }

   /**
    * Retrieves all Quests, grouped by folders.
    *
    * @param target      sort by
    *
    * @param direction   sort direction
    *
    * @param available    true if Available tab is visible
    *
    * @returns {SortedQuests}
    */
   static sorted({ target = void 0, direction = 'asc', available = false } = {})
   {
      const folder = QuestFolder.get();

      /**
       * @type {Quest[]}
       */
      let entries = [];

      for (const entry of folder.content)
      {
         const content = this.content(entry);

         if (content)
         {
            entries.push(new Quest(content, entry));
         }
      }

      if (target !== void 0)
      {
         entries = s_SORT(entries, target, direction);
      }

      // Note the condition on 'e.parent === null' as this prevents sub quests from displaying in these categories
      const quests = {
         available: entries.filter((e) => e.status === 'available' && e.parent === null),
         active: entries.filter((e) => e.status === 'active'),
         completed: entries.filter((e) => e.status === 'completed' && e.parent === null),
         failed: entries.filter((e) => e.status === 'failed' && e.parent === null),
         hidden: entries.filter((e) => e.status === 'hidden' && e.parent === null)
      };

      if (!available)
      {
         quests.hidden = [...quests.available, ...quests.hidden];
         quests.hidden = s_SORT(quests.hidden, target, direction);
      }

      return quests;
   }

   /**
    * @param {string}   questId - The unique ID for the JE storing the quest.
    *
    * @returns {Quest} Returns the loaded quest.
    */
   static quest(questId)
   {
      const entry = game.journal.get(questId);

      if (!entry) { return null; }

      const content = this.content(entry);

      if (!content) { return null; }

      content.permission = entry.permission;

      return new Quest(content, entry);
   }
}

/**
 * Sort function to sort quests.
 *
 * @see getQuests()
 *
 * @param {Quest[]} quests - An array of Quests to sort.
 *
 * @param target
 *
 * @param direction
 *
 * @returns {Quest[]} Sorted Quest array.
 */
function s_SORT(quests, target, direction)
{
   return quests.sort((a, b) =>
   {
      let targetA;
      let targetB;

      if (target === 'actor')
      {
         targetA = (a.actor) ? (a.actor.name || 'ZZZZZ') : 'ZZZZZ';
         targetB = (b.actor) ? (b.actor.name || 'ZZZZZ') : 'ZZZZZ';
      }
      else
      {
         targetA = a[target];
         targetB = b[target];
      }

      if (direction === 'asc')
      {
         return (targetA < targetB) ? -1 : (targetA > targetB) ? 1 : 0;
      }

      return (targetA > targetB) ? -1 : (targetA < targetB) ? 1 : 0;
   });
}