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
      this._id = data.id || null;
      this.initData(data);
      this.entry = entry;
      this._data = data;
   }

   get description()
   {
      return this._description;
   }

   set description(value)
   {
      this._description = value;
   }

   get giver()
   {
      return this._giver;
   }

   set giver(value)
   {
      this._giver = value;
   }

   get giverImgPos()
   {
      return this._giverImgPos;
   }

   set giverImgPos(value)
   {
      this._giverImgPos = value;
   }

   get giverName()
   {
      return this._giverName;
   }

   set giverName(value)
   {
      this._giverName = value;
   }

   get gmnotes()
   {
      return this._gmnotes;
   }

   set gmnotes(value)
   {
      this._gmnotes = value;
   }

   get id()
   {
      return this._id;
   }

   set id(value)
   {
      this._id = value;
   }

   get image()
   {
      return this._image;
   }

   set image(image)
   {
      if (image === 'actor' || image === 'token')
      {
         this._image = image;
      }
   }

   get name()
   {
      return this._title;
   }

   get parent()
   {
      return this._parent;
   }

   set parent(value)
   {
      this._parent = value;
   }

   get permission()
   {
      return this._permission;
   }

   get personal()
   {
      return this._personal;
   }

   set personal(value)
   {
      this._personal = (value === true);
   }

   get rewards()
   {
      return this._rewards;
   }

   get splash()
   {
      return this._splash;
   }

   set splash(splash)
   {
      this._splash = splash;
   }

   get splashPos()
   {
      return this._splashPos;
   }

   set splashPos(value)
   {
      this._splashPos = value;
   }

   get status()
   {
      return this._status;
   }

   set status(value)
   {
      this._status = value;
   }

   get subquests()
   {
      return this._subquests;
   }

   get tasks()
   {
      return this._tasks;
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
      if (reward.isValid)
      {
         this._rewards.push(reward);
      }
   }

   /**
    * Creates new and adds Quest to task array of quest.
    *
    * @param questId
    */
   addSubquest(questId)
   {
      this._subquests.push(questId);
   }

   /**
    * Creates new and adds Task to task array of quest.
    *
    * @param data
    */
   addTask(data = {})
   {
      const task = new Task(data);
      if (task.isValid)
      {
         this._tasks.push(task);
      }
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
      this._giver = data.giver || null;
      this._title = data.title || game.i18n.localize('ForienQuestLog.NewQuest');
      this._status = data.status || 'hidden';
      this._description = data.description || '';
      this._gmnotes = data.gmnotes || '';
      this._image = data.image || 'actor';
      this._giverName = data.giverName || 'actor';
      this._giverImgPos = data.giverImgPos || 'center';
      this._splash = data.splash || '';
      this._splashPos = data.splashPos || 'center';
      this._personal = data.personal || false;
      this._parent = data.parent || null;
      this._permission = data.permission || 0;
      this._subquests = data.subquests || [];
      this._tasks = [];
      this._rewards = [];
      this._tasks = Array.isArray(data.tasks) ? data.tasks.map((task) => new Task(task)) : [];
      this._rewards = Array.isArray(data.rewards) ? data.rewards.map((reward) => new Reward(reward)) : [];
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
   async move(target, permission = undefined)
   {
      // TODO: REMOVE WHEN ALL QUESTS HAVE JOURNAL ENTRIES GUARANTEED
      if (!this.entry) { return; }

      if (permission === undefined)
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
      const entry = game.journal.get(this._id);
      const content = Fetch.content(entry);

      this.initData(content);
   }

   /**
    * Deletes Reward from Quest
    *
    * @param index
    */
   removeReward(index)
   {
      if (this._rewards[index] !== undefined)
      {
         this._rewards.splice(index, 1);
      }
   }

   /**
    * Deletes Task from Quest
    *
    * @param questId
    */
   removeSubquest(questId)
   {
      this._subquests = this._subquests.filter((id) => id !== questId);
   }

   /**
    * Deletes Task from Quest
    *
    * @param index
    */
   removeTask(index)
   {
      if (this._tasks[index] !== undefined)
      {
         this._tasks.splice(index, 1);
      }
   }

   /**
    * Saves Quest to JournalEntry's content, and if needed, moves JournalEntry to different folder.
    * Can also update JournalEntry's permissions.
    *
    * @returns {Promise<void>}
    */
   async save()
   {
      // TODO: use this.entry and create a mirror of canUserModify
      const entry = game.journal.get(this._id);

      // If the entry doesn't exist or the user can't modify the journal entry via ownership then early out.
      if (!entry || !entry.canUserModify(game.user, 'update')) { return; }

      const update = {
         name: typeof this._title === 'string' && this._title.length > 0 ? this._title :
          game.i18n.localize('ForienQuestLog.NewQuest'),
         flags: {
            [constants.moduleName]: { json: this.toJSON() }
         }
      };

      if (this.entryPermission !== undefined)
      {
         update.permission = this.entryPermission;
      }

      await entry.update(update, { diff: false });

      return this._id;
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

      const entryData = duplicate(game.journal.get(this._id));
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
         giver: this._giver,
         title: this._title,
         status: this._status,
         description: this._description,
         gmnotes: this._gmnotes,
         personal: this._personal,
         image: this._image,
         giverName: this._giverName,
         giverImgPos: this._giverImgPos,
         splashPos: this._splashPos,
         splash: this._splash,
         parent: this._parent,
         subquests: this._subquests,
         tasks: this._tasks,
         rewards: this._rewards
      };
   }

   /**
    * Toggles Actor image between sheet's and token's images
    */
   toggleImage()
   {
      this._image = this._image === 'actor' ? 'token' : 'actor';
   }

   /**
    * Toggles quest between Public and Personal. In both cases, it hides the quest from everyone.
    * If new status is public, then hide it.
    */
   togglePersonal()
   {
      this._personal = !this._personal;
      this.entryPermission = { default: 0 };
      if (!this._personal) { this.status = 'hidden'; }
   }

   /**
    * Toggles visibility of Reward
    *
    * @param {number}   index - Reward index
    */
   toggleReward(index)
   {
      this._rewards[index]?.toggleVisible();
   }

   /**
    * Toggles visibility of Task
    *
    * @param {number}   index - Task index
    */
   toggleTask(index)
   {
      this._tasks[index]?.toggleVisible();
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
      const entry = game.journal.get(this._id);
      return entry.testUserPermission(user, permission, options);
   }
}

class Reward
{
   constructor(data = {})
   {
      this._type = data.type || null;
      this._data = data.data || {};
      this._hidden = data.hidden || false;
   }

   get data()
   {
      return this._data;
   }

   set data(data)
   {
      this._data = data;
   }

   get hidden()
   {
      return this._hidden;
   }

   set hidden(value)
   {
      this._hidden = value;
   }

   get isValid()
   {
      return (this._type !== null);
   }

   get type()
   {
      return this._type;
   }

   set type(type)
   {
      this._type = type;
   }

   toJSON()
   {
      return JSON.parse(JSON.stringify({
         type: this._type,
         data: this._data,
         hidden: this._hidden
      }));
   }

   toggleVisible()
   {
      this._hidden = !this._hidden;

      return this._hidden;
   }
}

class Task
{
   constructor(data = {})
   {
      this._name = data.name || null;
      this._completed = data.completed || false;
      this._failed = data.failed || false;
      this._hidden = data.hidden || false;
   }

   get completed()
   {
      return this._completed;
   }

   set completed(completed)
   {
      this._completed = (completed === true);
   }

   get failed()
   {
      return this._failed;
   }

   set failed(failed)
   {
      this._failed = (failed === true);
   }

   get hidden()
   {
      return this._hidden;
   }

   set hidden(hidden)
   {
      this._hidden = (hidden === true);
   }

   get isValid()
   {
      return (this._name.length);
   }

   get name()
   {
      return this._name;
   }

   set name(name)
   {
      this._name = name;
   }

   get state()
   {
      if (this._completed)
      {
         return 'check-square';
      }
      else if (this._failed)
      {
         return 'minus-square';
      }
      return 'square';
   }

   toJSON()
   {
      return JSON.parse(JSON.stringify({
         name: this._name,
         completed: this._completed,
         failed: this._failed,
         hidden: this._hidden,
         state: this.state
      }));
   }

   toggle()
   {
      if (this._completed === false && this._failed === false)
      {
         this._completed = true;
      }
      else if (this._completed === true)
      {
         this._failed = true;
         this._completed = false;
      }
      else
      {
         this._failed = false;
      }
   }

   async toggleVisible()
   {
      this._hidden = !this._hidden;

      return this._hidden;
   }
}