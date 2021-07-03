import QuestDB from '../control/QuestDB.js';
import Utils   from '../control/Utils.js';

import { constants, questTypes } from './constants.js';

// Stores any Foundry sheet class to be used to render quest. Primarily used in content linking.
let SheetClass;

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class Quest
{
   constructor(data = {}, entry = null)
   {
      this._id = data.id || null;  // Foundry in the TextEditor system to create content links looks for `_id` & name.
      this.initData(data);
      this.entry = entry;
      this.data = data;
   }

   get id()
   {
      return this._id;
   }

   set id(id)
   {
      this._id = id;
   }

   /**
    * True when no players can see or are assigned to the quest.
    *
    * @returns {boolean} Quest is hidden.
    */
   get isHidden()
   {
      let isHidden = true;

      if (this.entry && typeof this.entry.data.permission === 'object')
      {
         if (this.entry.data.permission.default >= CONST.ENTITY_PERMISSIONS.OBSERVER) { return false; }

         for (const [actorId, permission] of Object.entries(this.entry.data.permission))
         {
            if (actorId === 'default') { continue; }

            const actor = game.users.get(actorId);

            if (actor.isGM) { continue; }

            if (permission >= CONST.ENTITY_PERMISSIONS.OBSERVER)
            {
               isHidden = false;
               break;
            }
         }
      }

      return isHidden;
   }

   /**
    * Quests are inactive depending on the available tab / available quests setting. When the available tab is showing
    * quests are only inactive if the quest status is 'hidden' otherwise they are inactive when the status is 'hidden'
    * or 'available'.
    *
    * @returns {boolean} The quest inactive state.
    */
   get isInactive()
   {
      return questTypes.inactive === this.status;
   }

   get isObservable()
   {
      if (game.user.isGM) { return true; }

      const isInactive = this.isInactive;

      // Special handling for trusted player edit who can only see owned quests in the hidden / inactive category.
      if (Utils.isTrustedPlayer() && isInactive) { return this.isOwner; }

      // Otherwise no one can see hidden / inactive quests; perform user permission check for observer.
      return !isInactive && this.entry.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER);
   }

   get isOwner()
   {
      return game.user.isGM ||
       (this.entry && this.entry.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OWNER));
   }

   get isPersonal()
   {
      let isPersonal = false;

      if (this.entry && typeof this.entry.data.permission === 'object' &&
       this.entry.data.permission.default < CONST.ENTITY_PERMISSIONS.OBSERVER)
      {
         for (const [actorId, permission] of Object.entries(this.entry.data.permission))
         {
            if (actorId === 'default') { continue; }

            const actor = game.users.get(actorId);

            if (actor.isGM) { continue; }

            if (permission < CONST.ENTITY_PERMISSIONS.OBSERVER) { continue; }

            isPersonal = true;
            break;
         }
      }

      return isPersonal;
   }

   getPersonalActors()
   {
      if (!this.isPersonal) { return []; }

      const actors = [];

      if (this.entry && typeof this.entry.data.permission === 'object')
      {
         for (const [actorId, permission] of Object.entries(this.entry.data.permission))
         {
            if (actorId === 'default') { continue; }

            const actor = game.users.get(actorId);

            if (actor.isGM) { continue; }

            if (permission < CONST.ENTITY_PERMISSIONS.OBSERVER) { continue; }

            actors.push(actor);
         }
      }

      return actors;
   }

   get name()
   {
      return this._name;
   }

   set name(value)
   {
      this._name =
       typeof value === 'string' && value.length > 0 ? value : game.i18n.localize('ForienQuestLog.NewQuest');
   }

   /**
    * Creates new and adds Reward to reward array of quest.
    *
    * @param data
    */
   addReward(data = {})
   {
      const reward = new Reward(data);
      if (reward.type !== null) { this.rewards.push(reward); }
   }

   /**
    * Creates new and adds Quest to task array of quest.
    *
    * @param questId
    */
   addSubquest(questId)
   {
      this.subquests.push(questId);
   }

   /**
    * Creates new and adds Task to task array of quest.
    *
    * @param data
    */
   addTask(data = {})
   {
      const task = new Task(data);
      if (task.name.length) { this.tasks.push(task); }
   }

   async delete()
   {
      const parentQuest = QuestDB.getQuest(this.parent);
      let parentId = null;

      // Stores the quest IDs which have been saved and need GUI / display aspects updated.
      const savedIds = [];

      // Remove this quest from any parent
      if (parentQuest)
      {
         parentId = parentQuest._id;
         parentQuest.removeSubquest(this._id);
      }

      // Update children to point to any new parent.
      for (const childId of this.subquests)
      {
         const childQuest = QuestDB.getQuest(childId);
         if (childQuest)
         {
            childQuest.parent = parentId;

            await childQuest.save();
            savedIds.push(childQuest._id);

            // Update parent with new subquests.
            if (parentQuest)
            {
               parentQuest.addSubquest(childQuest._id);
            }
         }
      }

      if (parentQuest)
      {
         await parentQuest.save();
         savedIds.push(parentQuest._id);
      }

      if (this.entry)
      {
         await this.entry.delete();
      }

      // Return the delete and saved IDs.
      return {
         deleteId: this._id,
         savedIds
      };
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
    * Returns any stored Foundry sheet class.
    *
    * @returns {*}
    */
   static getSheet() { return SheetClass; }

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
    * @param data
    */
   initData(data)
   {
      this.name = data.name || game.i18n.localize('ForienQuestLog.NewQuest');
      this.status = data.status || questTypes.inactive;
      this.giver = data.giver || null;
      this.giverData = data.giverData || {};
      this.description = data.description || '';
      this.gmnotes = data.gmnotes || '';
      this.image = data.image || 'actor';
      this.giverName = data.giverName || 'actor';
      this.splash = data.splash || '';
      this.splashPos = data.splashPos || 'center';
      this.splashAsIcon = typeof data.splashAsIcon === 'boolean' ? data.splashAsIcon : false;
      this.location = data.location || null;
      this.priority = data.priority || 0;
      this.type = data.type || null;
      this.parent = data.parent || null;
      this.subquests = data.subquests || [];
      this.tasks = Array.isArray(data.tasks) ? data.tasks.map((task) => new Task(task)) : [];
      this.rewards = Array.isArray(data.rewards) ? data.rewards.map((reward) => new Reward(reward)) : [];

      // Sanity check. If status is incorrect set it to hidden.
      if (!questTypes[this.status]) { this.status = questTypes.inactive; }

      if (typeof data.date === 'object')
      {
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
            case questTypes.active:
               this.date.start = Date.now();
               this.date.end = null;
               break;

            case questTypes.completed:
            case questTypes.failed:
               this.date.start = Date.now();
               this.date.end = Date.now();
               break;

            case questTypes.inactive:
            case questTypes.available:
            default:
               this.date.start = null;
               this.date.end = null;
               break;
         }
      }
   }

   /**
    * Moves Quest (and Journal Entry) to different Folder.
    *
    * @param target
    *
    * @returns {Promise<void>}
    */
   async move(target)
   {
      if (!this.entry) { return; }

      this.status = target;

      // Update the tracked date data based on status.
      switch (this.status)
      {
         case questTypes.active:
            this.date.start = Date.now();
            this.date.end = null;
            break;

         case questTypes.completed:
         case questTypes.failed:
            this.date.end = Date.now();
            break;

         case questTypes.inactive:
         case questTypes.available:
         default:
            this.date.start = null;
            this.date.end = null;
            break;
      }

      await this.entry.update({
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      });

      return this._id;
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
    * Deletes Task from Quest.
    *
    * @param {number} questId
    */
   removeSubquest(questId)
   {
      this.subquests = this.subquests.filter((id) => id !== questId);
   }

   /**
    * Deletes Task from Quest by UUIDv4.
    *
    * @param {string} uuidv4 - The UUIDv4 associated with a Task.
    *
    * @see {Utils.uuidv4}
    */
   removeTask(uuidv4)
   {
      const index = this.tasks.findIndex((t) => t.uuidv4 === uuidv4);
      if (index >= 0) { this.tasks.splice(index, 1); }
   }

   /**
    * Saves Quest to JournalEntry's content, and if needed, moves JournalEntry to different folder.
    * Can also update JournalEntry's permissions.
    *
    * @returns {Promise<string>} The ID of the quest saved.
    */
   async save()
   {
      const entry = this.entry ? this.entry : game.journal.get(this._id);

      // If the entry doesn't exist or the user can't modify the journal entry via ownership then early out.
      if (!entry || !entry.canUserModify(game.user, 'update')) { return; }

      // Save Quest JSON, but also potentially update the backing JournalEntry folder name.
      const update = {
         name: typeof this._name === 'string' && this._name.length > 0 ? this._name :
          game.i18n.localize('ForienQuestLog.NewQuest'),
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      };

      this.entry = await entry.update(update, { diff: false });

      return this._id;
   }

   /**
    * Sets any stored Foundry sheet class.
    *
    * @returns {*}
    */
   static setSheet(NewSheetClass) { SheetClass = NewSheetClass; }

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

   toJSON()
   {
      return {
         name: this._name,
         status: this.status,
         giver: this.giver,
         giverData: this.giverData,
         description: this.description,
         gmnotes: this.gmnotes,
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
    * @type {string}
    */
   static get documentName()
   {
      return 'Quest';
   }

   get documentName()
   {
      return 'Quest';
   }

   /**
    * This mirrors document.sheet and is used in TextEditor._onClickContentLink
    *
    * @returns {object} An associated sheet instance.
    */
   get sheet()
   {
      return SheetClass ? new SheetClass(this) : void 0;
   }

   /**
    * Test whether a certain User has a requested permission level (or greater) over the Document.
    * This mirrors document.testUserPermission and forwards on the request to the backing journal entry.
    *
    * @param {documents.BaseUser} user       The User being tested
    *
    * @param {string|number} permission      The permission level from ENTITY_PERMISSIONS to test
    *
    * @param {object} options                Additional options involved in the permission test
    *
    * @param {boolean} [options.exact=false]     Require the exact permission level requested?
    *
    * @returns {boolean}                      Does the user have this permission level over the Document?
    */
   testUserPermission(user, permission, options)
   {
      const entry = game.journal.get(this._id);
      return entry.testUserPermission(user, permission, options);
   }
}

/**
 * Rewards can be either an item from a Foundry VTT compendium / world item or be an abstract reward. It should be
 * noted that FVTT item data will have a Foundry VTT UUID, but abstract rewards entered by the user will have a UUIDv4
 * generated for them. This UUID regardless of type is accessible in `this.uuid`.
 *
 */
class Reward
{
   constructor(data = {})
   {
      this.type = data.type || null;
      this.data = data.data || {};
      this.hidden = typeof data.hidden === 'boolean' ? data.hidden : false;
      this.locked = typeof data.locked === 'boolean' ? data.locked : true;
      this.uuidv4 = data.uuidv4 || Utils.uuidv4();
   }

   get name() { return this.data.name; }

   get uuid() { return this.data.uuid; }

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

   toggleLocked()
   {
      this.locked = !this.locked;
      return this.locked;
   }

   toggleVisible()
   {
      this.hidden = !this.hidden;
      return this.hidden;
   }
}

class Task
{
   constructor(data = {})
   {
      this.name = data.name || null;
      this.completed = data.completed || false;
      this.failed = data.failed || false;
      this.hidden = data.hidden || false;
      this.uuidv4 = data.uuidv4 || Utils.uuidv4();
   }

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

   toggleVisible()
   {
      this.hidden = !this.hidden;

      return this.hidden;
   }
}