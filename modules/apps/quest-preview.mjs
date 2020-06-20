import Quest from "../entities/quest.mjs";
import Socket from "../utility/socket.mjs";

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

  /**
   * Default Application options
   *
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-preview",
      classes: [],
      template: "modules/forien-quest-log/templates/quest-preview.html",
      width: 700,
      height: 540,
      minimizable: true,
      resizable: true,
      title: game.i18n.localize("ForienQuestLog.QuestPreview.Title"),
      tabs: [{navSelector: ".quest-tabs", contentSelector: ".quest-body", initial: "details"}]
    });
  }

  /**
   * Retrieves Data to be used in rendering template.
   *
   * @param options
   * @returns {Promise<Object>}
   */
  async getData(options = {}) {
    let content = duplicate(this.quest);
    content = Quest.populate(content);

    let data = {
      isGM: game.user.isGM
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
    if ( game.user.isGM ) {
      buttons.unshift({
        label: game.i18n.localize("ForienQuestLog.QuestPreview.HeaderButtons.Show"),
        class: "share-image",
        icon: "fas fa-eye",
        onclick: () => Socket.showQuestPreview(this.quest.id)
      });
    }
    return buttons;
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
  async _onEditorSave(target, element, content) {
    this.quest[target] = content;
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
    if (QuestLog.rendered)
      QuestLog.render(true);
    Socket.refreshQuestPreview(this.quest.id);
  }

  /**
   * When rendering window, add reference to global variable.
   *
   * @see close()
   * @returns {Promise<void>}
   */
  render(force = false, options = {}) {
    game.questPreview = this;
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
    delete game.questPreview;
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

    html.on("drop", ".rewards-box", async (event) => {
      event.preventDefault();
      let item;
      let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Item') {
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

    html.on("drop", ".quest-giver-gc", (event) => {
      event.preventDefault();
      let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Actor') {
        this.quest.actor = data.id;
        this.saveQuest();
      }
    });

    html.on('dragstart', '.item-reward', (event) => {
      let dataTransfer = {
        type: "Item",
        data: $(event.target).data('transfer')
      };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    });

    html.on("click", '.editable', (event) => {
      let target = $(event.target).data('target');
      let value = this.quest[target];
      let index = undefined;
      if (target === 'task.name') {
        index = $(event.target).data('index');
        value = this.quest.tasks[index].name;
      }

      let input = $(`<input type="text" class="editable-input" value="${value}" data-target="${target}" ${index !== undefined ? `data-index="${index}"` : ``}/>`);
      let parent = $(event.target).parent('.editable-container');

      parent.html('');
      parent.append(input);
      input.focus();

      input.focusout((event) => {
        let target = $(event.target).data('target');
        let value = $(event.target).val();

        switch (target) {
          case 'task.name':
            let index = $(event.target).data('index');
            this.quest.tasks[index].name = value;
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

    html.on("click", ".open-actor-sheet", (event) => {
      let actorId = $(event.target).data('actor-id');
      let actor = game.actors.get(actorId);
      if (actor.permission > 0)
        actor.sheet.render(true);
    });

    html.on("click", ".toggleImage", (event) => {
      this.quest.toggleImage().then(() => {
        this.saveQuest();
      });
    });

    html.on("click", "#personal-quest", (event) => {
      this.quest.togglePersonal().then(() => {
        this.saveQuest();
      });
    });

    html.on("click", ".personal-user", (event) => {
      let userId = $(event.target).data('user-id');
      let value = $(event.target).data('value');
      let permission = value ? 0 : 2;

      this.quest.savePermission(userId, permission).then(() => this.saveQuest());
    });

    html.on("click", ".add-new-task", (event) => {
      let div = $('<div class="task"></div>');
      let placeholder = $('<span><i class="fas fa-check hidden"></i></span>');
      let input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize("ForienQuestLog.SampleTask")}" />`);
      let box = $(event.target).parent().parent('.tasks-gc').find('.tasks-box');

      div.append(placeholder);
      div.append(input);
      box.append(div);

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
      let div = $('<div class="reward"></div>');
      let input = $(`<input type="text" class="editable-input" value="" placeholder="${game.i18n.localize("ForienQuestLog.SampleReward")}" />`);
      let box = $(event.target).parents('.rewards-gc').find('.rewards-box');

      $(box).children('.drop-info').each(function () {
        $(this).remove();
      });

      div.append(input);
      box.append(div);

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

    html.on("click", ".abstract-reward img", (event) => {
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
};
