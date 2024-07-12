import {
   FVTTCompat,
   Utils }                    from '../control/index.js';

import { QuestPreviewShim }   from '../view/index.js';

import {
   constants,
   questStatus,
   settings }                 from './constants.js';

/**
 * Stores and makes accessible the minimum amount of data that defines a quest. A Quest is loaded from the backing
 * JournalEntry and has the JournalEntry stored for the ability to perform permissions checks. Please see QuestDB
 * as when a Quest is loaded it is stored in a QuestEntry which also contains the enriched quest data for display
 * in Handlebars templates along with caching of several of the methods available in Quest for fast sorting.
 *
 * {@link Quest.giverFromQuest} / {@link Quest.giverFromUUID} are used in {@link HandlerDetails} to look up
 * and store the quest giver image / name in {@link Quest.giverData} when a quest giver is set.
 *
 * @see QuestDB
 * @see QuestEntry
 */
export class Quest
{
   /**
    * Stores the sheet class for Quest which is {@link QuestPreview}. This class / sheet is used to render Quest.
    * While directly accessible from Quest the main way a QuestPreview is shown is through {@link QuestAPI.open} which
    * provides the entry point for external API access and is also used internally when opening a quest.
    *
    * @type {typeof Application}
    * @see Quest.sheet
    */
   static #SheetClass;

   /**
    * The backing JournalEntry document.
    *
    * @type {JournalEntry}
    */
   #entry;

   /** @type {string | null} */
   #id;

   /** @type {string} */
   #name;

   /**
    * Lookup the Quest giver by UUID and return the data stored in {@link Quest.giverData}.
    *
    * @param {Quest} quest - The quest to look up the quest giver.
    *
    * @returns {Promise<QuestImgNameData|null>} The image / name data associated with this Foundry UUID.
    */
   static async giverFromQuest(quest)
   {
      let data = null;

      if (quest.giver === 'abstract')
      {
         data = {
            name: quest.giverName,
            img: quest.image,
            hasTokenImg: false
         };
      }
      else if (typeof quest.giver === 'string')
      {
         data = Quest.giverFromUUID(quest.giver, quest.image);
      }

      return data;
   }

   /**
    * @param {string}   uuid - The Foundry UUID to lookup for image / name data.
    *
    * @param {string}   [imageType] - The image type: 'actor' or 'token'
    *
    * @returns {Promise<QuestImgNameData|null>} The image / name data associated with this Foundry UUID.
    */
   static async giverFromUUID(uuid, imageType = 'actor')
   {
      let data = null;

      if (typeof uuid === 'string')
      {
         const document = await fromUuid(uuid);

         if (document !== null)
         {
            switch (document.documentName)
            {
               case Actor.documentName:
               {
                  const actorImage = document.img;
                  const tokenImage = FVTTCompat.tokenImg(document);

                  const hasTokenImg = typeof tokenImage === 'string' && tokenImage !== actorImage;

                  data = {
                     uuid,
                     name: document.name,
                     img: imageType === 'token' && hasTokenImg ? tokenImage : actorImage,
                     hasTokenImg
                  };
                  break;
               }

               case Item.documentName:
                  data = {
                     uuid,
                     name: document.name,
                     img: document.img,
                     hasTokenImg: false
                  };
                  break;

               case JournalEntry.documentName:
                  data = {
                     uuid,
                     name: document.name,
                     img: FVTTCompat.journalImage(document),
                     hasTokenImg: false
                  };
                  break;
            }
         }
      }

      return data;
   }

   /**
    * @param {QuestData}      data - The serialized quest data to set.
    *
    * @param {JournalEntry}   entry - The associated Foundry JournalEntry.
    */
   constructor(data = {}, entry = null)
   {
      this.#id = entry !== null ? entry.id : null;

      this.initData(data);

      this.#entry = entry;

      if (this.#entry && this.#id !== null)
      {
         this.#entry._sheet = new QuestPreviewShim(this.#id);
      }
   }

   /**
    * @returns {boolean} Returns whether the current user can update the backing journal document.
    */
   get canUserUpdate()
   {
      const entry = this.entry ? this.entry : game.journal.get(this.#id);

      return entry?.canUserModify?.(game.user, 'update') ?? false;
   }

   /**
    * @returns {JournalEntry} The associated backing journal entry document.
    */
   get entry()
   {
      return this.#entry;
   }

   /**
    * Gets the Foundry ID associated with this Quest.
    *
    * @returns {string} The ID of the quest.
    */
   get id()
   {
      return this.#id;
   }

   /**
    * Sets the associated backing journal entry document.
    *
    * @param {JournalEntry}   entry - A journal entry document.
    */
   set entry(entry)
   {
      this.#entry = entry;
   }

   /**
    * Sets the Foundry ID of the quest.
    *
    * @param {string}   id - A Foundry ID.
    */
   set id(id)
   {
      this.#id = id;
   }

   /**
    * @returns {boolean} Is the quest active / in progress.
    */
   get isActive()
   {
      return questStatus.active === this.status;
   }

   /**
    * True when no players have OBSERVER or OWNER permissions for this quest.
    *
    * @returns {boolean} Quest is hidden.
    */
   get isHidden()
   {
      let isHidden = true;

      if (this.entry && typeof FVTTCompat.ownership(this.entry) === 'object')
      {
         if (FVTTCompat.ownership(this.entry).default >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) { return false; }

         for (const [userId, permission] of Object.entries(FVTTCompat.ownership(this.entry)))
         {
            if (userId === 'default') { continue; }

            const user = game.users.get(userId);

            if (!user || user.isGM) { continue; }

            if (permission >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
            {
               isHidden = false;
               break;
            }
         }
      }

      return isHidden;
   }

   /**
    * @returns {boolean} Is the quest in the inactive state.
    */
   get isInactive()
   {
      return questStatus.inactive === this.status;
   }

   /**
    * Returns true if this quest is observable for the given player. For trusted player edit when the status is
    * `inactive` the test is ownership instead of simply OBSERVER or higher.
    *
    * @returns {boolean} Is the quest observable.
    */
   get isObservable()
   {
      if (game.user.isGM) { return true; }

      const isInactive = this.isInactive;

      // Special handling for trusted player edit who can only see owned quests in the hidden / inactive category.
      if (Utils.isTrustedPlayerEdit() && isInactive) { return this.isOwner; }

      // Otherwise no one can see hidden / inactive quests; perform user permission check for observer.
      return !isInactive && this.entry.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER);
   }

   /**
    * Gets whether the current user has owner permissions.
    *
    * @returns {boolean} Is owner.
    */
   get isOwner()
   {
      return game.user.isGM ||
       (this.entry && this.entry.testUserPermission(game.user, CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER));
   }

   /**
    * Gets whether this quest is a personal quest. A personal quest has one or more players with OBSERVER or OWNER
    * permissions.
    *
    * @returns {boolean} Is this quest personal.
    */
   get isPersonal()
   {
      let isPersonal = false;

      if (this.entry && typeof FVTTCompat.ownership(this.entry) === 'object' &&
       FVTTCompat.ownership(this.entry).default < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER)
      {
         for (const [userId, permission] of Object.entries(FVTTCompat.ownership(this.entry)))
         {
            if (userId === 'default') { continue; }

            const user = game.users.get(userId);

            if (!user || user.isGM) { continue; }

            if (permission < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) { continue; }

            isPersonal = true;
            break;
         }
      }

      return isPersonal;
   }

   /**
    * Returns whether this quest is set as the primary quest.
    *
    * @returns {boolean} Primary quest state.
    */
   get isPrimary()
   {
      return this.#id === game.settings.get(constants.moduleName, settings.primaryQuest);
   }

   /**
    * Gets the name of the quest.
    *
    * @returns {string} Quest name.
    */
   get name()
   {
      return this.#name;
   }

   /**
    * Sets the name of the quest.
    *
    * @param {string}   value - The new name.
    */
   set name(value)
   {
      this.#name = typeof value === 'string' && value.length > 0 ? value :
       game.i18n.localize('ForienQuestLog.API.QuestDB.Labels.NewQuest');
   }

   /**
    * Creates a new Reward and pushes to the reward array.
    *
    * @param {object}   data - The reward data.
    */
   addReward(data = {})
   {
      const reward = new Reward(data);
      if (reward.type !== null) { this.rewards.push(reward); }
   }

   /**
    * Pushes a subquest ID to the subquest array.
    *
    * @param {string}   questId - A Foundry ID
    */
   addSubquest(questId)
   {
      if (!this.subquests.includes(questId))
      {
         this.subquests.push(questId);
      }
   }

   /**
    * Creates a new Task and pushes to the task array.
    *
    * @param {object}   data - Task data.
    */
   addTask(data = {})
   {
      const task = new Task(data);
      if (task.name && task.name.length) { this.tasks.push(task); }
   }

   /**
    * Gets all adjacent quest IDs including self. This includes any parent and subquests.
    *
    * @returns {string[]} All adjacent quests including self.
    */
   getQuestIds()
   {
      return this.parent ? [this.parent, this.id, ...this.subquests] : [this.id, ...this.subquests];
   }

   /**
    * Gets a Reward by Foundry VTT UUID or UUIDv4 for abstract Rewards.
    *
    * @param {string}   uuidv4 - The FVTT UUID to find.
    *
    * @returns {Reward} The task or null.
    */
   getReward(uuidv4)
   {
      const index = this.rewards.findIndex((t) => t.uuidv4 === uuidv4);
      return index >= 0 ? this.rewards[index] : null;
   }

   /**
    * Returns a list of Actor data for whom this quest is personal.
    *
    * @returns {object[]} A list of actors who are assigned to this quest.
    */
   getPersonalActors()
   {
      if (!this.isPersonal) { return []; }

      const users = [];

      if (this.entry && typeof FVTTCompat.ownership(this.entry) === 'object')
      {
         for (const [userId, permission] of Object.entries(FVTTCompat.ownership(this.entry)))
         {
            if (userId === 'default') { continue; }

            const user = game.users.get(userId);

            if (!user || user.isGM) { continue; }

            if (permission < CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER) { continue; }

            users.push(user);
         }
      }

      return users;
   }

   /**
    * Returns any stored Foundry sheet class.
    *
    * @returns {typeof Application} The associated sheet class.
    */
   static getSheet() { return Quest.#SheetClass; }

   /**
    * Gets a task by UUID v4.
    *
    * @param {string}   uuidv4 - The UUID v4 to find.
    *
    * @returns {Task} The task or null.
    */
   getTask(uuidv4)
   {
      const index = this.tasks.findIndex((t) => t.uuidv4 === uuidv4);
      return index >= 0 ? this.tasks[index] : null;
   }

   /**
    * Normally would be in constructor(), but is extracted for usage in different methods as well
    *
    * @param {QuestData}   data - The serialized Quest data to initialize.
    */
   initData(data)
   {
      this.name = data.name || game.i18n.localize('ForienQuestLog.API.QuestDB.Labels.NewQuest');

      /**
       * @type {string}
       */
      this.status = data.status || questStatus.inactive;

      /**
       * @type {string|null}
       */
      this.giver = data.giver || null;

      /**
       * @type {object|null}
       */
      this.giverData = data.giverData || null;

      /**
       * @type {string}
       */
      this.description = data.description || '';

      /**
       * @type {string}
       */
      this.gmnotes = data.gmnotes || '';

      /**
       * @type {string}
       */
      this.image = data.image || 'actor';

      /**
       * @type {string}
       */
      this.giverName = data.giverName || 'actor';

      /**
       * @type {string}
       */
      this.splash = data.splash || '';

      /**
       * @type {string}
       */
      this.splashPos = data.splashPos || 'center';

      /**
       * @type {boolean}
       */
      this.splashAsIcon = typeof data.splashAsIcon === 'boolean' ? data.splashAsIcon : false;

      /**
       * @type {string|null}
       */
      this.location = data.location || null;

      /**
       * @type {string}
       */
      this.playernotes = data.playernotes || '';

      /**
       * @type {number}
       */
      this.priority = data.priority || 0;

      /**
       * @type {string|null}
       */
      this.type = data.type || null;

      /**
       * @type {string|null}
       */
      this.parent = data.parent || null;

      /**
       * @type {string[]}
       */
      this.subquests = data.subquests || [];

      /**
       * @type {Task[]}
       */
      this.tasks = Array.isArray(data.tasks) ? data.tasks.map((task) => new Task(task)) : [];

      /**
       * @type {Reward[]}
       */
      this.rewards = Array.isArray(data.rewards) ? data.rewards.map((reward) => new Reward(reward)) : [];

      // Sanity check. If status is incorrect set it to inactive.
      if (!questStatus[this.status]) { this.status = questStatus.inactive; }

      if (typeof data.date === 'object')
      {
         /**
          * Provides timestamps for quest create, start, end.
          *
          * @type {{start: (number|null), create: (number|null), end: (number|null)}}
          */
         this.date = {
            create: typeof data.date.create === 'number' ? data.date.create : null,
            start: typeof data.date.start === 'number' ? data.date.start : null,
            end: typeof data.date.end === 'number' ? data.date.end : null
         };
      }
      else
      {
         this.date = {
            create: Date.now(),
         };

         switch (this.status)
         {
            case questStatus.active:
               this.date.start = Date.now();
               this.date.end = null;
               break;

            case questStatus.completed:
            case questStatus.failed:
               this.date.start = Date.now();
               this.date.end = Date.now();
               break;

            case questStatus.inactive:
            case questStatus.available:
            default:
               this.date.start = null;
               this.date.end = null;
               break;
         }
      }
   }

   /**
    * Deletes Reward from Quest.
    *
    * @param {string} uuidv4 - The UUIDv4 associated with a Reward.
    */
   removeReward(uuidv4)
   {
      const index = this.rewards.findIndex((t) => t.uuidv4 === uuidv4);
      if (index >= 0) { this.rewards.splice(index, 1); }
   }

   /**
    * Removes subquest from Quest.
    *
    * @param {string} questId - The subquest ID to remove.
    */
   removeSubquest(questId)
   {
      this.subquests = this.subquests.filter((id) => id !== questId);
   }

   /**
    * Removes the task from this quest by UUIDv4.
    *
    * @param {string} uuidv4 - The UUIDv4 associated with a Task.
    *
    * @see Utils.uuidv4
    */
   removeTask(uuidv4)
   {
      const index = this.tasks.findIndex((t) => t.uuidv4 === uuidv4);
      if (index >= 0) { this.tasks.splice(index, 1); }
   }

   /**
    * Resets the quest giver.
    */
   resetGiver()
   {
      this.giver = null;
      this.image = 'actor';
      this.giverData = null;
      this.giverName = 'actor';
   }

   /**
    * Saves Quest to JournalEntry's content, and if needed, moves JournalEntry to different folder.
    * Can also update JournalEntry's permissions.
    *
    * @returns {Promise<string|void>} The ID of the quest saved or undefined if user couldn't save the quest.
    */
   async save()
   {
      const entry = this.entry ? this.entry : game.journal.get(this.#id);

      // If the entry doesn't exist or the user can't update the journal entry via ownership then early out.
      if (!entry || !this.canUserUpdate) { return; }

      // Save Quest JSON, but also potentially update the backing JournalEntry folder name.
      const update = {
         name: typeof this.#name === 'string' && this.#name.length > 0 ? this.#name :
          game.i18n.localize('ForienQuestLog.API.QuestDB.Labels.NewQuest'),
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      };

      this.entry = await entry.update(update, { diff: false });

      return this.#id;
   }

   /**
    * Sets any stored Foundry sheet class.
    *
    * @param {typeof Application}   NewSheetClass - The sheet class.
    */
   static setSheet(NewSheetClass) { Quest.#SheetClass = NewSheetClass; }

   /**
    * Sets new status for the quest. Also updates any timestamp / date data depending on status set.
    *
    * @param {string}   target - The target status to set.
    *
    * @returns {Promise<void>}
    */
   async setStatus(target)
   {
      if (!this.entry || !questStatus[target]) { return; }

      this.status = target;

      // Update the tracked date data based on status.
      switch (this.status)
      {
         case questStatus.active:
            this.date.start = Date.now();
            this.date.end = null;
            break;

         case questStatus.completed:
         case questStatus.failed:
            this.date.end = Date.now();
            break;

         case questStatus.inactive:
         case questStatus.available:
         default:
            this.date.start = null;
            this.date.end = null;
            break;
      }

      // Potentially reset any tracked primary quest when the status is no longer active.
      if (this.status !== questStatus.active)
      {
         const primaryQuestId = game.settings.get(constants.moduleName, settings.primaryQuest);
         if (this.#id === primaryQuestId)
         {
            await game.settings.set(constants.moduleName, settings.primaryQuest, '');
         }
      }

      await this.entry.update({
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      });

      return this.#id;
   }

   /**
    * Locates and swaps the rewards indicated by the source and target UUIDv4s provided.
    *
    * @param {string}   sourceUuidv4 - The source UUIDv4
    *
    * @param {string}   targetUuidv4 - The target UUIDv4
    */
   sortRewards(sourceUuidv4, targetUuidv4)
   {
      const index = this.rewards.findIndex((t) => t.uuidv4 === sourceUuidv4);
      const targetIdx = this.rewards.findIndex((t) => t.uuidv4 === targetUuidv4);

      if (index >= 0 && targetIdx >= 0)
      {
         const entry = this.rewards.splice(index, 1)[0];
         this.rewards.splice(targetIdx, 0, entry);
      }
   }

   /**
    * Locates and swaps the tasks indicated by the source and target UUIDv4s provided.
    *
    * @param {string}   sourceUuidv4 - The source UUIDv4
    *
    * @param {string}   targetUuidv4 - The target UUIDv4
    */
   sortTasks(sourceUuidv4, targetUuidv4)
   {
      // If there are sub quests in the objectives above tasks then an undefined targetUuidv4 can occur.
      if (!targetUuidv4) { return; }

      const index = this.tasks.findIndex((t) => t.uuidv4 === sourceUuidv4);
      const targetIdx = this.tasks.findIndex((t) => t.uuidv4 === targetUuidv4);

      if (index >= 0 && targetIdx >= 0)
      {
         const entry = this.tasks.splice(index, 1)[0];
         this.tasks.splice(targetIdx, 0, entry);
      }
   }

   /**
    * @returns {QuestData} The serialized JSON for this Quest.
    */
   toJSON()
   {
      return {
         name: this.#name,
         status: this.status,
         giver: this.giver,
         giverData: this.giverData,
         description: this.description,
         gmnotes: this.gmnotes,
         playernotes: this.playernotes,
         image: this.image,
         giverName: this.giverName,
         splash: this.splash,
         splashPos: this.splashPos,
         splashAsIcon: this.splashAsIcon,
         location: this.location,
         priority: this.priority,
         type: this.type,
         parent: this.parent,
         subquests: this.subquests,
         tasks: this.tasks,
         rewards: this.rewards,
         date: this.date
      };
   }

   /**
    * Toggles Actor image between sheet's and token's images
    */
   toggleImage()
   {
      this.image = this.image === 'actor' ? 'token' : 'actor';
   }

// Document simulation -----------------------------------------------------------------------------------------------

   /**
    * The canonical name of this Document type, for example "Actor".
    *
    * @returns {string} The document name.
    */
   static get documentName()
   {
      return 'Quest';
   }

   /**
    * The canonical name of this Document type, for example "Actor".
    *
    * @returns {string} The document name.
    */
   get documentName()
   {
      return 'Quest';
   }

   /**
    * This mirrors document.sheet and constructs a new instance of the sheet class.
    *
    * @returns {Application} An associated sheet instance.
    */
   get sheet()
   {
      const SheetClass = Quest.#SheetClass;

      return SheetClass ? new SheetClass(this) : void 0;
   }
}

/**
 * Rewards can be either an item from a Foundry VTT compendium / world item or be an abstract reward. It should be
 * noted that FVTT item data will have a Foundry VTT UUID, but abstract rewards entered by the user will have a UUIDv4
 * generated for them. This UUID regardless of type is accessible in `this.uuid`.
 *
 */
export class Reward
{
   /**
    * @param {object}   data - Serialized reward data.
    */
   constructor(data = {})
   {
      /**
       * @type {string|null}
       */
      this.type = data.type || null;

      /**
       * @type {object}
       */
      this.data = data.data || {};

      /**
       * @type {boolean}
       */
      this.hidden = typeof data.hidden === 'boolean' ? data.hidden : false;

      /**
       * @type {boolean}
       */
      this.locked = typeof data.locked === 'boolean' ? data.locked : true;

      /**
       * @type {string}
       */
      this.uuidv4 = data.uuidv4 || Utils.uuidv4();
   }

   /**
    * Returns the name of the reward.
    *
    * @returns {string} Reward name.
    */
   get name() { return this.data.name; }

   /**
    * Returns the Foundry UUID associated with this reward. Abstract rewards do not have a Foundry UUID.
    *
    * @returns {string|void} The Foundry UUID.
    */
   get uuid() { return this.data.uuid; }

   /**
    * Serializes this reward.
    *
    * @returns {object} A JSON object.
    */
   toJSON()
   {
      return JSON.parse(JSON.stringify({
         type: this.type,
         data: this.data,
         hidden: this.hidden,
         locked: this.locked,
         uuidv4: this.uuidv4
      }));
   }

   /**
    * Toggles the locked status.
    *
    * @returns {boolean} Current locked status.
    */
   toggleLocked()
   {
      this.locked = !this.locked;
      return this.locked;
   }

   /**
    * Toggles the hidden status.
    *
    * @returns {boolean} Current hidden status.
    */
   toggleVisible()
   {
      this.hidden = !this.hidden;
      return this.hidden;
   }
}

/**
 * Encapsulates an objective / task.
 */
export class Task
{
   /**
    * @param {object}   data - The task data.
    */
   constructor(data = {})
   {
      /**
       * @type {string|null}
       */
      this.name = data.name || null;

      /**
       * @type {boolean}
       */
      this.completed = data.completed || false;

      /**
       * @type {boolean}
       */
      this.failed = data.failed || false;

      /**
       * @type {boolean}
       */
      this.hidden = data.hidden || false;

      /**
       * @type {string}
       */
      this.uuidv4 = data.uuidv4 || Utils.uuidv4();
   }

   /**
    * Gets the current CSS class based on state.
    *
    * @returns {string} CSS class
    */
   get state()
   {
      if (this.completed)
      {
         return 'check-square';
      }
      else if (this.failed)
      {
         return 'minus-square';
      }
      return 'square';
   }

   /**
    * Serializes the task.
    *
    * @returns {object} JSON object.
    */
   toJSON()
   {
      return JSON.parse(JSON.stringify({
         name: this.name,
         completed: this.completed,
         failed: this.failed,
         hidden: this.hidden,
         state: this.state,
         uuidv4: this.uuidv4
      }));
   }

   /**
    * Toggles the task state between completed, failed, incomplete.
    */
   toggle()
   {
      if (this.completed === false && this.failed === false)
      {
         this.completed = true;
      }
      else if (this.completed === true)
      {
         this.failed = true;
         this.completed = false;
      }
      else
      {
         this.failed = false;
      }
   }

   /**
    * Toggles the hidden state.
    *
    * @returns {boolean} Current hidden state.
    */
   toggleVisible()
   {
      this.hidden = !this.hidden;

      return this.hidden;
   }
}

/**
 * @typedef {object} QuestData
 *
 * @property {string}            name - The quest name.
 *
 * @property {string}            status - The quest status; one of {@link questStatus}.
 *
 * @property {string|null}       giver - The Foundry UUID or 'abstract' for a custom source.
 *
 * @property {QuestImgNameData}  giverData - The Foundry image / name data looked up by UUID.
 *
 * @property {string}            description - The quest description.
 *
 * @property {string}            gmnotes - The GM Notes.
 *
 * @property {string}            image - `actor` or `token` for UUID based givers or the image link for custom source.
 *
 * @property {string}            giverName - The name of the quest giver.
 *
 * @property {string}            splash - The splash image.
 *
 * @property {string}            splashPos - The splash position (top, center, bottom).
 *
 * @property {boolean}           splashAsIcon - Use the splash image as the quest icon.
 *
 * @property {string|null}       location - Unused / future use for quest location.
 *
 * @property {string}            playernotes - The Player Notes.
 *
 * @property {number}            priority - Unused / future use for quest priority sorting.
 *
 * @property {string|null}       type - Unused / future use for sorting type of quest.
 *
 * @property {string|null}       parent - The parent quest ID.
 *
 * @property {string[]}          subquests - An array of quest IDs that are subquests.
 *
 * @property {QuestTaskData[]}   tasks - An array of tasks.
 *
 * @property {QuestRewardData[]} rewards - An array of rewards.
 *
 * @property {QuestDateData}     date - The create, end, start dates of the quest.
 */

/**
 * @typedef QuestDateData
 *
 * @property {number|null} create - Time ms since 1970 / Date.now() when quest was created.
 *
 * @property {number|null} end - Time ms since 1970 / Date.now() when quest ended (status: failed / complete).
 *
 * @property {number|null} start - Time ms since 1970 / Date.now() when quest was started (status: active).
 */

/**
 * @typedef QuestRewardData
 *
 * @property {string}   type - Reward type.
 *
 * @property {QuestRewardAddData}   data - Reward add data.
 *
 * @property {boolean}  hidden - Reward hidden.
 *
 * @property {boolean}  locked - Reward locked.
 *
 * @property {string}   uuidv4 - The FQL UUIDv4 / unique ID.
 */

/**
 * @typedef QuestRewardAddData
 *
 * @property {string}            type - Reward type.
 *
 * @property {QuestImgNameData}  data - Reward image / name from {@link Enrich.giverFromUUID}.
 *
 * @property {boolean}           hidden - Reward hidden.
 */

/**
 * @typedef QuestTaskData
 *
 * @property {string}   name - Task name.
 *
 * @property {boolean}  completed - Task completed.
 *
 * @property {boolean}  failed - Task failed.
 *
 * @property {boolean}  hidden - Task hidden.
 *
 * @property {string}   state - Task state.
 *
 * @property {string}   uuidv4 - The FQL UUIDv4 / unique ID.
 */

