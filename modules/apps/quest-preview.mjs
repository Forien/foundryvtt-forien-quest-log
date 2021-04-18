import Quest from "../entities/quest.mjs";
import Socket from "../utility/socket.mjs";
import QuestForm from "./quest-form.mjs";

export default class QuestPreview extends FormApplication {
  /**
   * Since Quest Preview shows data for single Quest, it needs a Quest instance or
   * there is no point in rendering it.
   *
   * @param questId
   * @param options
   */
  constructor(questId, options = {}) {
    super(options);
    this.quest = Quest.get(questId);
    if (!this.quest) throw new Error(game.i18n.localize("ForienQuestLog.QuestPreview.InvalidQuestId"));
  }

  set object(value) {}

  get object() {
    return this.quest;
  }

  /**
   * Default Application options
   *
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["forien-quest-preview"],
      template: "modules/forien-quest-log/templates/quest-preview.html",
      width: 700,
      height: 540,
      minimizable: true,
      resizable: true,
      title: game.i18n.localize("ForienQuestLog.QuestPreview.Title"),
      tabs: [{navSelector: ".quest-tabs", contentSelector: ".quest-body", initial: "details"}]
    });
  }

  /** @override */
  get id() {
    return `quest-${this.quest.id}`;
  }

  /**
   * Retrieves Data to be used in rendering template.
   *
   * @param options
   * @returns {Promise<Object>}
   */
  async getData(options = {}) {
    let quest = duplicate(this.quest);
    let content = Quest.populate(quest, this.quest.entry);
    this.canEdit = (content.playerEdit || game.user.isGM);
    this.playerEdit = content.playerEdit;

    let data = {
      id: this.quest.id,
      isGM: game.user.isGM,
      canEdit: this.canEdit
    };

    if (game.user.isGM) {
      let entry = game.journal.get(this.quest.id);
      data.users = game.users;
      data.observerLevel = CONST.ENTITY_PERMISSIONS.OBSERVER;

      data.users = game.users.map(u => {
        if (u.isGM) return;
        return {
          user: u,
          level: entry.data.permission[u._id],
          hidden: u.isGM
        };
      }).filter(u => u !== undefined);
    }

    return mergeObject(content, data);
  }

  /** @override */
  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    // Share Entry
    if (game.user.isGM) {
      buttons.unshift({
        label: game.i18n.localize("ForienQuestLog.QuestPreview.HeaderButtons.Show"),
        class: "share-quest",
        icon: "fas fa-eye",
        onclick: () => Socket.showQuestPreview(this.quest.id)
      });
    }

    if (this.quest.splash.length) {
      buttons.unshift({
        label: '',
        class: "splash-image",
        icon: "far fa-image",
        onclick: () => {
          (new ImagePopout(this.quest.splash, {shareable: true})).render(true)
        }
      });
    }

    buttons.unshift({
      label: '',
      class: "copy-link",
      icon: "fas fa-link",
      onclick: (event) => {
        const el = document.createElement('textarea');
        el.value = `@Quest[${this.quest.id}]{${this.quest.title}}`;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        ui.notifications.info(game.i18n.localize("ForienQuestLog.Notifications.LinkCopied"), {});
      }
    });

    return buttons;
  }

  getQuestName () {
    return this.quest.name;
  }

  /**
   * This might be a FormApplication, but we don't want Submit event to fire.
   * @param event
   * @param formData
   * @returns {Promise<boolean>}
   * @private
   */
  async _onSubmit(event, {updateData = null, preventClose = false, preventRender = false} = {}) {
    event.preventDefault();

    return false;
  }

  /**
   * This might be a FormApplication, but we don't want to update anything on submit.
   * @param event
   * @param formData
   * @returns {Promise<boolean>}
   * @private
   */
  async _updateObject(event, formData) {
    event.preventDefault();

    return false;
  }

  /**
   * When editor is saved, we want to update and save quest.
   *
   * @param target
   * @param element
   * @param content
   * @returns {Promise<void>}
   * @private
   */
  /** @override */
  saveEditor(name) {
    const editor = this.editors[name];
    this.quest[name] = editor.mce.getContent();
    super.saveEditor(name);
    this.saveQuest();
  }
  /**
   * Save associated quest and refresh window
   *
   * @returns {Promise<void>}
   */
  async saveQuest() {
    this.quest.save().then(() => {
      this.refresh();
    });
  }

  /**
   * Refreshes the Quest Details window and emits Socket so other players get updated view as well
   *
   * @returns {Promise<void>}
   */
  async refresh() {
    this.render(true);
    Socket.refreshQuestLog();
    Socket.refreshQuestPreview(this.quest.id);
    if (this.quest.parent) {
      Socket.refreshQuestPreview(this.quest.parent);
    }
  }

  /**
   * When rendering window, add reference to global variable.
   *
   * @see close()
   * @returns {Promise<void>}
   */
  render(force = false, options = {}) {
    game.questPreview[this.quest.id] = this;
    if (force) this.quest.refresh();
    return super.render(force, options);
  }

  /**
   * When closing window, remove reference from global variable.
   *
   * @see render()
   * @returns {Promise<void>}
   */
  async close() {
    delete game.questPreview[this.quest.id];
    await super.close();
  }

  /**
   * Retrieves Item from Compendium
   *
   * @param packId
   * @param itemId
   */
  async getItemFromPack(packId, itemId) {
    const pack = game.packs.get(packId);
    if (pack.metadata.entity !== "Item")
      return;
    return await pack.getEntity(itemId).then(ent => {
      delete ent._id;
      return ent;
    });
  }

  /**
   * Defines all event listeners like click, drag, drop etc.
   *
   * @param html
   */
  activateListeners(html) {
    super.activateListeners(html);

    html.on('click', '.splash-image-link', (event) => {
      (new ImagePopout(this.quest.splash, {shareable: true})).render(true)
    });

    html.on('dragstart', '.fa-sort', (event) => {
      event.stopPropagation();
      const li = event.target.closest('li') || null;
      if (!li) return;
      let dataTransfer = {
        mode: "Sort",
        index: $(li).data('index')
      };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    });

    html.on('dragstart', '.item-reward', (event) => {
      let dataTransfer = {
        type: "Item",
        data: $(event.target).data('transfer')
      };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    });

    html.on("click", ".item-reward", (event) => {
      let data = $(event.currentTarget).data('transfer');
      delete data._id;
      delete data.permission;
      let item = new CONFIG.Item.entityClass(data);
      item.sheet.render(true);
    });

    html.on("click", ".quest-name", (event) => {
      let id = $(event.currentTarget).data('id');
      Quests.open(id);
    });

    html.on("click", ".open-actor-sheet", (event) => {
      let actorId = $(event.target).data('actor-id');
      let actor = game.actors.get(actorId);
      if (actor?.permission > 0)
        actor.sheet.render(true);
    });

    if (this.canEdit) {
      html.on("click", ".actions i", async (event) => {
        const target = $(event.target).data('target');
        const questId = $(event.target).data('id');
        const classList = $(event.target).attr('class');

        if (classList.includes('move')) {
          Quest.move(questId, target).then(() => this.refresh());
        } else if (classList.includes('delete')) {
          Quest.delete(questId, this.quest.id).then(() => this.refresh());
        }
      });

      html.on("drop", ".rewards-box", async (event) => {
        event.preventDefault();
        let item;
        let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
        if (data.mode === 'Sort') {
          this.quest.sortRewards(event, data);
        } else if (data.type === 'Item') {
          if (data.pack) {
            item = await this.getItemFromPack(data.pack, data.id);
          } else if (data.data) {
            item = data.data;
          } else {
            let witem = game.items.get(data.id);
            if (!witem)
              return;
            item = duplicate(witem);
          }
          if (item) {
            this.quest.addReward({type: "Item", data: item});
            this.saveQuest();
          }
        }
      });

      html.on("drop", ".tasks-box", async (event) => {
        event.preventDefault();
        let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
        if (data.mode === 'Sort') {
          this.quest.sortTasks(event, data);
        }
      });

      html.on("drop", ".quest-giver-gc", (event) => {
        event.preventDefault();
        let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
        if (['Actor', 'Item', 'JournalEntry'].includes(data.type)) {
          this.quest.giver = `${data.type}.${data.id}`;
          this.saveQuest();
        }
      });

      html.on("click", '.editable', (event) => {
        let target = $(event.target).data('target');
        if (target === undefined) return;

        let value = this.quest[target];
        let index = undefined;
        if (target === 'task.name') {
          index = $(event.target).data('index');
          value = this.quest.tasks[index].name;
        }
        if (target === 'reward.name') {
          index = $(event.target).data('index');
          value = this.quest.rewards[index].data.name;
        }

        value = value.replace(/"/g, '&quot;');
        let input = $(`<input type="text" class="editable-input" value="${value}" data-target="${target}" ${index !== undefined ? `data-index="${index}"` : ``}/>`);
        let parent = $(event.target).closest('.actions').prev('.editable-container');

        parent.html('');
        parent.append(input);
        input.focus();

        input.focusout((event) => {
          let target = $(event.target).data('target');
          let value = $(event.target).val();
          let index;

          switch (target) {
            case 'task.name':
              index = $(event.target).data('index');
              this.quest.tasks[index].name = value;
              break;
            case 'reward.name':
              index = $(event.target).data('index');
              this.quest.rewards[index].data.name = value;
              break;
            default:
              if (this.quest[target] !== undefined)
                this.quest[target] = value;
          }
          this.saveQuest();
        });
      });

      html.on("click", '.del-btn', (event) => {
        let index = $(event.target).data('index');
        let target = $(event.target).data('target');

        if (target === 'tasks') {
          this.quest.removeTask(index);
        } else if (target === 'rewards') {
          this.quest.removeReward(index);
        }
        this.saveQuest();
      });

      html.on("click", '.task .toggleState', (event) => {
        let index = $(event.target).data('task-index');
        this.quest.tasks[index].toggle();
        this.saveQuest();
      });

      html.on("click", ".toggleImage", (event) => {
        this.quest.toggleImage().then(() => {
          this.saveQuest();
        });
      });

      html.on("click", ".deleteQuestGiver", (event) => {
        this.quest.giver = null;
        this.saveQuest();
      });

      html.on("click", ".changeGiverImgPos", (event) => {

        if(this.quest.giverImgPos == 'center')
        {
          this.quest.giverImgPos = 'top';
        }
        else
        {
          if(this.quest.giverImgPos == 'top')
            this.quest.giverImgPos = 'bottom';
          else
           this.quest.giverImgPos = 'center';
        }
          

        this.saveQuest();
      });
      
      

      html.on("click", ".add-new-task", (event) => {
        event.preventDefault();
        let li = $('<li class="task"></li>');
        let placeholder = $('<span><i class="fas fa-check hidden"></i></span>');
        let input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize("ForienQuestLog.SampleTask")}" />`);
        let box = $(event.target).closest('.quest-tasks').find('.tasks-box ul');

        li.append(placeholder);
        li.append(input);
        box.append(li);

        input.focus();

        input.focusout((event) => {
          let value = $(event.target).val();
          if (value !== undefined && value.length) {
            this.quest.addTask({
              name: value
            })
          }
          this.saveQuest();
        });
      });

      html.on("click", ".toggleHidden", (event) => {
        let target = $(event.target).data('target');
        let index = $(event.target).data('index');

        if (target === 'task') {
          this.quest.toggleTask(index).then(() => this.saveQuest());
        } else if (target === 'reward') {
          this.quest.toggleReward(index).then(() => this.saveQuest());
        }
      });

      html.on("click", ".add-abstract", (event) => {
        let li = $('<li class="reward"></li>');
        let input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize("ForienQuestLog.SampleReward")}" />`);
        let box = $(event.target).closest('.quest-rewards').find('.rewards-box ul');

        // $(box).children('.drop-info').each(function () {
        //   $(this).remove();
        // });

        li.append(input);
        box.append(li);

        input.focus();

        input.focusout((event) => {
          let value = $(event.target).val();
          if (value !== undefined && value.length) {
            this.quest.addReward({
              data: {
                name: value,
                img: 'icons/svg/mystery-man.svg'
              },
              type: 'Abstract'
            })
          }
          this.saveQuest();
        });
      });

      html.on("click", ".abstract-reward .reward-image", (event) => {
        let index = $(event.target).data('index');
        let currentPath = this.quest.rewards[index].data.img;
        new FilePicker({
          type: "image",
          current: currentPath,
          callback: path => {
            this.quest.rewards[index].data.img = path;
            this.saveQuest();
          },
        }).browse(currentPath);
      });
    }

    if (game.user.isGM) {
      html.on("click", "#personal-quest", (event) => {
        this.quest.togglePersonal().then(() => {
          this.saveQuest();
        });
      });

      html.on("click", ".personal-user", (event) => {
        let userId = $(event.target).data('user-id');
        let value = $(event.target).data('value');
        let permission = value ? 0 : (this.playerEdit ? 3 : 2);

        this.quest.savePermission(userId, permission).then(() => this.saveQuest());
      });

      html.on("click", ".splash-image", (event) => {
        let currentPath = this.quest.splash;
        new FilePicker({
          type: "image",
          current: currentPath,
          callback: path => {
            this.quest.splash = path;
            this.saveQuest();
          },
        }).browse(currentPath);
      });

      html.on("click", ".delete-splash", (event) => {
            this.quest.splash = "";
            this.saveQuest();
      });

      html.on("click", ".change-splash-pos", (event) => {
          if(this.quest.splashPos == 'center')
          {
            this.quest.splashPos = 'top';
          }
          else
          {
            if(this.quest.splashPos == 'top')
              this.quest.splashPos = 'bottom';
            else
             this.quest.splashPos = 'center';
          }
        this.saveQuest();
      });
      

      html.on("click", ".add-subquest-btn", (event) => {
        new QuestForm(this.quest, {subquest:true}).render(true);
      });

      html.on("click", "#player-edit", event => {
        let checked = $(event.target).prop('checked');
        let permission = checked ? 3 : 2;
        this.quest.savePermission('*', permission).then(() => this.saveQuest());
      });
    }
  }
};
