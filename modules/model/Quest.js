import Fetch                     from '../control/Fetch.js';
import Socket                    from '../control/Socket.js';
import QuestPreview              from '../view/QuestPreview.js';
import { constants, questTypes } from './constants.js';

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class Quest
{
   constructor(data = {}, entry = null)
   {
      this.id = data.id || null;
      this.initData(data);
      this.entry = entry;
      this._data = data;
   }

   get name()
   {
      return this._title;
   }

   get title()
   {
      return this._title;
   }

   set title(value)
   {
      this._title =
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
      const parentQuest = Fetch.quest(this.parent);
      let parentId = null;

      // Remove this quest from any parent
      if (parentQuest)
      {
         parentId = parentQuest.id;
         parentQuest.removeSubquest(this.id);
      }

      // Update children to point to any new parent.
      for (const childId of this.subquests)
      {
         const childQuest = Fetch.quest(childId);
         if (childQuest)
         {
            childQuest.parent = parentId;
            await childQuest.save();
            Socket.refreshQuestPreview(childQuest.id);

            // Update parent with new subquests.
            if (parentQuest)
            {
               parentQuest.addSubquest(childQuest.id);
            }
         }
      }

      if (parentQuest)
      {
         await parentQuest.save();
         Socket.refreshQuestPreview(parentQuest.id);
      }

      if (this.entry)
      {
         await this.entry.delete();
      }

      Socket.closeQuest(this.id);
      Socket.refreshQuestLog();
   }

   /**
    * Normally would be in constructor(), but is extracted for usage in different methods as well
    *
    * @param data
    *
    * @see refresh()
    */
   initData(data)
   {
      this.giver = data.giver || null;
      this._title = data.title || game.i18n.localize('ForienQuestLog.NewQuest');
      this.status = data.status || 'hidden';
      this.description = data.description || '';
      this.gmnotes = data.gmnotes || '';
      this.image = data.image || 'actor';
      this.giverName = data.giverName || 'actor';
      this.giverImgPos = data.giverImgPos || 'center';
      this.splash = data.splash || '';
      this.splashPos = data.splashPos || 'center';
      this.personal = data.personal || false;
      this.parent = data.parent || null;
      this.permission = data.permission || 0;
      this.subquests = data.subquests || [];
      this.tasks = [];
      this.rewards = [];
      this.tasks = Array.isArray(data.tasks) ? data.tasks.map((task) => new Task(task)) : [];
      this.rewards = Array.isArray(data.rewards) ? data.rewards.map((reward) => new Reward(reward)) : [];
   }

   /**
    * Moves Quest (and Journal Entry) to different Folder and updates permissions if needed.
    *
    * @param target
    *
    * @param permission
    *
    * @returns {Promise<void>}
    */
   async move(target, permission = void 0)
   {
      // TODO: REMOVE WHEN ALL QUESTS HAVE JOURNAL ENTRIES GUARANTEED
      if (!this.entry) { return; }

      if (permission === void 0)
      {
         permission = this.entry.data.permission;
      }

      if (!this.personal)
      {
         if (permission.default < CONST.ENTITY_PERMISSIONS.OWNER)
         {
            if (target === 'hidden')
            {
               permission = { default: CONST.ENTITY_PERMISSIONS.NONE };
            }
            else
            {
               permission = { default: CONST.ENTITY_PERMISSIONS.OBSERVER };
            }
         }
      }

      this.status = target;

      await this.entry.update({
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         },
         permission
      });

      Socket.refreshQuestLog();
      Socket.refreshQuestPreview(this.id);

      const dirname = game.i18n.localize(questTypes[target]);

      ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved', { target: dirname }), {});
   }

   /**
    * Refreshes data without need of destroying and reinstantiating Quest object
    */
   refresh()
   {
      const entry = game.journal.get(this.id);
      const content = Fetch.content(entry);

      this.initData(content);
   }

   /**
    * Deletes Reward from Quest
    *
    * @param {number} index
    */
   removeReward(index)
   {
      if (this.rewards[index] !== void 0) { this.rewards.splice(index, 1); }
   }

   /**
    * Deletes Task from Quest
    *
    * @param {number} questId
    */
   removeSubquest(questId)
   {
      this.subquests = this.subquests.filter((id) => id !== questId);
   }

   /**
    * Deletes Task from Quest
    *
    * @param {number} index
    */
   removeTask(index)
   {
      if (this.tasks[index] !== void 0) { this.tasks.splice(index, 1); }
   }

   /**
    * Saves Quest to JournalEntry's content, and if needed, moves JournalEntry to different folder.
    * Can also update JournalEntry's permissions.
    *
    * @returns {Promise<void>}
    */
   async save()
   {
      const entry = game.journal.get(this.id);

      // If the entry doesn't exist or the user can't modify the journal entry via ownership then early out.
      if (!entry || !entry.canUserModify(game.user, 'update')) { return; }

      const update = {
         name: typeof this._title === 'string' && this._title.length > 0 ? this._title :
          game.i18n.localize('ForienQuestLog.NewQuest'),
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      };

      if (this.entryPermission !== void 0)
      {
         update.permission = this.entryPermission;
      }

      await entry.update(update, { diff: false });

      return this.id;
   }

   /**
    * TODO REVIEW - OLD PERMISSION SYSTEM - LIKELY REMOVE
    * Saves new permissions for users. Used by Personal Quests feature.
    *
    * @param userId
    *
    * @param permission
    */
   savePermission(userId, permission)
   {
      if ([
         CONST.ENTITY_PERMISSIONS.OWNER,
         CONST.ENTITY_PERMISSIONS.OBSERVER,
         CONST.ENTITY_PERMISSIONS.NONE
      ].includes(permission) === false)
      {
         return;
      }

      const entryData = duplicate(game.journal.get(this.id));
      let permissionData;

      if (userId === '*')
      {
         permissionData = entryData.permission;
      }
      else
      {
         permissionData = { [userId]: userId };
      }

      for (const p in permissionData)
      {
         if (this.personal && p === 'default')
         {
            continue;
         }
         if (p !== 'default')
         {
            const user = game.users.get(p);
            if (user === null)
            {
               delete entryData.permission[p];
               continue;
            }
         }

         if (permission === CONST.ENTITY_PERMISSIONS.NONE && p !== 'default')
         {
            delete entryData.permission[p];
         }
         else
         {
            entryData.permission[p] = permission;
         }
      }

      this.entryPermission = entryData.permission;
   }

   sortRewards(index, targetIdx)
   {
      const entry = this.rewards.splice(index, 1)[0];
      if (targetIdx) { this.rewards.splice(targetIdx, 0, entry); }
      else { this.rewards.push(entry); }
   }

   sortTasks(index, targetIdx)
   {
      const entry = this.tasks.splice(index, 1)[0];
      if (targetIdx) { this.tasks.splice(targetIdx, 0, entry); }
      else { this.tasks.push(entry); }
   }

   toJSON()
   {
      return {
         giver: this.giver,
         title: this._title,
         status: this.status,
         description: this.description,
         gmnotes: this.gmnotes,
         personal: this.personal,
         image: this.image,
         giverName: this.giverName,
         giverImgPos: this.giverImgPos,
         splashPos: this.splashPos,
         splash: this.splash,
         parent: this.parent,
         subquests: this.subquests,
         tasks: this.tasks,
         rewards: this.rewards
      };
   }

   /**
    * Toggles Actor image between sheet's and token's images
    */
   toggleImage()
   {
      this.image = this.image === 'actor' ? 'token' : 'actor';
   }

   /**
    * Toggles quest between Public and Personal. In both cases, it hides the quest from everyone.
    * If new status is public, then hide it.
    */
   togglePersonal()
   {
      this.personal = !this.personal;
      this.entryPermission = { default: 0 };
      if (!this.personal) { this.status = 'hidden'; }
   }

   /**
    * Toggles visibility of Reward
    *
    * @param {number}   index - Reward index
    */
   toggleReward(index)
   {
      this.rewards[index]?.toggleVisible();
   }

   /**
    * Toggles visibility of Task
    *
    * @param {number}   index - Task index
    */
   toggleTask(index)
   {
      this.tasks[index]?.toggleVisible();
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
    * @returns {QuestPreview}
    */
   get sheet()
   {
      return new QuestPreview(this);
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
      const entry = game.journal.get(this.id);
      return entry.testUserPermission(user, permission, options);
   }
}

class Reward
{
   constructor(data = {})
   {
      this.type = data.type || null;
      this.data = data.data || {};
      this.hidden = data.hidden || false;
   }

   toJSON()
   {
      return JSON.parse(JSON.stringify({
         type: this.type,
         data: this.data,
         hidden: this.hidden
      }));
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
         state: this.state
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