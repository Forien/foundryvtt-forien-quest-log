import Utils                     from './Utils.js';
import Quest                     from '../model/Quest.js';
import QuestFolder               from '../model/QuestFolder.js';
import { constants, questTypes } from '../model/constants.js';

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
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content) { content.id = entry.id; }

      return content;
   }

   /**
    * Provides a quicker method to get the count of active quests.
    *
    * @returns {number} Quest count for active quests.
    */
   static getActiveCount()
   {
      const entries = this.allQuests();
      return entries.filter((e) => e.status === questTypes.active).length;
   }

   /**
    * Retrieves all Quests, grouped by folders.
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {string}   [options.target] - sort by target index.
    *
    * @param {string}   [options.direction] - sort direction.
    *
    * @param {boolean}  [options.available] - true if Available tab is visible.
    *
    * @param {Function} [options.sortFunc] - Custom sort function.
    *
    * @param {string}   [options.type] - Request a particular quest status.
    *
    * @returns {SortedQuests}
    */
   static sorted({ target = void 0, sortFunc = s_SORT, type = void 0, ...options } = {})
   {
      /**
       * @type {Quest[]}
       */
      let entries = this.allQuests();

      if (target !== void 0)
      {
         entries = entries.sort(sortFunc(target, options));
      }

      const quests = {};

      if (type)
      {
         switch (type)
         {
            case questTypes.available:
               quests.available = entries.filter((e) => e.status === questTypes.available);
               break;
            case questTypes.active:
               quests.active = entries.filter((e) => e.status === questTypes.active);
               break;
            case questTypes.completed:
               quests.completed = entries.filter((e) => e.status === questTypes.completed);
               break;
            case questTypes.failed:
               quests.failed = entries.filter((e) => e.status === questTypes.failed);
               break;
            case questTypes.hidden:
               if (typeof options.available === 'boolean' && !options.available)
               {
                  const available = entries.filter((e) => e.status === questTypes.available);
                  quests.hidden = entries.filter((e) => e.status === questTypes.hidden);
                  quests.hidden = [...available, ...quests.hidden];
                  quests.hidden = quests.hidden.sort(sortFunc(target, options));
               }
               else
               {
                  quests.hidden = entries.filter((e) => e.status === questTypes.hidden);
               }

               // Gross special handling.. All this code, Fetch, is going away soon w/ the in memory DB!
               // Trusted players who can edit can only see owned quests in hidden category.
               if (Utils.isTrustedPlayer()) { quests.hidden = quests.hidden.filter((e) => e.isOwner); }

               break;
         }
      }
      else
      {
         // Note the condition on 'e.parent === null' as this prevents sub quests from displaying in these categories
         quests.available = entries.filter((e) => e.status === questTypes.available);
         quests.active = entries.filter((e) => e.status === questTypes.active);
         quests.completed = entries.filter((e) => e.status === questTypes.completed);
         quests.failed = entries.filter((e) => e.status === questTypes.failed);
         quests.hidden = entries.filter((e) => e.status === questTypes.hidden);

         if (typeof options.available === 'boolean' && !options.available)
         {
            quests.hidden = [...quests.available, ...quests.hidden];
            quests.hidden = quests.hidden.sort(sortFunc(target, options));
         }

         // Gross special handling.. All this code, Fetch, is going away soon w/ the in memory DB!
         // Trusted players who can edit can only see owned quests in hidden category.
         if (Utils.isTrustedPlayer()) { quests.hidden = quests.hidden.filter((e) => e.isOwner); }
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

      return new Quest(content, entry);
   }
}

/**
 * Sort function to sort quests.
 *
 * @param {string}   target - target index.
 *
 * @param {object}   options - Optional parameters
 *
 * @returns {Quest[]} Sorted Quest array.
 */
function s_SORT(target, options)
{
   return (a, b) =>
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

      if (options.direction === 'asc')
      {
         return (targetA < targetB) ? -1 : (targetA > targetB) ? 1 : 0;
      }

      return (targetA > targetB) ? -1 : (targetA < targetB) ? 1 : 0;
   };
}
