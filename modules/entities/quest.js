import Socket           from '../utility/socket.js';
import QuestFolder      from './quest-folder.js';
import Reward           from './reward.js';
import Task             from './task.js';
import QuestsCollection from './collection/quests-collection.js';
import QuestPreview     from '../apps/quest-preview.js';
import constants        from '../constants.js';

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class Quest
{
   constructor(data = {}, entry = null)
   {
      this._id = data.id || null;
      this._populated = false;
      this.initData(data);
      this.entry = entry;
      this._data = data;
   }

   static get collection()
   {
      return QuestsCollection;
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

   /**
    * Calls a delete quest dialog.
    *
    * @param questId
    *
    * @param parentId
    *
    * @returns {Promise<void>}
    */
   static async delete(questId, parentId = null)
   {
      const entry = this.get(questId);

      new Dialog({
         title: game.i18n.format('ForienQuestLog.DeleteDialog.Title', entry.name),
         content: `<h3>${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}</h3>` +
          `<p>${game.i18n.localize('ForienQuestLog.DeleteDialog.Body')}</p>`,
         buttons: {
            yes: {
               icon: '<i class="fas fa-trash"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
               callback: () => this.deleteConfirm(questId, parentId)
            },
            no: {
               icon: '<i class="fas fa-times"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel')
            }
         },
         default: 'yes'
      }).render(true);
   }

   /**
    * Called when user confirms the delete.
    * Deletes the Quest by deleting related JournalEntry.
    *
    * @param questId
    *
    * @param parentId
    *
    * @returns {Promise<void>}
    */
   static async deleteConfirm(questId, parentId = null)
   {
      const entry = game.journal.get(questId);

      if (parentId !== null)
      {
         const quest = Quest.get(parentId);
         quest.removeSubquest(questId);
         await quest.save();
         Socket.refreshQuestPreview(parentId);
      }

      entry.delete().then(() =>
      {
         Socket.refreshQuestLog();
         Socket.closeQuest(questId);
      });
   }

   static get(questId)
   {
      const entry = game.journal.get(questId);
      if (!entry)
      {
         return undefined;
      }

      const content = this.getContent(entry);
      content.permission = entry.permission;

      return new Quest(content, entry);
   }

   static getContent(entry, populate = false)
   {
      let content;

      content = entry.getFlag(constants.moduleName, 'json');

      // Attempt to load old quest format which is raw JSON stored in content of JE.
      if (content === void 0)
      {
         try
         {
            console.log(`${constants.moduleLabel} | Quest Folder contains invalid entry. Will try to read old quest format for '${entry.data.name}'.`);
            // Strip leading / trailing HTML tags in case someone attempted to look at / modify the JE.
            let entryContent = entry.data.content;
            entryContent = entryContent.replace(/^<p>/, '');
            entryContent = entryContent.replace(/<\/p>$/, '');
            content = JSON.parse(entryContent);
            console.log(`${constants.moduleLabel} | Quest Folder contained old quest format in '${entry.data.name}'. Please save this quest again to convert.`);
         }
         catch (e)
         {
            console.log(`${constants.moduleLabel} | Quest Folder contains invalid entry. The '${entry.data.name}' is either corrupted Quest Entry, or non-Quest Journal Entry.`);
            console.error(e);
            return null;
         }
      }

      content.id = entry.id;

      if (populate)
      {
         content = this.populate(content, entry);
      }

      return content;
   }

   /**
    * Returns localization strings for quest types (statuses)
    *
    * @returns {{hidden: string, available: string, active: string, completed: string, failed: string}}
    */
   static getQuestTypes()
   {
      return {
         active: 'ForienQuestLog.QuestTypes.InProgress',
         completed: 'ForienQuestLog.QuestTypes.Completed',
         failed: 'ForienQuestLog.QuestTypes.Failed',
         hidden: 'ForienQuestLog.QuestTypes.Hidden',
         available: 'ForienQuestLog.QuestLog.Tabs.Available'
      };
   }

   /**
    * Retrieves all Quests, grouped by folders.
    *
    * @param sortTarget      sort by
    *
    * @param sortDirection   sort direction
    *
    * @param availableTab    true if Available tab is visible
    *
    * @param populate
    *
    * @returns {{}}
    */
   static getQuests(sortTarget = undefined, sortDirection = 'asc', availableTab = false, populate = false)
   {
      const folder = QuestFolder.get();
      let entries = [];

      folder.content.forEach((entry) =>
      {
         const content = this.getContent(entry, populate);
         if (content)
         {
            entries.push(content);
         }
      });

      if (sortTarget !== undefined)
      {
         entries = this.sort(entries, sortTarget, sortDirection);
      }

      // Note the condition on 'e.parent === null' as this prevents sub quests from displaying in these categories
      const quests = {
         available: entries.filter((e) => e.status === 'available' && e.parent === null),
         active: entries.filter((e) => e.status === 'active'),
         completed: entries.filter((e) => e.status === 'completed' && e.parent === null),
         failed: entries.filter((e) => e.status === 'failed' && e.parent === null),
         hidden: entries.filter((e) => e.status === 'hidden' && e.parent === null)
      };

      if (!availableTab)
      {
         quests.hidden = [...quests.available, ...quests.hidden];
         quests.hidden = this.sort(quests.hidden, sortTarget, sortDirection);
      }

      return quests;
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

      if (data.tasks !== undefined && Array.isArray(data.tasks))
      {
         this._tasks = data.tasks.map((task) =>
         {
            return new Task(task);
         });
      }
      if (data.rewards !== undefined && Array.isArray(data.rewards))
      {
         this._rewards = data.rewards.map((reward) =>
         {
            return new Reward(reward);
         });
      }
   }

   /**
    * Moves Quest (and Journal Entry) to different Folder and updates permissions if needed.
    *
    * @param questId
    *
    * @param target
    *
    * @param permission
    *
    * @returns {Promise<void>}
    */
   static async move(questId, target, permission = undefined)
   {
      const journal = game.journal.get(questId);
      const quest = Quest.get(questId);

      // let quest = this.getContent(journal);

      if (permission === undefined)
      {
         permission = journal.data.permission;
      }

      if (!quest.personal)
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

      // let content = Quest.getContent(journal);
      // content.status = target;
      if (quest._populated)
      {
         throw new Error('Can not save populated data.');
      }

      quest.status = target;
console.log(`!!!! Quest - move - quest: ${JSON.stringify(quest.toJSON())}`);
      return journal.update({
         flags: {
            [constants.moduleName]: { json: quest.toJSON() }
         },
         permission
      }).then(() =>
      {
         Socket.refreshQuestLog();
         Socket.refreshQuestPreview(questId);
         const dirname = game.i18n.localize(this.getQuestTypes()[target]);
         ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved', { target: dirname }), {});
      });
   }

   /**
    * Populates content with a lot of additional data, that doesn't necessarily have to be saved
    * with Quest itself, such as Actor's data.
    *
    * This method also performs content manipulation, for example enriching HTML or calculating amount
    * of done/total tasks etc.
    *
    * Be advised, that even if `content` parameter is Quest object, after populating it cannot be saved.
    * If you need to keep Quest instance to be edited and saved, duplicate() it and populate copy.
    *
    * @param content
    *
    * @param entry
    *
    * @returns {*}
    */
   static populate(content, entry = undefined)
   {
      const isGM = game.user.isGM;
      const canPlayerDrag = game.settings.get('forien-quest-log', 'allowPlayersDrag');
      const countHidden = game.settings.get('forien-quest-log', 'countHidden');

      content._populated = true;
      console.log(`!!! Quest - populate - content.title: ${content.title}`);

      if (content.giver)
      {
         if (content.giver === 'abstract')
         {
            // content.giver = {
            //   name: content.giverName,
            //   img: content.image
            // };
            // content.image = undefined;
            content.data_giver = {
               name: content.giverName,
               img: content.image
            };
         }
         else if (typeof content.giver === 'string')
         {
            fromUuid(content.giver).then((document) =>
            {
               if (document === null)
               {
                  content.data_giver = {};
                  return;
               }

               switch (document.documentName)
               {
                  case Actor.documentName:
                     content.data_giver = {
                        name: document.name,
                        img: document.img
                     };
                     break;

                  case Item.documentName:
                  case JournalEntry.documentName:
                     content.data_giver = {
                        name: document.name,
                        img: document.img
                     };

                     break;
                  default:
                     content.data_giver = {};
               }
console.log(`!!!!! Quest - populate - A - end of data_giver promise - data_giver: ${typeof content.data_giver}`);
            });
         }
      }

      content.isSubquest = false;
      if (content.parent !== null)
      {
         content.isSubquest = true;

         const parentData = Quest.get(content.parent);
         content.data_parent = {
            id: content.parent,
            giver: parentData.giver,
            title: parentData.title,
            status: parentData.status
         };
      }
      else
      {
         content.data_parent = {};
      }

console.log(`!!!! Quest - populate (0) - content.isSubquest: ${content.isSubquest} - data_parent: ${JSON.stringify(content.data_parent)}`);
      content.statusLabel = game.i18n.localize(`ForienQuestLog.QuestTypes.Labels.${content.status}`);

      if (countHidden)
      {
         content.checkedTasks = content.tasks.filter((t) => t.completed).length;
         content.totalTasks = content.tasks.length;
      }
      else
      {
         content.checkedTasks = content.tasks.filter((t) => t.hidden === false && t.completed).length;
         content.totalTasks = content.tasks.filter((t) => t.hidden === false).length;
      }

      content.data_tasks = content.tasks.map((t) =>
      {
         const task = new Task(t);
         task.name = TextEditor.enrichHTML(task.name);
         return task;
      });

      if (content.rewards === undefined)
      {
         content.data_rewards = [];
      }

      content.data_rewards = content.rewards.map((item) =>
      {
         return {
            id: item.id,
            name: item.data.name,
            img: item.data.img,
            type: item.type.toLowerCase(),
            hidden: item.hidden,
            draggable: ((isGM || canPlayerDrag) && item.type !== 'abstract'),
            transfer: JSON.stringify(item.data)
         };
      });

      content.data_subquest = (content.subquests !== undefined) ? content.subquests.map((questId) =>
      {
         const subData = Quest.get(questId);

         return subData ? {
            id: questId,
            giver: subData.giver,
            name: subData.title, title:
            subData.title,
            status: subData.status
         } : void 0;
      }) : [];

      // Filter out any missing subquest data.
      content.data_subquest = content.data_subquest.filter((value) => value !== void 0);

console.log(`!!!! Quest - populate - (1) content.data_subquest.length: ${content.data_subquest.length}`);

      if (entry)
      {
         content.playerEdit = Object.values(entry.data.permission).some((p) => p === 3);
      }

      if (!(isGM || content.playerEdit))
      {
         content.description = TextEditor.enrichHTML(content.description);
         content.data_tasks = content.data_tasks.filter((t) => t.hidden === false);
         content.data_rewards = content.data_rewards.filter((r) => r.hidden === false);
      }

      if (entry)
      {
         if (isGM && content.personal)
         {
            const users = [`${game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestVisibleFor')}:`];

            for (const perm in entry.data.permission)
            {
               if (perm === 'default')
               {
                  continue;
               }
               if (entry.data.permission[perm] >= 2)
               {
                  const user = game.users.get(perm);
                  if (!user)
                  {
                     console.log(`Forien Quest Log | Dropping user ${perm} from quest ${entry?.name} as it no longer exists`);
                     return;
                  }
                  users.push(user.name);
               }
            }

            if (users.length > 1)
            {
               content.users = users.join('\r');
            }
            else
            {
               content.users = game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestButNoPlayers');
            }
         }
      }

      console.log(`!!!!! Quest - populate - B - end of populate - data_giver: ${typeof content.data_giver} - content.toJSON: ${JSON.stringify(content)}`);

      return content;
   }

   /**
    * Refreshes data without need of destroying and reinstantiating Quest object
    */
   refresh()
   {
      const entry = game.journal.get(this._id);
      const content = Quest.getContent(entry);

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
      if (this._populated)
      {
         throw new Error(`Can't save populated Quest (${this._id})`);
      }
console.log(`!! Quest - save - this._populated: ${this._populated} - is giver object: ${typeof this._giver === 'object'}`);

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

      const entry = game.journal.get(this._id);
      await entry.update(update, { diff: false });
   }

   /**
    * Saves new permissions for users. Used by Personal Quests feature.
    *
    * @param userId
    *
    * @param permission
    *
    * @returns {Promise<void>}
    */
   async savePermission(userId, permission)
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

   /**
    * Sort function to sort quests.
    *
    * @see getQuests()
    *
    * @param entries
    *
    * @param sortTarget
    *
    * @param sortDirection
    *
    * @returns -1 | 0 | 1
    */
   static sort(entries, sortTarget, sortDirection)
   {
      return entries.sort((a, b) =>
      {
         let targetA;
         let targetB;

         if (sortTarget === 'actor')
         {
            targetA = (a.actor) ? (a.actor.name || 'ZZZZZ') : 'ZZZZZ';
            targetB = (b.actor) ? (b.actor.name || 'ZZZZZ') : 'ZZZZZ';
         }
         else
         {
            targetA = a[sortTarget];
            targetB = b[sortTarget];
         }

         if (sortDirection === 'asc')
         {
            return (targetA < targetB) ? -1 : (targetA > targetB) ? 1 : 0;
         }

         return (targetA > targetB) ? -1 : (targetA < targetB) ? 1 : 0;
      });
   }

   sortParts(index, targetIdx, array)
   {
      const entry = array.splice(index, 1)[0];
      if (targetIdx)
      {
         if (index < targetIdx)
         {
            targetIdx--;
         }
         array.splice(targetIdx, 0, entry);
      }
      else
      {
         array.push(entry);
      }
      this.save().then(() => Socket.refreshQuestPreview(this.id));
   }

   sortRewards(event, data)
   {
      const dt = event.target.closest('li.reward') || null;
      const index = data.index;
      const targetIdx = dt?.dataset.index;

      this.sortParts(index, targetIdx, this.rewards);
   }

   sortTasks(event, data)
   {
      const dt = event.target.closest('li.task') || null;
      const index = data.index;
      const targetIdx = dt?.dataset.index;

      this.sortParts(index, targetIdx, this.tasks);
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
   async toggleImage()
   {
      if (this._image === 'actor')
      {
         this._image = 'token';
      }
      else
      {
         this._image = 'actor';
      }
   }

   /**
    * Toggles quest between Public and Personal. In both cases, it hides the quest from everyone.
    * If new status is public, then hide it.
    *
    * @returns {Promise<void>}
    */
   async togglePersonal()
   {
      this._personal = !this._personal;
      this.entryPermission = { default: 0 };
      if (this._personal === false)
      {
         this.status = 'hidden';
      }
   }

   /**
    * Toggles visibility of Reward
    *
    * @param index
    * @returns {Promise<void>}
    */
   async toggleReward(index)
   {
      if (this._rewards[index] !== undefined)
      {
         return await this._rewards[index].toggleVisible();
      }
   }

   /**
    * Toggles visibility of Task
    *
    * @param index
    * @returns {Promise<void>}
    */
   async toggleTask(index)
   {
      if (this._tasks[index] !== undefined)
      {
         return await this._tasks[index].toggleVisible();
      }
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
      return new QuestPreview(this._id);
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

window.Quest = Quest;