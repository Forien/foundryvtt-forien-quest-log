import FQLDialog        from './FQLDialog.js';
import QuestForm        from './QuestForm.js';
import Enrich           from '../control/Enrich.js';
import Fetch            from '../control/Fetch.js';
import QuestAPI         from '../control/QuestAPI.js';
import Socket           from '../control/Socket.js';
import { questTypes }   from '../model/constants.js';
import Utils            from '../utils/Utils.js';

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

      html.on('dragstart', '.quest-rewards .fa-sort', (event) =>
      {
         event.stopPropagation();
         const li = event.target.closest('li') || null;
         if (!li) { return; }

         const dataTransfer = {
            type: 'Reward',
            mode: 'Sort',
            index: $(li).data('index')
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
            index: $(li).data('index')
         };
         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
      });

      html.on('dragstart', '.item-reward', async (event) =>
      {
         const data = $(event.target).data('transfer');

         const document = await Utils.getDocumentFromUUID(data);

         if (document !== null)
         {
            const dataTransfer = {
               _fqlDrop: false,
               type: 'Item',
               data: document.data
            };
            event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));
         }
      });

      html.on('click', '.item-reward .editable-container', async (event) =>
      {
         event.stopPropagation();
         const data = $(event.currentTarget).data('transfer');

         await Utils.showSheetFromUUID(data, { editable: false });
      });

      html.on('click', '.quest-name', (event) =>
      {
         const id = $(event.currentTarget).data('id');
         QuestAPI.open(id);
      });

      html.on('click', '.open-actor-sheet', async (event) =>
      {
         const actorId = $(event.target).data('actor-id');

         await Utils.showSheetFromUUID(actorId, { editable: false });
      });

      if (this.canEdit)
      {
         html.on('click', '.actions i', async (event) =>
         {
            const target = $(event.target).data('target');
            const questId = $(event.target).data('id');
            const classList = $(event.target).attr('class');

            if (classList.includes('move'))
            {
               const quest = Fetch.quest(questId);

               if (quest && await quest.move(target))
               {
                  Socket.refreshQuestPreview(quest.id);

                  if (quest.parent) { Socket.refreshQuestPreview(quest.parent, false); }

                  const dirname = game.i18n.localize(questTypes[target]);
                  ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
                   { target: dirname }), {});
               }
            }
            else if (classList.includes('delete'))
            {
               const quest = Fetch.quest(questId);

               if (quest && await FQLDialog.confirmDelete(quest))
               {
                  Socket.deleteQuest(await quest.delete());
               }
            }
         });

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
               this.quest.sortRewards(data.index, dt?.dataset.index);
               await this.quest.save();
               Socket.refreshQuestPreview(this.quest.id);
            }
            else if (data.type === 'Item' && data._fqlDrop === void 0)
            {
               const uuid = Utils.getUUID(data);

               const item = await Enrich.giverFromUUID(uuid);

               this.quest.addReward({ type: 'Item', data: item, hidden: true });
               await this.saveQuest();
            }
         });

         html.on('drop', '.tasks-box', async (event) =>
         {
            event.preventDefault();
            const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

            if (data.mode === 'Sort' && data.type === 'Task')
            {
               const dt = event.target.closest('li.task') || null;
               this.quest.sortTasks(data.index, dt?.dataset.index);
               await this.quest.save();
               Socket.refreshQuestPreview(this.quest.id);
            }
         });

         html.on('drop', '.quest-giver-gc', async (event) =>
         {
            event.preventDefault();
            const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));

            const uuid = Utils.getUUID(data, ['Actor', 'Item', 'JournalEntry']);

            if (uuid !== void 0)
            {
               this.quest.giver = uuid;
               await this.saveQuest();
            }
         });

         html.on('click', '.editable', (event) =>
         {
            const target = $(event.target).data('target');

            if (target === undefined) { return; }

            let value = this.quest[target];
            let index = undefined;
            if (target === 'task.name')
            {
               index = $(event.target).data('index');
               value = this.quest.tasks[index].name;
            }
            if (target === 'reward.name')
            {
               index = $(event.target).data('index');
               value = this.quest.rewards[index].data.name;
            }

            value = value.replace(/'/g, '&quot;');
            const input = $(`<input type='text' class='editable-input' value='${value}' data-target='${target}' ${index !== undefined ? `data-index='${index}'` : ``}/>`);
            const parent = $(event.target).closest('.actions').prev('.editable-container');

            parent.html('');
            parent.append(input);
            input.focus();

            input.focusout(async (event) =>
            {
               const targetOut = $(event.target).data('target');
               const valueOut = $(event.target).val();
               let indexOut;

               switch (targetOut)
               {
                  case 'name':
                     this.quest.name = valueOut;
                     this.options.title = game.i18n.format('ForienQuestLog.QuestPreview.Title', this.quest);
                     break;

                  case 'task.name':
                     indexOut = $(event.target).data('index');
                     this.quest.tasks[indexOut].name = valueOut;
                     break;

                  case 'reward.name':
                     indexOut = $(event.target).data('index');
                     this.quest.rewards[indexOut].data.name = valueOut;
                     break;

                  default:
                     if (this.quest[targetOut] !== void 0) { this.quest[targetOut] = valueOut; }
                     break;
               }
               await this.saveQuest();
            });
         });

         html.on('click', '.del-btn', async (event) =>
         {
            const index = $(event.target).data('index');
            const target = $(event.target).data('target');

            if (target === 'tasks')
            {
               this.quest.removeTask(index);
            }
            else if (target === 'rewards')
            {
               this.quest.removeReward(index);
            }

            await this.saveQuest();
         });

         html.on('click', '.task .toggleState', async (event) =>
         {
            const index = $(event.target).data('task-index');
            this.quest.tasks[index].toggle();
            await this.saveQuest();
         });

         html.on('click', '.toggleImage', async () =>
         {
            this.quest.toggleImage();
            await this.saveQuest();
         });

         html.on('click', '.deleteQuestGiver', async () =>
         {
            this.quest.giver = null;
            await this.saveQuest();
         });

         html.on('click', '.changeGiverImgPos', async () =>
         {
            if (this.quest.giverImgPos === 'center')
            {
               this.quest.giverImgPos = 'top';
            }
            else
            {
               this.quest.giverImgPos = this.quest.giverImgPos === 'top' ? 'bottom' : 'center';
            }

            await this.saveQuest();
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
               if (value !== undefined && value.length)
               {
                  this.quest.addTask({ name: value, hidden: game.user.isGM });
               }
               await this.saveQuest();
            });
         });

         html.on('click', '.toggleHidden', async (event) =>
         {
            const target = $(event.target).data('target');
            const index = $(event.target).data('index');

            if (target === 'task')
            {
               this.quest.toggleTask(index);
               await this.saveQuest();
            }
            else if (target === 'reward')
            {
               this.quest.toggleReward(index);
               await this.saveQuest();
            }
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
               if (value !== undefined && value.length)
               {
                  this.quest.addReward({
                     data: {
                        name: value,
                        img: 'icons/svg/mystery-man.svg',
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
            const index = $(event.target).data('index');
            const currentPath = this.quest.rewards[index].data.img;
            await new FilePicker({
               type: 'image',
               current: currentPath,
               callback: async (path) =>
               {
                  this.quest.rewards[index].data.img = path;
                  await this.saveQuest();
               },
            }).browse(currentPath);
         });
      }

      if (game.user.isGM)
      {
         html.on('click', '.configure-perm-btn', () =>
         {
            if (this.quest.entry)
            {
               if (!this._permControl)
               {
                  this._permControl = new PermissionControl(this.quest.entry, {
                     top: Math.min(this.position.top, window.innerHeight - 350),
                     left: this.position.left + 125
                  });

                  Hooks.once('closePermissionControl', (app) =>
                  {
                     if (app.appId === this._permControl.appId)
                     {
                        this._permControl = void 0;
                        this.refresh();
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

         html.on('click', '.splash-image', async () =>
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


         html.on('click', '.add-subquest-btn', () =>
         {
            // If a permission control app / dialog is open close it.
            if (this._permControl)
            {
               this._permControl.close();
               this._permControl = void 0;
            }

            new QuestForm({ parentId: this.quest.id }).render(true);
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
   async close(options)
   {
      delete Utils.getFQLPublicAPI().questPreview[this.quest.id];

      // If a permission control app / dialog is open close it.
      if (this._permControl)
      {
         this._permControl.close();
         this._permControl = void 0;
      }

      if (this.quest.isOwner)
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
      const content = await Enrich.quest(this.quest);

      // WAS (06/11/21) this.canEdit = (content.playerEdit || game.user.isGM);
      // Due to the new document model in 0.8.x+ player editing is temporarily removed.
      this.canEdit = game.user.isGM;
      this.playerEdit = content.playerEdit;

      const data = {
         id: this.quest.id,
         isGM: game.user.isGM,
         canEdit: this.canEdit
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
      Socket.refreshQuestPreview(this.quest.parent ? [this.quest.parent, this.quest.id] : this.quest.id);

      this.render(true, { focus: true });
   }

   /**
    * When rendering window, add reference to global variable.
    *
    * @see close()
    * @inheritDoc
    */
   async render(force = false, options)
   {
      Utils.getFQLPublicAPI().questPreview[this.quest.id] = this;

      if (force) { this.quest.refresh(); }

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

   /**
    * Invoked by Socket to update this quest preview. If the current user no longer has permission then close the app.
    */
   socketRefresh()
   {
      if (this.quest && this.quest.isObservable)
      {
         this.render(true);
      }
      else
      {
         this.close();
      }
   }
}
