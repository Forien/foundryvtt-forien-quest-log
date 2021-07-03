import FQLDialog              from './FQLDialog.js';
import FQLPermissionControl   from './FQLPermissionControl.js';
import QuestForm              from './QuestForm.js';
import Enrich                 from '../control/Enrich.js';
import QuestAPI               from '../control/QuestAPI.js';
import QuestDB                from '../control/QuestDB.js';
import Socket                 from '../control/Socket.js';
import Utils                  from '../control/Utils.js';
import ViewManager            from '../control/ViewManager.js';

import { constants, settings }  from '../model/constants.js';

export default class QuestPreview extends FormApplication
{
   /**
    * Since Quest Preview shows data for single Quest, it needs a Quest instance or
    * there is no point in rendering it.
    *
    * @param {Quest}   quest
    *
    * @param {object}   options
    */
   constructor(quest, options = {})
   {
      super(void 0, options);

      this.quest = quest;

      this.options.title = game.i18n.format('ForienQuestLog.QuestPreview.Title', this.quest);
   }

   /**
    * Default Application options
    *
    * @returns {Object}
    */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
         classes: ['forien-quest-preview'],
         template: 'modules/forien-quest-log/templates/quest-preview.html',
         width: 700,
         height: 540,
         minimizable: false,
         resizable: true,
         submitOnChange: false,
         submitOnClose: false,
         title: game.i18n.localize('ForienQuestLog.QuestPreview.Title'),
         tabs: [{ navSelector: '.quest-tabs', contentSelector: '.quest-body', initial: 'details' }]
      });
   }

   /** @override */
   get id()
   {
      return `quest-${this.quest.id}`;
   }

   get object()
   {
      return this.quest;
   }

   set object(value) {}

   /** @override */
   _getHeaderButtons()
   {
      const buttons = super._getHeaderButtons();

      // Share Entry
      if (game.user.isGM)
      {
         buttons.unshift({
            label: game.i18n.localize('ForienQuestLog.QuestPreview.HeaderButtons.Show'),
            class: 'share-quest',
            icon: 'fas fa-eye',
            onclick: () => Socket.showQuestPreview(this.quest.id)
         });
      }

      if (this.quest.splash.length)
      {
         buttons.unshift({
            label: '',
            class: 'splash-image',
            icon: 'far fa-image',
            onclick: () =>
            {
               (new ImagePopout(this.quest.splash, { shareable: true })).render(true);
            }
         });
      }

      buttons.unshift({
         label: '',
         class: 'copy-link',
         icon: 'fas fa-link',
         onclick: () =>
         {
            const el = document.createElement('textarea');
            el.value = `@Quest[${this.quest.id}]{${this.quest.name}}`;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            ui.notifications.info(game.i18n.localize('ForienQuestLog.Notifications.LinkCopied'), {});
         }
      });

      return buttons;
   }

   /**
    * Close any tracked permission control app / dialog when tabs change.
    *
    * @private
    * @inheritDoc
    */
   _onChangeTab(event, tabs, active)
   {
      if (this._permControl)
      {
         this._permControl.close();
         this._permControl = void 0;
      }

      super._onChangeTab(event, tabs, active);
   }

   /**
    * This might be a FormApplication, but we don't want Submit event to fire.
    *
    * @private
    * @inheritDoc
    */
   async _onSubmit(event)
   {
      event.preventDefault();
      return false;
   }

   /**
    * This method is called upon form submission after form data is validated.
    *
    * @override
    * @private
    * @inheritDoc
    */
   async _updateObject(event, formData) // eslint-disable-line no-unused-vars
   {
      event.preventDefault();
   }

   /**
    * Provide TinyMCE overrides.
    *
    * @override
    */
   activateEditor(name, options = {}, initialContent = '')
   {
      super.activateEditor(name, Object.assign({}, options, Utils.tinyMCEOptions()), initialContent);
   }

   /**
    * Defines all event listeners like click, drag, drop etc.
    *
    * @param html
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.splash-image-link', () =>
      {
         (new ImagePopout(this.quest.splash, { shareable: true })).render(true);
      });

      html.on('dragstart', '.item-reward', async (event) =>
      {
         const data = $(event.target).data('transfer');

         const document = await Utils.getDocumentFromUUID(data, { permissionCheck: false });
         if (document)
         {
            const uuidData = Utils.getDataFromUUID(data);

            const dataTransfer = {
               _fqlData: {
                  questId: this.quest.id,
                  uuidv4: data.uuidv4,
                  itemName: data.name,
                  userName: game.user.name,
               },
               type: 'Item',
               data: document.data,
               uuid: data.uuid,
               id: document.id
            };

            // Add compendium pack info if applicable
            if (uuidData && uuidData.pack) { dataTransfer.pack = uuidData.pack; }

            event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
         }
      });

      html.on('dragstart', '.quest-rewards .fa-sort', (event) =>
      {
         event.stopPropagation();
         const li = event.target.closest('li') || null;
         if (!li) { return; }

         const dataTransfer = {
            type: 'Reward',
            mode: 'Sort',
            uuidv4: $(li).data('uuidv4')
         };
         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
      });

      html.on('dragstart', '.quest-tasks .fa-sort', (event) =>
      {
         event.stopPropagation();
         const li = event.target.closest('li') || null;
         if (!li) { return; }

         const dataTransfer = {
            type: 'Task',
            mode: 'Sort',
            uuidv4: $(li).data('uuidv4')
         };

         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
      });

      html.on('click', '.item-reward .editable-container', async (event) =>
      {
         event.stopPropagation();
         const data = $(event.currentTarget).data('transfer');
         const uuidv4 = $(event.currentTarget).data('uuidv4');

         const reward = this.quest.getReward(uuidv4);

         if (reward && (this.canEdit || !reward.locked))
         {
            await Utils.showSheetFromUUID(data, { permissionCheck: false, editable: false });
         }
      });

      // This CSS selector responds to any subquest attached to the details section or subquests listed in objectives.
      html.on('click', '.quest-name-link', (event) =>
      {
         const questId = $(event.currentTarget).data('quest-id');
         QuestAPI.open({ questId });
      });

      html.on('click', '.open-actor-sheet', async (event) =>
      {
         const uuid = $(event.target).data('actor-uuid');

         if (typeof uuid === 'string' && uuid.length)
         {
            await Utils.showSheetFromUUID(uuid, { editable: false });
         }
      });

      if (this.canEdit || this.playerEdit)
      {
         html.on('drop', '.tasks-box', async (event) =>
         {
            event.preventDefault();
            const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

            if (data.mode === 'Sort' && data.type === 'Task')
            {
               const dt = event.target.closest('li.task') || null;
               this.quest.sortTasks(data.uuidv4, dt?.dataset.uuidv4);
               await this.quest.save();
               Socket.refreshQuestPreview({ questId: this.quest.id });
            }
         });

         html.on('click', '.add-new-task', (event) =>
         {
            event.preventDefault();

            const li = $('<li class="task"></li>');

            const placeholder = $('<span><i class="fas fa-check hidden"></i></span>');

            const input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize(
             "ForienQuestLog.SampleTask")}" />`);

            const box = $(event.target).closest('.quest-tasks').find('.tasks-box ul');

            li.append(placeholder);
            li.append(input);
            box.append(li);

            input.focus();

            input.focusout(async (event) =>
            {
               const value = $(event.target).val();
               if (value !== void 0 && value.length)
               {
                  this.quest.addTask({ name: value, hidden: this.canEdit });
               }
               await this.saveQuest();
            });
         });

         html.on('click', '.actions.tasks .delete', async (event) =>
         {
            const target = $(event.target);
            const uuidv4 = target.data('uuidv4');
            const name = target.data('task-name');

            const result = await FQLDialog.confirmDeleteTask({ name, result: uuidv4, questId: this.quest.id });
            if (result)
            {
               this.quest.removeTask(result);

               await this.saveQuest();
            }
         });

         html.on('click', 'li.task .toggleState', async (event) =>
         {
            const uuidv4 = $(event.target).data('uuidv4');

            const task = this.quest.getTask(uuidv4);
            if (task)
            {
               task.toggle();
               await this.saveQuest();
            }
         });

         /**
          * While this class selector provides a specific target there still is an early out to match against
          * `task.name`.
          */
         html.on('click', '.actions.tasks .editable', (event) =>
         {
            const target = $(event.target).data('target');
            let uuidv4 = $(event.target).data('uuidv4');
            let task = this.quest.getTask(uuidv4);

            // Early out conditional.
            if (target === void 0 || target !== 'task.name' || !task) { return; }

            let value = task.name;

            value = value.replace(/'/g, '&quot;');
            const input = $(`<input type='text' class='editable-input' value='${value}' data-target='${target}' ${uuidv4 !== void 0 ? `data-uuidv4='${uuidv4}'` : ``}/>`);
            const parent = $(event.target).closest('.actions').prev('.editable-container');

            parent.html('');
            parent.append(input);
            input.focus();

            input.focusout(async (event) =>
            {
               const targetOut = $(event.target).data('target');
               const valueOut = $(event.target).val();

               switch (targetOut)
               {
                  case 'task.name':
                  {
                     uuidv4 = $(event.target).data('uuidv4');
                     task = this.quest.getTask(uuidv4);
                     if (task)
                     {
                        task.name = valueOut;
                        await this.saveQuest();
                     }
                     break;
                  }
               }
            });
         });
      }

      if (this.canEdit || this.canAccept)
      {
         html.on('click', '.actions.quest-status i', async (event) =>
         {
            const target = $(event.target).data('target');
            const questId = $(event.target).data('quest-id');
            const classList = $(event.target).attr('class');
            const name = $(event.target).data('quest-name');

            if (classList.includes('move'))
            {
               const quest = QuestDB.getQuest(questId);
               if (quest) { await Socket.moveQuest({ quest, target }); }
            }
            else if (classList.includes('delete'))
            {
               const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId: this.quest.id });
               if (result)
               {
                  const quest = QuestDB.getQuest(result);
                  if (quest) { await Socket.deletedQuest(await quest.delete()); }
               }
            }
         });
      }

      if (this.canEdit)
      {
         html.on('drop', '.rewards-box', async (event) =>
         {
            event.preventDefault();

            let data;
            try
            {
               data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
            }
            catch (e)
            {
               return;
            }

            if (data.mode === 'Sort' && data.type === 'Reward')
            {
               const dt = event.target.closest('li.reward') || null;
               this.quest.sortRewards(data.uuidv4, dt?.dataset.uuidv4);
               await this.quest.save();
               Socket.refreshQuestPreview({ questId: this.quest.id });
            }

            if (data.type === 'Item' && data._fqlData === void 0)
            {
               if (typeof data.id === 'string')
               {
                  const uuid = Utils.getUUID(data);

                  const item = await Enrich.giverFromUUID(uuid);
                  if (item)
                  {
                     this.quest.addReward({ type: 'Item', data: item, hidden: true });
                     await this.saveQuest();
                  }
                  else
                  {
                     ui.notifications.warn(game.i18n.format('ForienQuestLog.QuestPreview.Notifications.BadUUID',
                      { uuid }));
                  }
               }
               else
               {
                  // Document has data, but lacks a UUID, so it is a data copy. Inform user that rewards may only be
                  // items that are backed by a document with a UUID.
                  if (typeof data.data === 'object')
                  {
                     ui.notifications.warn(game.i18n.localize(
                      'ForienQuestLog.QuestPreview.Notifications.WrongItemType'));
                  }
               }
            }
         });

         html.on('drop', '.quest-giver-gc', async (event) =>
         {
            event.preventDefault();
            const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

            if (typeof data.id === 'string')
            {
               const uuid = Utils.getUUID(data, ['Actor', 'Item', 'JournalEntry']);

               const giverData = await Enrich.giverFromUUID(uuid);
               if (giverData)
               {
                  this.quest.giver = uuid;
                  this.quest.giverData = giverData;
                  await this.saveQuest();
               }
               else
               {
                  ui.notifications.warn(game.i18n.format('ForienQuestLog.QuestPreview.Notifications.BadUUID', { uuid }));
               }
            }
            else
            {
               // Document has data, but lacks a UUID, so it is a data copy. Inform user that quest giver may only be
               // from world and compendium sources with a UUID.
               if (typeof data.data === 'object')
               {
                  ui.notifications.warn(game.i18n.localize('ForienQuestLog.QuestPreview.Notifications.WrongDocType'));
               }
            }
         });

         /**
          * There is no way to provide a more specific class selector as this callback edits the quest name and reward
          * name which are located in separate sections of the template. A more specific class selector is provided
          * above in the `canEdit / playedEdit` gated code that specifically targets the task edit button. This callback
          * will be invoked twice when the task edit button is pressed, but has an early out in the first if conditional
          * if the target is 'task.name'.
          */
         html.on('click', '.actions.rewards .editable', (event) =>
         {
            const target = $(event.target).data('target');

            let value = this.quest[target];
            let uuidv4;

            if (target === 'reward.name')
            {
               uuidv4 = $(event.target).data('uuidv4');

               const reward = this.quest.getReward(uuidv4);
               if (!reward) { return; }

               value = reward.name;
            }

            value = value.replace(/'/g, '&quot;');
            const input = $(`<input type='text' class='editable-input' value='${value}' data-target='${target}' ${uuidv4 !== void 0 ? `data-uuidv4='${uuidv4}'` : ``}/>`);
            const parent = $(event.target).closest('.actions').prev('.editable-container');

            parent.html('');
            parent.append(input);
            input.focus();

            input.focusout(async (event) =>
            {
               const targetOut = $(event.target).data('target');
               const valueOut = $(event.target).val();

               switch (targetOut)
               {
                  case 'reward.name':
                  {
                     uuidv4 = $(event.target).data('uuidv4');
                     const reward = this.quest.getReward(uuidv4);
                     if (!reward) { return; }

                     reward.data.name = valueOut;
                     break;
                  }
               }
               await this.saveQuest();
            });
         });

         /**
          * There is no way to provide a more specific class selector as this callback edits the quest name and reward
          * name which are located in separate sections of the template. A more specific class selector is provided
          * above in the `canEdit / playedEdit` gated code that specifically targets the task edit button. This callback
          * will be invoked twice when the task edit button is pressed, but has an early out in the first if conditional
          * if the target is 'task.name'.
          */
         html.on('click', '.actions-single.quest-name .editable', (event) =>
         {
            const target = $(event.target).data('target');

            let value = this.quest[target];
            let uuidv4;

            value = value.replace(/'/g, '&quot;');
            const input = $(`<input type='text' class='editable-input' value='${value}' data-target='${target}' ${uuidv4 !== void 0 ? `data-uuidv4='${uuidv4}'` : ``}/>`);
            const parent = $(event.target).closest('.actions-single').prev('.editable-container');

            parent.html('');
            parent.append(input);
            input.focus();

            input.focusout(async (event) =>
            {
               const targetOut = $(event.target).data('target');
               const valueOut = $(event.target).val();

               switch (targetOut)
               {
                  case 'name':
                     this.quest.name = valueOut;
                     this.options.title = game.i18n.format('ForienQuestLog.QuestPreview.Title', this.quest);
                     break;
               }
               await this.saveQuest();
            });
         });

         html.on('click', '.actions.rewards .delete', async (event) =>
         {
            const target = $(event.target);
            const uuidv4 = target.data('uuidv4');
            const name = target.data('reward-name');

            // Await a modal dialog.
            const result = await FQLDialog.confirmDeleteReward({ name, result: uuidv4, questId: this.quest.id });
            if (result)
            {
               this.quest.removeReward(result);

               await this.saveQuest();
            }
         });

         html.on('click', '.toggleImage', async () =>
         {
            this.quest.toggleImage();

            const giverData = await Enrich.giverFromQuest(this.quest);
            if (giverData)
            {
               this.quest.giverData = giverData;
               await this.saveQuest();
            }
         });

         html.on('click', '.deleteQuestGiver', async () =>
         {
            this.quest.giver = null;
            this.quest.image = 'actor';
            await this.saveQuest();
         });

         html.on('click', '.toggleLocked', async (event) =>
         {
            const target = $(event.target).data('target');

            if (target === 'reward')
            {
               const uuidv4 = $(event.target).data('uuidv4');
               const reward = this.quest.getReward(uuidv4);
               if (reward)
               {
                  reward.toggleLocked();
                  await this.saveQuest();
               }
            }
         });

         html.on('click', '.unlock-all-rewards', async () =>
         {
            for (const reward of this.quest.rewards) {  reward.locked = false; }
            if (this.quest.rewards.length) { await this.saveQuest(); }
         });

         html.on('click', '.add-abstract', (event) =>
         {
            const li = $('<li class="reward"></li>');

            const input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize(
             "ForienQuestLog.SampleReward")}" />`);

            const box = $(event.target).closest('.quest-rewards').find('.rewards-box ul');

            li.append(input);
            box.append(li);

            input.focus();

            input.focusout(async (event) =>
            {
               const value = $(event.target).val();
               if (value !== void 0 && value.length)
               {
                  this.quest.addReward({
                     data: {
                        name: value,
                        img: 'icons/svg/item-bag.svg'
                     },
                     hidden: true,
                     type: 'Abstract'
                  });
               }
               await this.saveQuest();
            });
         });

         html.on('click', '.abstract-reward .reward-image', async (event) =>
         {
            const uuidv4 = $(event.target).data('uuidv4');

            let reward = this.quest.getReward(uuidv4);
            if (!reward) { return; }

            const currentPath = reward.data.img;
            await new FilePicker({
               type: 'image',
               current: currentPath,
               callback: async (path) =>
               {
                  reward = this.quest.getReward(uuidv4);
                  if (reward)
                  {
                     reward.data.img = path;
                     await this.saveQuest();
                  }
               },
            }).browse(currentPath);
         });

         html.on('click', '.toggleHidden', async (event) =>
         {
            const target = $(event.target).data('target');

            if (target === 'task')
            {
               const uuidv4 = $(event.target).data('uuidv4');
               const task = this.quest.getTask(uuidv4);
               if (task)
               {
                  task.toggleVisible();
                  await this.saveQuest();
               }
            }
            else if (target === 'reward')
            {
               const uuidv4 = $(event.target).data('uuidv4');
               const reward = this.quest.getReward(uuidv4);
               if (reward)
               {
                  reward.toggleVisible();
                  await this.saveQuest();
               }
            }
         });

         html.on('click', '.show-all-rewards', async () =>
         {
            for (const reward of this.quest.rewards) {  reward.hidden = false; }
            if (this.quest.rewards.length) { await this.saveQuest(); }
         });

         // Management view callbacks -------------------------------------------------------------------------------

         html.on('click', '.configure-perm-btn', () =>
         {
            if (this.quest.entry)
            {
               if (!this._permControl)
               {
                  this._permControl = new FQLPermissionControl(this.quest.entry, {
                     top: Math.min(this.position.top, window.innerHeight - 350),
                     left: this.position.left + 125
                  });

                  Hooks.once('closePermissionControl', async (app) =>
                  {
                     if (app.appId === this._permControl.appId)
                     {
                        this._permControl = void 0;

                        // When the permissions change refresh the parent if any, this QuestPreview, and
                        // any subquests.
                        const questId = this.quest.parent ?
                         [this.quest.parent, this.quest.id, ...this.quest.subquests] :
                          [this.quest.id, ...this.quest.subquests];

                        // We must check if the user intentionally or accidentally revoked their own permissions to
                        // at least observe this quest. If so then simply close the QuestPreview and send out a refresh
                        // notice to all clients to render again.
                        if (!this.quest.isObservable) { await this.close(); }

                        Socket.refreshAll();
                        Socket.refreshQuestPreview({ questId });
                     }
                  });
               }

               this._permControl.render(true, {
                  top: Math.min(this.position.top, window.innerHeight - 350),
                  left: this.position.left + 125,
                  focus: true
               });
            }
         });

         html.on('click', `.quest-splash #splash-as-icon-${this.quest.id}`, async (event) =>
         {
            this.quest.splashAsIcon = $(event.target).is(':checked');
            await this.saveQuest();
         });

         html.on('click', '.quest-splash .drop-info', async () =>
         {
            const currentPath = this.quest.splash;
            await new FilePicker({
               type: 'image',
               current: currentPath,
               callback: async (path) =>
               {
                  this.quest.splash = path;
                  await this.saveQuest();
               },
            }).browse(currentPath);
         });

         html.on('click', '.delete-splash', async () =>
         {
            this.quest.splash = '';
            await this.saveQuest();
         });

         html.on('click', '.change-splash-pos', async () =>
         {
            if (this.quest.splashPos === 'center')
            {
               this.quest.splashPos = 'top';
            }
            else
            {
               this.quest.splashPos = this.quest.splashPos === 'top' ? 'bottom' : 'center';
            }

            await this.saveQuest();
         });

         html.on('click', '.add-subquest-btn', async () =>
         {
            // If a permission control app / dialog is open close it.
            if (this._permControl)
            {
               this._permControl.close();
               this._permControl = void 0;
            }

            const quest = await Utils.createQuest({ parentId: this.quest.id });
            if (quest.isObservable) { quest.sheet.render(true, { focus: true }); }

            // if (this._questForm && this._questForm.rendered)
            // {
            //    this._questForm.bringToTop();
            // }
            // else
            // {
            //    this._questForm = new QuestForm({ parentId: this.quest.id }).render(true);
            // }
         });
      }
   }

   /**
    * When closing window, remove reference from global variable.
    *
    * Save the quest on close with no refresh of data.
    *
    * @returns {Promise<void>}
    * @inheritDoc
    */
   async close({ noSave = false, ...options } = {})
   {
      delete ViewManager.questPreview[this.quest.id];

      FQLDialog.closeDialogs({ questId: this.quest.id });

      // If a permission control app / dialog is open close it.
      if (this._permControl)
      {
         this._permControl.close();
         this._permControl = void 0;
      }

      if (!noSave && this.quest.isOwner)
      {
         await this.saveQuest({ refresh: false });
      }

      return super.close(options);
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @override
    * @inheritDoc
    */
   async getData(options = {}) // eslint-disable-line no-unused-vars
   {
      // const content = await Enrich.quest(this.quest);
      const content = QuestDB.getEnrich(this.quest.id);

      this.canEdit = game.user.isGM || (this.quest.isOwner && Utils.isTrustedPlayer());
      this.playerEdit = this.quest.isOwner;
      this.canAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);

      // By default all normal players and trusted players without ownership of a quest are always on the the default
      // tab 'details'. In the case of a trusted player who has permissions revoked to access the quest and is on the
      // 'management' the details tab needs to be activated. This is possible in 'getData' as it is fairly early in the
      // render process. At this time the internal state of the application is '1' for 'RENDERING'.
      if (!this.canEdit && this._tabs[0] && this._tabs[0].active !== 'details')
      {
         this._tabs[0].activate('details');
      }

      const data = {
         isGM: game.user.isGM,
         isPlayer: !game.user.isGM,
         canAccept: this.canAccept,
         canEdit: this.canEdit,
         playerEdit: this.playerEdit
      };

      return mergeObject(content, data);
   }

   /**
    * Refreshes the Quest Details window and emits Socket so other players get updated view as well
    *
    * @returns {Promise<void>}
    */
   async refresh()
   {
      Socket.refreshQuestPreview({
         questId: this.quest.parent ? [this.quest.parent, this.quest.id] : this.quest.id,
         focus: false
      });

      this.render(true, { focus: true });
   }

   /**
    * When rendering window, add reference to global variable.
    *
    * @see close()
    * @inheritDoc
    * @override
    */
   async render(force = false, options = { focus: true })
   {
      ViewManager.questPreview[this.quest.id] = this;

      return super.render(force, options);
   }

   /**
    * When editor is saved we simply save the quest. The editor content if any is available is saved inside 'saveQuest'.
    *
    * @override
    * @inheritDoc
    */
   async saveEditor()
   {
      return this.saveQuest();
   }

   /**
    * Save associated quest and refresh window
    *
    * @returns {Promise<void>}
    */
   async saveQuest({ refresh = true } = {})
   {
      for (const key of Object.keys(this.editors))
      {
         const editor = this.editors[key];

         if (editor.mce)
         {
            this.quest[key] = editor.mce.getContent();
            await super.saveEditor(key);
         }
      }

      await this.quest.save();

      return refresh ? this.refresh() : void 0;
   }
}
