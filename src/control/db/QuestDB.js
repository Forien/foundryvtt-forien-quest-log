import { Enrich }             from './Enrich.js';

import {
   FVTTCompat,
   Socket,
   Utils }                    from '../index.js';

import { Quest }              from '../../model/index.js';

import { QuestPreviewShim }   from '../../view/index.js';

import { collect }            from '../../../external/index.js';

import {
   constants,
   questStatus,
   settings }                 from '../../model/constants.js';

/**
 * The QuestDB holds quests in-memory that are observable by the current user. By pre-sorting quests by status and
 * observability this cuts down on sorting and filtering operations that need to be performed on quests in an ongoing
 * basis. Based on the type of user quests may go in and out of observability for permission and status category
 * changes.
 *
 * In time with future refactoring the reliance on {@link Socket} for notifications to connected clients will be
 * reduced as the QuestDB lifecycle hooks can replace many of the notification concerns.
 *
 * All quests and stored in {@link QuestEntry} instances which hold a {@link Quest} and the {@link EnrichData} created
 * by {@link Enrich.quest} which is used when rendering {@link Handlebars} templates. There are several data points
 * cached in QuestEntry from the Quest itself on any update; mostly the getter functions of Quest are cached each update
 * in `#questEntryHydrate`. When an update does occur in `#handleJournalEntryUpdate` a QuestEntry is either
 * added, removed, or updated based on the observability test found in `#isObservable`. Another pre-processing
 * step for performance is to store all QuestEntry instances by the status of the quest. There are also two different
 * views for QuestEntry data. The first is a map of Maps, `#questsMap`, with main index keys being the quest
 * status. This preprocessing step allows quick retrieval of all quests by status category and ID without the need to
 * filter all quests by status. Additionally, when `#questsMap` is updated a second view of the data is
 * constructed as well which is a map of {@link CollectJS} collections found in `#questsCollect`. This allows
 * in depth manipulation of all QuestEntry instances as a single collection. CollectJS has many options available for
 * chained processing. There are by default two methods which apply a sort ({@link QuestDB.sortCollect}) or filter
 * ({@link QuestDB.filterCollect}) operation to retrieve the {@link QuestsCollect} bundle returning a single status
 * category or all quests indexed by status category. Iterators for quests are available by
 * {@link QuestDB.iteratorQuests} and QuestEntry instances from {@link QuestDB.iteratorEntries}. Additionally, there
 * are several direct retrieval methods such as {@link QuestDB.getQuest} and {@link QuestDB.getQuestEntry}.
 *
 * QuestDB lifecycle hooks ({@link QuestDBHooks}): The QuestDB has familiar lifecycle hooks to Foundry itself such as
 * `createQuestEntry`, `deleteQuestEntry` and `updateQuestEntry`, but provides more fine-grained visibility of quest
 * data that is loaded into and out of the in-memory QuestDB. Additional lifecycle hooks are: `addedAllQuestEntries`,
 * `addQuestEntry`, `removedAllQuestEntries`, and `removeQuestEntry`. These latter unique lifecycle events signify
 * observability. A quest may exist in the Foundry document / journal entry system, but only is added to the QuestDB
 * when it is observable and this corresponds to the `addedAllQuestEntries` and `addQuestEntry` hooks. Likewise, both
 * remove quest hooks relate to when a quest is removed based on observability whether through permission or quest
 * status category updates; IE the quest  _is not_ deleted, but is no longer observable by the current user and is
 * removed from the QuestDB.
 *
 * ```
 * - `addedAllQuestEntries` - All observable quests have been added in the {@link QuestDB.init} method.
 *
 * {@link QuestDB.init}: After all quests have been initialized this hook is called to inform any external modules that
 * all observable quests have been loaded into the QuestDB in bulk.
 * ```
 *
 * ```
 * - `addQuestEntry` - A quest has become observable and a QuestEntry instance is added to the QuestDB.
 *
 * {@link QuestDB.consistencyCheck}: During a consistency check which is mainly used when module settings for
 * trusted player edit is enabled / disabled quests can be added to QuestDB.
 *
 * `#handleJournalEntryUpdate`: During the journal entry update hook a quest may become observable for the current
 * user and added to the QuestDB.
 * ```
 *
 * ```
 * - `createQuestEntry`
 *
 * `#handleJournalEntryCreate`: A new quest is added to the QuestDB through creation and is observable by the
 * current user.
 * ```
 *
 * ```
 * - `deleteQuestEntry`
 *
 * `#handleJournalEntryDelete`: A Quest has been deleted and is removed from the QuestDB.
 * ```
 *
 * ```
 * - `removedAllQuestEntries`
 *
 * {@link QuestDB.removeAll}: All quests have been removed from QuestDB.
 * ```
 *
 * ```
 * - `removeQuestEntry`
 *
 * {@link QuestDB.consistencyCheck}: During a consistency check which is mainly used when module settings for
 * trusted player edit is enabled / disabled quests can be removed from QuestDB.
 *
 * `#handleJournalEntryUpdate`: A quest is no longer observable for permission reasons or status category change.
 * ```
 *
 * ```
 * - `updateQuestEntry`
 *
 * `#handleJournalEntryUpdate`: A quest that is currently in QuestDB has been updated.
 * ```
 */
export class QuestDB
{
   /**
    * Set to true after the first call to `QuestDB.init`. Protects against adding hooks multiple times.
    *
    * @type {boolean}
    */
   static #initialized = false;

   /**
    * Defines the DB Hook callbacks. Please see {@link QuestDB} for more documentation.
    *
    * @type {QuestDBHooks}
    */
   static #dbHooks = Object.freeze({
      addedAllQuestEntries: 'addedAllQuestEntries',
      addQuestEntry: 'addQuestEntry',
      createQuestEntry: 'createQuestEntry',
      deleteQuestEntry: 'deleteQuestEntry',
      removedAllQuestEntries: 'removedAllQuestEntries',
      removeQuestEntry: 'removeQuestEntry',
      updateQuestEntry: 'updateQuestEntry',
   });

   /**
    * @type {FilterFunctions}
    */
   static #fnFilter = Object.freeze({
      IS_OBSERVABLE: (entry) => entry.isObservable
   });

   /**
    * @type {SortFunctions}
    */
   static #fnSort = Object.freeze({
      ALPHA: (a, b) => a.quest.name.localeCompare(b.quest.name),
      DATE_CREATE: (a, b) => a.quest.date.create - b.quest.date.create,
      DATE_START: (a, b) => a.quest.date.start - b.quest.date.start,
      DATE_END: (a, b) => b.quest.date.end - a.quest.date.end
   });

   /**
    * Stores all {@link QuestEntry} instances in a map of CollectJS collections. This provides rapid sorting, filtering,
    * and many other potential operations that {@link collect} / CollectJS collections provide for working with arrays
    * of object data. Each collection is built from the values of the `#questMap` per status category.
    *
    * @type {Record<string, Collection<QuestEntry>>}
    * @see https://collect.js.org/api.html
    */
   static #questsCollect = Object.seal({
      active: collect(),
      available: collect(),
      completed: collect(),
      failed: collect(),
      inactive: collect()
   });

   /**
    * Provides an index into the `#questMap` for all QuestEntry instances by questId and the status category.
    * This allows quick retrieval and removal of QuestEntry instances from `#questMap`.
    *
    * @type {Map<string, string>}
    */
   static #questIndex = new Map();

   /**
    * Stores all {@link QuestEntry} instances in a map of Maps. This provides fast retrieval and quick insert / removal
    * with quests pre-sorted by status.
    *
    * @type {Record<string, Map<string, QuestEntry>>}
    */
   static #questsMap = Object.seal({
      active: new Map(),
      available: new Map(),
      completed: new Map(),
      failed: new Map(),
      inactive: new Map()
   });

   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

   /**
    * Initializes the QuestDB. If FQL is hidden from the current user then no quests load. All quests are loaded based
    * on observability by the current user.
    *
    * This method may be invoked multiple times, but it is generally important to only invoke `init` when the QuestDB
    * is empty.
    *
    * @returns {Promise<void>}
    */
   static async init()
   {
      let folder = await Utils.initializeQuestFolder();

      // If the folder doesn't exist then simulate the content parameter. This should only ever occur for a player
      // logged in when a GM activates FQL for the first time or if the _fql_quests folder is deleted.
      if (!folder)
      {
         if (game.user.isGM)
         {
            console.warn('ForienQuestLog - Failed to initialize QuestDB as the quest folder / _fql_quests is missing.');
         }

         folder = { content: [] };
      }

      // Skip initialization of data if FQL is hidden from the current player. FQL is never hidden from GM level users.
      if (!Utils.isFQLHiddenFromPlayers())
      {
         // Cache `isTrustedPlayerEdit`.
         const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();

         // Iterate over all journal entries in `_fql_quests` folder.
         const folderContents = FVTTCompat.folderContents(folder);

         for (const entry of folderContents)
         {
            const content = entry.getFlag(constants.moduleName, constants.flagDB);

            if (!content) { continue; }

            // Retrieve the flag content for the quest and if presently observable add a new QuestEntry to QuestDB.
            if (this.#isObservable(content, entry, isTrustedPlayerEdit))
            {
               const quest = new Quest(content, entry);

               // Must set a QuestEntry w/ an undefined enrich as all quest data must be loaded before enrichment.
               // Also set `generate` to false as the CollectJS collections are rebuilt in below.
               this.#setQuestEntry(new QuestEntry(quest, void 0), false);
            }
            else
            {
               // If JE / Quest is not observable then still set a QuestPreview shim.
               entry._sheet = new QuestPreviewShim(entry.id);
            }
         }

         // Must hydrate all QuestEntry instances after all quests have been added to `#questsMap`. Hydration will build
         // the cache of various getter functions and enriched data in QuestEntry.
         for (const questEntry of QuestDB.iteratorEntries()) { await this.#questEntryHydrate(questEntry); }

         // Create the CollectJS collections in build after hydration.
         for (const key of Object.keys(this.#questsMap))
         {
            this.#questsCollect[key] = collect(Array.from(this.#questsMap[key].values()));
         }

         Hooks.callAll(QuestDB.hooks.addedAllQuestEntries);
      }

      // Only add the Foundry hooks once on first initialization.
      if (!this.#initialized)
      {
         Hooks.on('createJournalEntry', this.#handleJournalEntryCreate.bind(this));
         Hooks.on('deleteJournalEntry', this.#handleJournalEntryDelete.bind(this));
         Hooks.on('updateJournalEntry', this.#handleJournalEntryUpdate.bind(this));
      }

      this.#initialized = true;
   }

   /**
    * @returns {QuestDBHooks} The QuestDB hooks.
    */
   static get hooks() { return this.#dbHooks; }

   /**
    * @returns {FilterFunctions} Various useful filter functions.
    */
   static get Filter() { return this.#fnFilter; }

   /**
    * @returns {SortFunctions} Various useful sorting functions.
    */
   static get Sort() { return this.#fnSort; }

   /**
    * Verifies all quests by observability removing any quests from QuestDB that are no longer observable by the current
    * user or adding quests that are now observable. This only really needs to occur after particular module setting
    * changes which right now is when trusted player edit is enabled / disabled.
    *
    * @see FQLSettings.trustedPlayerEdit
    */
   static async consistencyCheck()
   {
      const folder = Utils.getQuestFolder();

      // Early out if the folder is not available or FQL is hidden from the current player.
      if (!folder || Utils.isFQLHiddenFromPlayers()) { return; }

      // Create a single map of all QuestEntry instances.
      const questEntryMap = new Map(QuestDB.getAllQuestEntries().map((e) => [e.id, e]));

      // Cache if the current player has trusted player edit capabilities.
      const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();

      // Iterate over all quests.
      const folderContents = FVTTCompat.folderContents(folder);

      for (const entry of folderContents)
      {
         const content = entry.getFlag(constants.moduleName, constants.flagDB);

         if (content)
         {
            // If the quest is observable attempt to retrieve it.
            if (this.#isObservable(content, entry, isTrustedPlayerEdit))
            {
               let questEntry = questEntryMap.get(entry.id);

               // If the quest is not retrieved, but is observable add it to the QuestDB.
               if (!questEntry)
               {
                  questEntry = new QuestEntry(new Quest(content, entry));
                  this.#setQuestEntry(await this.#questEntryHydrate(questEntry));

                  Hooks.callAll(QuestDB.hooks.addQuestEntry, questEntry, entry.flags, { diff: false, render: true },
                   entry.id);
               }
               else
               {
                  // Otherwise update the quest with current data.
                  await this.#questEntryUpdate(questEntry, content, entry);
               }
            }
            else
            {
               // The quest is not observable so if it is retrieved from the flat `questEntryMap` remove it from the
               // QuestDB.
               const questEntry = questEntryMap.get(entry.id);
               if (questEntry)
               {
                  questEntryMap.delete(entry.id);
                  this.#removeQuestEntry(entry.id);

                  // This quest is not deleted; it has been removed from the in-memory DB.
                  Hooks.callAll(QuestDB.hooks.removeQuestEntry, questEntry, entry.flags, { diff: false, render: true },
                   entry.id);
               }
            }
         }
      }

      // Enrich all after all updates are complete.
      await this.enrichAll();
   }

   /**
    * Creates a new quest and waits for the journal entry to update and QuestDB to pick up the new Quest which
    * is then returned.
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {object}   [options.data] - Quest data to assign to new quest.
    *
    * @param {string}   [options.parentId] - Any associated parent ID; if set then this is a subquest.
    *
    * @returns {Promise<Quest|void>} The newly created quest.
    */
   static async createQuest({ data = {}, parentId = void 0 } = {})
   {
      // Get the default ownership setting and attempt to set it if found in DOCUMENT_PERMISSION_LEVELS.
      const defaultPerm = game.settings.get(constants.moduleName, settings.defaultPermission);

      const ownership = {
         default: typeof CONST.DOCUMENT_OWNERSHIP_LEVELS[defaultPerm] === 'number' ?
          CONST.DOCUMENT_OWNERSHIP_LEVELS[defaultPerm] : CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER
      };

      // Used for a player created quest setting and the quest as 'available' for normal players or 'hidden' for
      // trusted players.
      if (!game.user.isGM)
      {
         data.status = Utils.isTrustedPlayerEdit() ? questStatus.inactive : questStatus.available;
         ownership[game.user.id] = CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;
      }

      const parentQuest = QuestDB.getQuest(parentId);
      if (parentQuest)
      {
         data.parent = parentId;
      }

      // Creating a new quest will add any missing data / schema.
      const tempQuest = new Quest(data);

      const folder = Utils.getQuestFolder();
      if (!folder)
      {
         console.warn('ForienQuestLog - QuestDB.createQuest - quest folder not found.');
         return;
      }

      const entry = await JournalEntry.create({
         name: tempQuest.name,
         folder: folder.id,
         content: '',
         ownership,
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

      // QuestDB Journal update hook is now async, so schedule on next microtask to be able to retrieve new quest.
      return new Promise((resolve) =>
      {
         setTimeout(() =>
         {
            const quest = QuestDB.getQuest(entry.id);

            // Players don't see Hidden tab, but assistant GM can, so emit anyway
            Socket.refreshAll();

            resolve(quest);
         }, 10);
      });
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
   static async deleteQuest({ quest, questId } = {})
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

      // Return the deleted and saved IDs.
      return {
         deleteId,
         savedIds
      };
   }

   /**
    * Enriches all stored {@link QuestEntry} instances. This is particularly useful in various callbacks when settings
    * change in {@link ModuleSettings}.
    */
   static async enrichAll()
   {
      for (const questEntry of QuestDB.iteratorEntries())
      {
         questEntry.enrich = await Enrich.quest(questEntry.quest);
      }
   }

   /**
    * Enriches specific {@link QuestEntry} instances. This is useful in various callbacks when settings state changes
    * that is not stored in the {@link Quest} itself. An example is storing the primary quest in world /
    * {@link ModuleSettings}.
    *
    * @param {...string} questIds - The quest IDs to enrich.
    */
   static async enrichQuests(...questIds)
   {
      for (const questId of questIds)
      {
         const questEntry = QuestDB.getQuestEntry(questId);
         if (questEntry)
         {
            questEntry.enrich = await Enrich.quest(questEntry.quest);
         }
      }
   }

   /**
    * Filter the entire QuestDB, returning an Array of entries which match a functional predicate.
    *
    * @param {Function} predicate  The functional predicate to test.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.type] - The quest type / status to iterate.
    *
    * @returns {QuestEntry[]}  An Array of matched values.
    * @see Array#filter
    */
   static filter(predicate, options)
   {
      const entries = [];
      for (const questEntry of QuestDB.iteratorEntries(options))
      {
         if (predicate(questEntry)) { entries.push(questEntry); }
      }
      return entries;
   }

   /**
    * Filters the CollectJS collections and returns a single collection if status is specified otherwise filters all
    * quest collections and returns a QuestCollect object with all status categories. At minimum, you must provide a
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
   static filterCollect({ status = void 0, filter = void 0, filterActive = void 0, filterAvailable = void 0,
    filterCompleted = void 0, filterFailed = void 0, filterInactive = void 0 } = {})
   {
      // A particular status is requested so only filter and return the specific collection.
      if (typeof status === 'string')
      {
         switch (status)
         {
            case questStatus.active:
               return this.#questsCollect[questStatus.active].filter(filterActive ?? filter);
            case questStatus.available:
               return this.#questsCollect[questStatus.available].filter(filterAvailable ?? filter);
            case questStatus.completed:
               return this.#questsCollect[questStatus.completed].filter(filterCompleted ?? filter);
            case questStatus.failed:
               return this.#questsCollect[questStatus.failed].filter(filterFailed ?? filter);
            case questStatus.inactive:
               return this.#questsCollect[questStatus.inactive].filter(filterInactive ?? filter);
            default:
               console.error(`Forien Quest Log - QuestDB - filterCollect - unknown status: ${status}`);
               return void 0;
         }
      }

      // Otherwise filter all status categories and return a QuestsCollect object.
      return {
         active: this.#questsCollect[questStatus.active].filter(filterActive || filter),
         available: this.#questsCollect[questStatus.available].filter(filterAvailable || filter),
         completed: this.#questsCollect[questStatus.completed].filter(filterCompleted || filter),
         failed: this.#questsCollect[questStatus.failed].filter(filterFailed || filter),
         inactive: this.#questsCollect[questStatus.inactive].filter(filterInactive || filter)
      };
   }

   /**
    * Find an entry in the QuestDB using a functional predicate.
    *
    * @param {Function} predicate - The functional predicate to test.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.status] - The quest type / status to iterate.
    *
    * @returns {QuestEntry} The QuestEntry, if found, otherwise undefined.
    * @see Array#find
    */
   static find(predicate, options)
   {
      for (const questEntry of QuestDB.iteratorEntries(options))
      {
         if (predicate(questEntry)) { return questEntry; }
      }

      return void 0;
   }

   /**
    * Returns all QuestEntry instances.
    *
    * @returns {QuestEntry[]} All QuestEntry instances.
    */
   static getAllQuestEntries()
   {
      return this.#flattenQuestsMap();
   }

   /**
    * Returns all Quest instances.
    *
    * @returns {Quest[]} All quest instances.
    */
   static getAllQuests()
   {
      return this.#flattenQuestsMap().map((entry) => entry.quest);
   }

   /**
    * Provides a quicker method to get the count of quests by quest status or all quests.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the count of all quests is returned.
    *
    * @param {string}   [options.status] - The quest status category to count.
    *
    * @returns {number} Quest count for the specified type or the count for all quests.
    */
   static getCount({ status = void 0 } = {})
   {
      if (status === void 0)
      {
         return this.#questsMap[questStatus.active].size + this.#questsMap[questStatus.available].size +
          this.#questsMap[questStatus.completed].size + this.#questsMap[questStatus.failed].size +
          this.#questsMap[questStatus.inactive].size;
      }

      return this.#questsMap[status] ? this.#questsMap[status].size : 0;
   }

   /**
    * Gets the Quest by quest ID.
    *
    * @param {string}   questId - A Foundry ID
    *
    * @returns {Quest|void} The Quest.
    */
   static getQuest(questId)
   {
      const entry = this.#getQuestEntry(questId);
      return entry ? entry.quest : void 0;
   }

   /**
    * Retrieves a QuestEntry by quest ID.
    *
    * @param {string}   questId - A Foundry ID
    *
    * @returns {QuestEntry} The QuestEntry.
    */
   static getQuestEntry(questId)
   {
      return this.#getQuestEntry(questId);
   }

   /**
    * Provides an iterator across the QuestEntry map of maps returning all {@link QuestEntry} instances or instances of
    * a particular status category.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.status] - The quest status category to iterate.
    *
    * @yields {QuestEntry} The QuestEntry iterator.
    */
   static *iteratorEntries({ status = void 0 } = {})
   {
      if (status === void 0)
      {
         for (const value of this.#questsMap[questStatus.active].values()) { yield value; }
         for (const value of this.#questsMap[questStatus.available].values()) { yield value; }
         for (const value of this.#questsMap[questStatus.completed].values()) { yield value; }
         for (const value of this.#questsMap[questStatus.failed].values()) { yield value; }
         for (const value of this.#questsMap[questStatus.inactive].values()) { yield value; }
      }
      else if (this.#questsMap[status])
      {
         for (const value of this.#questsMap[status].values()) { yield value; }
      }
   }

   /**
    * Provides an iterator across the QuestEntry map of maps returning all {@link Quest} instances or instances of a
    * particular status category.
    *
    * @param {object}   [options] - Optional parameters. If no options are provided the iteration occurs across all
    *                               quests.
    *
    * @param {string}   [options.status] - The quest status category to iterate.
    *
    * @yields {Quest} The Quest iterator.
    */
   static *iteratorQuests({ status = void 0 } = {})
   {
      if (status === void 0)
      {
         for (const value of this.#questsMap[questStatus.active].values()) { yield value.quest; }
         for (const value of this.#questsMap[questStatus.available].values()) { yield value.quest; }
         for (const value of this.#questsMap[questStatus.completed].values()) { yield value.quest; }
         for (const value of this.#questsMap[questStatus.failed].values()) { yield value.quest; }
         for (const value of this.#questsMap[questStatus.inactive].values()) { yield value.quest; }
      }
      else if (this.#questsMap[status])
      {
         for (const value of this.#questsMap[status].values()) { yield value.quest; }
      }
   }

   /**
    * Removes all quests from the QuestDB.
    */
   static removeAll()
   {
      this.#questsMap[questStatus.active].clear();
      this.#questsMap[questStatus.available].clear();
      this.#questsMap[questStatus.completed].clear();
      this.#questsMap[questStatus.failed].clear();
      this.#questsMap[questStatus.inactive].clear();

      this.#questIndex.clear();

      this.#questsCollect[questStatus.active] = collect();
      this.#questsCollect[questStatus.available] = collect();
      this.#questsCollect[questStatus.completed] = collect();
      this.#questsCollect[questStatus.failed] = collect();
      this.#questsCollect[questStatus.inactive] = collect();

      Hooks.callAll(QuestDB.hooks.removedAllQuestEntries);
   }

   /**
    * Sorts the CollectJS collections and returns a single collection if status is specified otherwise sorts all
    * quest collections and returns a QuestCollect object with all status categories. By default, the sort functions
    * are `Sort.DATE_END` for status categories of 'completed' / 'failed' and `Sort.ALPHA` for all other
    * categories.
    *
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
    * @returns {QuestsCollect|Collection<QuestEntry>|void} An object of all QuestEntries sorted by status or individual
    *                                                      status.
    */
   static sortCollect({ status = void 0, sortActive = this.Sort.ALPHA, sortAvailable = this.Sort.ALPHA,
    sortCompleted = this.Sort.DATE_END, sortFailed = this.Sort.DATE_END, sortInactive = this.Sort.ALPHA } = {})
   {
      if (typeof status === 'string')
      {
         switch (status)
         {
            case questStatus.active:
               return this.#questsCollect[questStatus.active].sort(sortActive);
            case questStatus.available:
               return this.#questsCollect[questStatus.available].sort(sortAvailable);
            case questStatus.completed:
               return this.#questsCollect[questStatus.completed].sort(sortCompleted);
            case questStatus.failed:
               return this.#questsCollect[questStatus.failed].sort(sortFailed);
            case questStatus.inactive:
               return this.#questsCollect[questStatus.inactive].sort(sortInactive);
            default:
               console.error(`Forien Quest Log - QuestDB - sortCollect - unknown status: ${status}`);
               return void 0;
         }
      }

      return {
         active: this.#questsCollect[questStatus.active].sort(sortActive),
         available: this.#questsCollect[questStatus.available].sort(sortAvailable),
         completed: this.#questsCollect[questStatus.completed].sort(sortCompleted),
         failed: this.#questsCollect[questStatus.failed].sort(sortFailed),
         inactive: this.#questsCollect[questStatus.inactive].sort(sortInactive)
      };
   }

   // Foundry CRUD hook callbacks ------------------------------------------------------------------------------------

   /**
    * Foundry hook callback when a new JournalEntry is created. For quests there are two cases to consider. The first
    * is straight forward when a new quest is created from FQL. The second case is a bit more challenging and that
    * occurs when a journal entry / quest is imported from a compendium. In this case we need to scrub the subquests
    * that may no longer resolve to valid journal entries in the system.
    *
    * @param {JournalEntry}   entry - A journal entry.
    *
    * @param {object}         options - The create document options.
    *
    * @param {string}         id - journal entry ID.
    */
   static async #handleJournalEntryCreate(entry, options, id)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      // Exit early if no FQL quest data is available.
      if (!content) { return; }

      // Process the quest content if it is currently observable and FQL is not hidden from the current user.
      if (this.#isObservable(content, entry) && !Utils.isFQLHiddenFromPlayers())
      {
         const quest = new Quest(content, entry);

         const questEntry = new QuestEntry(quest);
         this.#setQuestEntry(await this.#questEntryHydrate(questEntry));

         Hooks.callAll(QuestDB.hooks.createQuestEntry, questEntry, options, id);

         // At this point a new quest will not have subquests, but an imported journal entry / quest from a compendium
         // may have subquests. These may not resolve to any existing journal entries, so we scrub any non-resolving
         // subquests.
         if (quest.subquests.length > 0)
         {
            const removeSubs = [];

            // First push any subquest IDs that don't resolve to journal entries in `removeSubs`.
            for (const subquest of quest.subquests)
            {
               if (!game.journal.get(subquest)) { removeSubs.push(subquest); }
            }

            // Remove the non-resolving subquests from the quest.
            for (const removeSub of removeSubs)
            {
               const index = quest.subquests.indexOf(removeSub);
               if (index > -1) { quest.subquests.splice(index, 1); }
            }

            // And save the quest. This will cause an update to occur and `#handleJournalEntryUpdate` will hydrate the
            // change.
            if (removeSubs.length > 0) { await quest.save(); }
         }
      }
      else
      {
         // If JE / Quest is not observable then still set a QuestPreview shim.
         entry._sheet = new QuestPreviewShim(entry.id);
      }
   }

   /**
    * Process the Foundry hook for journal entry deletion.
    *
    * @param {JournalEntry}   entry - Deleted journal entry.
    *
    * @param {object}         options - The delete document options.
    *
    * @param {string}         id - Journal entry ID.
    *
    * @returns {Promise<void>}
    */
   static async #handleJournalEntryDelete(entry, options, id)
   {
      // If the QuestEntry can be retrieved by this journal entry ID then remove it from the QuestDB.
      const questEntry = this.#getQuestEntry(entry.id);
      if (questEntry && this.#removeQuestEntry(entry.id))
      {
         Hooks.callAll(QuestDB.hooks.deleteQuestEntry, questEntry, options, id);

         const quest = questEntry.quest;
         const savedIds = quest.parent ? [quest.parent, ...quest.subquests] : [...quest.subquests];

         // Send the delete quest socket message to all clients.
         await Socket.deletedQuest({
            deleteId: entry.id,
            savedIds
         });

         Socket.refreshAll();
      }
   }

   /**
    * Handles the Foundry update JournalEntry hook. If Quest content is retrieved from the flags process it for
    * observability changes or update the associated QuestEntry if already in the QuestDB.
    *
    * @param {JournalEntry}   entry - A journal entry.
    *
    * @param {object}         flags - Journal entry flags.
    *
    * @param {object}         options - The update document options.
    *
    * @param {string}         id - The journal entry ID.
    */
   static async #handleJournalEntryUpdate(entry, flags, options, id)
   {
      const content = entry.getFlag(constants.moduleName, constants.flagDB);

      if (content)
      {
         let questEntry = this.#getQuestEntry(entry.id);

         // Is the quest currently observable and not hidden from the current user.
         const isObservable = this.#isObservable(content, entry) && !Utils.isFQLHiddenFromPlayers();

         if (questEntry)
         {
            // If the QuestEntry already exists in the QuestDB and is observable then update it.
            if (isObservable)
            {
               await this.#questEntryUpdate(questEntry, content, entry);
               Hooks.callAll(QuestDB.hooks.updateQuestEntry, questEntry, flags, options, id);
            }
            else // Else remove it from the QuestDB (this is not a deletion).
            {
               this.#removeQuestEntry(questEntry.id);

               // Must hydrate any parent on a change.
               if (typeof questEntry.quest.parent === 'string')
               {
                  const parentEntry = this.#getQuestEntry(questEntry.quest.parent);
                  if (parentEntry) { await this.#questEntryHydrate(parentEntry); }
               }

               // Must hydrate any subquests on a change.
               for (const subquest of questEntry.quest.subquests)
               {
                  const subquestEntry = this.#getQuestEntry(subquest);
                  if (subquestEntry) { await this.#questEntryHydrate(subquestEntry); }
               }

               // This quest is not deleted; it has been removed from the in-memory DB.
               Hooks.callAll(QuestDB.hooks.removeQuestEntry, questEntry, flags, options, id);
            }
         }
         else if (isObservable) // The Quest is not in the QuestDB and is observable so add it.
         {
            questEntry = new QuestEntry(new Quest(content, entry));
            this.#setQuestEntry(await this.#questEntryHydrate(questEntry));

            // Must hydrate any parent on a change.
            if (typeof questEntry.quest.parent === 'string')
            {
               const parentEntry = this.#getQuestEntry(questEntry.quest.parent);
               if (parentEntry) { await this.#questEntryHydrate(parentEntry); }
            }

            // Must hydrate any subquests on a change.
            for (const subquest of questEntry.quest.subquests)
            {
               const subquestEntry = this.#getQuestEntry(subquest);
               if (subquestEntry) { await this.#questEntryHydrate(subquestEntry); }
            }

            Hooks.callAll(QuestDB.hooks.addQuestEntry, questEntry, flags, options, id);
         }
         else
         {
            // If JE / Quest is not observable then still set a QuestPreview shim.
            entry._sheet = new QuestPreviewShim(entry.id);
         }
      }
   }

   // Internal implementation ----------------------------------------------------------------------------------------

   /**
    * Flattens the QuestEntry map of maps into and array of all entries.
    *
    * Please see {@link QuestDB.iteratorEntries} for an iterator across all entries.
    *
    * @returns {QuestEntry[]} An array of all QuestEntry values stored.
    */
   static #flattenQuestsMap()
   {
      return [
         ...this.#questsMap[questStatus.active].values(),
         ...this.#questsMap[questStatus.available].values(),
         ...this.#questsMap[questStatus.completed].values(),
         ...this.#questsMap[questStatus.failed].values(),
         ...this.#questsMap[questStatus.inactive].values()
      ];
   }

   /**
    * @param {string}   questId - The Quest / JournalEntry ID.
    *
    * @returns {QuestEntry} The stored QuestEntry.
    */
   static #getQuestEntry(questId)
   {
      const currentStatus = this.#questIndex.get(questId);
      return currentStatus && this.#questsCollect[currentStatus] ? this.#questsMap[currentStatus].get(questId) : void 0;
   }

   /**
    * Provides the observability test for a quest based on the user level and permissions of the backing journal entry.
    * GM level users always can observe any quests. Trusted players w/ the module setting
    * {@link FQLSettings.trustedPlayerEdit} enabled and the owner of the quest can observe quests in the inactive status.
    * Otherwise, quests are only observable by players when the default or personal permission is
    * {@link CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER} or higher.
    *
    * @param {QuestData}      content - The serialized Quest data stored in the journal entry.
    *
    * @param {JournalEntry}   entry - The backing journal entry.
    *
    * @param {boolean}        [isTrustedPlayerEdit] - Is the user trusted and is the module setting to edit granted.
    *
    * @returns {boolean}   Is quest observable by the current user?
    */
   static #isObservable(content, entry, isTrustedPlayerEdit = Utils.isTrustedPlayerEdit())
   {
      let isObservable;

      if (game.user.isGM)
      {
         isObservable = true;
      }
      else
      {
         const isInactive = questStatus.inactive === content.status;

         // Special handling for trusted player edit who can only see owned quests in the hidden / inactive category.
         if (isTrustedPlayerEdit && isInactive)
         {
            isObservable = entry.isOwner;
         }
         else
         {
            // Otherwise no one can see hidden / inactive quests; perform user permission check for observer.
            isObservable = !isInactive && entry.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
         }
      }

      return isObservable;
   }

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
   static #removeQuestEntry(questId, generate = true)
   {
      const currentStatus = this.#questIndex.get(questId);
      this.#questIndex.delete(questId);

      let result = false;

      if (this.#questsMap[currentStatus])
      {
         result = this.#questsMap[currentStatus].delete(questId);
      }

      if (result && generate)
      {
         this.#questsCollect[currentStatus] = collect(Array.from(this.#questsMap[currentStatus].values()));
      }

      return result;
   }

   /**
    * Sets the QuestEntry by current status and regenerates any CollectJS collection if the status changes.
    *
    * @param {QuestEntry}  entry - QuestEntry to set.
    *
    * @param {boolean}     [generate=true] - Regenerate `#questsCollect`.
    */
   static #setQuestEntry(entry, generate = true)
   {
      // Retrieve the current status from the quest entry index map.
      const currentStatus = this.#questIndex.get(entry.id);

      // If defined and current status is different from the incoming QuestEntry status then delete the QuestEntry from
      // the old map of map bin.
      if (this.#questsMap[currentStatus] && currentStatus !== entry.status)
      {
         // If the delete action is successful and generate is true then regenerate the CollectJS collection of the
         // old status.
         if (this.#questsMap[currentStatus].delete(entry.id) && generate)
         {
            this.#questsCollect[currentStatus] = collect(Array.from(this.#questsMap[currentStatus].values()));
         }
      }

      if (!this.#questsMap[entry.status])
      {
         console.error(`ForienQuestLog - QuestDB - set quest error - unknown status: ${entry.status}`);
         return;
      }

      // Set the quest index by quest id and new status and set the map of maps entry.
      this.#questIndex.set(entry.id, entry.status);
      this.#questsMap[entry.status].set(entry.id, entry);

      // If generate is true regenerate the new entry status CollectJS collection.
      if (generate)
      {
         this.#questsCollect[entry.status] = collect(Array.from(this.#questsMap[entry.status].values()));
      }
   }

   /**
    * Hydrates this QuestEntry caching the enriched data and several getter values from Quest.
    *
    * @param {QuestEntry} questEntry - Target quest entry.
    *
    * @returns {QuestEntry} This QuestEntry.
    */
   static async #questEntryHydrate(questEntry)
   {
      questEntry.id = questEntry.quest.id;
      questEntry.status = questEntry.quest.status;

      /**
       * @type {boolean}
       */
      questEntry.isActive = questEntry.quest.isActive;

      /**
       * @type {boolean}
       */
      questEntry.isHidden = questEntry.quest.isHidden;

      /**
       * @type {boolean}
       */
      questEntry.isInactive = questEntry.quest.isInactive;

      /**
       * @type {boolean}
       */
      questEntry.isObservable = questEntry.quest.isObservable;

      /**
       * @type {boolean}
       */
      questEntry.isOwner = questEntry.quest.isOwner;

      /**
       * @type {boolean}
       */
      questEntry.isPersonal = questEntry.quest.isPersonal;

      /**
       * Stores all adjacent quest IDs including any parent, subquests, and this quest.
       *
       * @type {string[]}
       */
      questEntry.questIds = questEntry.quest.getQuestIds();

      /**
       * @type {EnrichData}
       */
      questEntry.enrich = await Enrich.quest(questEntry.quest);

      return questEntry;
   }

   /**
    * Updates an existing {@link QuestEntry} when the backing quest data changes.
    *
    * @param {QuestEntry}     questEntry - Target quest entry.
    *
    * @param {QuestData}      content - The FQL quest data from journal entry.
    *
    * @param {JournalEntry}   entry - The backing journal entry.
    *
    * @returns {Promise<boolean>} Was `#setQuestEntry` invoked.
    */
   static async #questEntryUpdate(questEntry, content, entry)
   {
      questEntry.quest.entry = entry;
      questEntry.quest.initData(content);
      const status = questEntry.status;
      await this.#questEntryHydrate(questEntry);

      // Must hydrate any parent on a change.
      if (typeof questEntry.quest.parent === 'string')
      {
         const parentEntry = QuestDB.getQuestEntry(questEntry.quest.parent);
         if (parentEntry) { await this.#questEntryHydrate(parentEntry); }
      }

      // Must hydrate any subquests on a change.
      for (const subquest of questEntry.quest.subquests)
      {
         const subquestEntry = QuestDB.getQuestEntry(subquest);
         if (subquestEntry) { await this.#questEntryHydrate(subquestEntry); }
      }

      if (status !== questEntry.quest.status)
      {
         this.#setQuestEntry(questEntry);
         return true;
      }

      return false;
   }
}

/**
 * Provides the internal object stored in the QuestDB that contains the Quest and enriched data along with
 * several public member variables that are cached from the Quest on any update allowing quick sorting.
 */
class QuestEntry
{
   /**
    * @param {Quest}       quest - The Quest object
    *
    * @param {EnrichData}  [enrich] - The enriched Quest data. If not set be sure to hydrate.
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
       * @type {EnrichData}
       */
      this.enrich = enrich;

      // Set in `#questEntryHydrate`.

      /**
       * @type {boolean}
       */
      this.isActive = void 0;

      /**
       * @type {boolean}
       */
      this.isHidden = void 0;

      /**
       * @type {boolean}
       */
      this.isInactive = void 0;

      /**
       * @type {boolean}
       */
      this.isObservable = void 0;

      /**
       * @type {boolean}
       */
      this.isOwner = void 0;

      /**
       * @type {boolean}
       */
      this.isPersonal = void 0;

      /**
       * Stores all adjacent quest IDs including any parent, subquests, and this quest.
       *
       * @type {string[]}
       */
      this.questIds = void 0;
   }
}

/**
 * @typedef {object} DeleteData The data object returned from `delete` indicating which quests were updated.
 *
 * @property {string}   deleteId - This quest ID which was deleted.
 *
 * @property {string[]} savedIds - The quest IDs of any parent / subquests that were updated.
 */

/**
 * @typedef {object} FilterFunctions
 *
 * @property {Function} IS_OBSERVABLE - Filters by `isObservable` cached in QuestEntry.
 */

/**
 * @typedef {object} QuestDBHooks
 *
 * @property {string}   addedAllQuestEntries Invoked in {@link QuestDB.init} when all quests have been loaded.
 *
 * @property {string}   addQuestEntry Invoked in {@link QuestDB.consistencyCheck} and `#handleJournalEntryUpdate` when a
 * quest is added to the {@link QuestDB}.
 *
 * @property {string}   createQuestEntry Invoked in `#handleJournalEntryCreate` in {@link QuestDB} when a quest is
 * created.
 *
 * @property {string}   deleteQuestEntry Invoked in `#handleJournalEntryDelete` in {@link QuestDB} when a quest is
 * deleted.
 *
 * @property {string}   removedAllQuestEntries Invoked in {@link QuestDB.removeAll} when all quests are removed.
 *
 * @property {string}   removeQuestEntry Invoked in {@link QuestDB.consistencyCheck} and `#handleJournalEntryUpdate`
 * when a quest is removed from the {@link QuestDB}.
 *
 * @property {string}   updateQuestEntry - Invoked in `#handleJournalEntryUpdate` when a quest is updated in
 * {@link QuestDB}.
 */

/**
 * @typedef {object} SortFunctions
 *
 * @property {Function} ALPHA Sort by quest name.
 *
 * @property {Function} DATE_CREATE Sort by quest creation date.
 *
 * @property {Function} DATE_END Sort by quest end date. When status is 'completed' or 'failed'.
 *
 * @property {Function} DATE_START Sort by quest start date. When status is 'active'.
 */

/**
 * @typedef {Record<string, Collection<QuestEntry>>} QuestsCollect Returns an object with keys indexed by
 * {@link questStatus} of CollectJS collections of QuestEntry instances.
 *
 * @property {Collection<QuestEntry>} active Active quest entries CollectJS collections.
 *
 * @property {Collection<QuestEntry>} available Available quests entries CollectJS collections.
 *
 * @property {Collection<QuestEntry>} completed Completed quests entries CollectJS collections.
 *
 * @property {Collection<QuestEntry>} failed Failed quests entries CollectJS collections.
 *
 * @property {Collection<QuestEntry>} hidden Hidden quests entries CollectJS collections.
 */