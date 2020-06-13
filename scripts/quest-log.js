ForienQuestLog.QuestLog = class extends Application {
  questDirName = {
    root: '_fql_quests',
    active: '_fql_active',
    completed: '_fql_completed',
    failed: '_fql_failed',
    hidden: '_fql_hidden'
  };

  questDirIds = {
    root: null,
    active: null,
    completed: null,
    failed: null,
    hidden: null
  };

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log",
      classes: ["forien-quest-log"],
      template: "modules/forien-quest-log/templates/quest-log.html",
      width: 700,
      height: 480,
      minimizable: true,
      resizable: true,
      title: "Quest Log",
      tabs: [{navSelector: ".log-tabs", contentSelector: ".log-body", initial: "progress"}]
    });
  }

  _getHeaderButtons() {
    let buttons = super._getHeaderButtons();

    return buttons
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
  }

  getData(options = {}) {
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM,
      showTasks: game.settings.get("forien-quest-log", "showTasks"),
      questTypes: this.getQuestTypes(),
      quests: this.getQuests()
    });
  }

  getQuestTypes() {
    return {
      active: "ForienQuestLog.QuestTypes.InProgress",
      completed: "ForienQuestLog.QuestTypes.Completed",
      failed: "ForienQuestLog.QuestTypes.Failed",
      hidden: "ForienQuestLog.QuestTypes.Hidden"
    }
  }

  getQuests() {
    let quests = {};
    for (let [key, value] of Object.entries(this.questDirIds)) {
      if (key === 'root') continue;
      let folder = game.folders.get(value);
      // let folder = game.journal.directory.folders.find(f => f._id === value);
      let entries = [];

      folder.content.forEach(entry => {
        // little hack to remove outer <p> if it's there
        let div = document.createElement("p");
        div.innerHTML = entry.data.content;
        let content = div.innerText;

        content = JSON.parse(content);
        content.id = entry._id;
        content = this.parseQuestContent(content);
        entries.push(content);
      });
      quests[key] = entries;
    }

    return quests;
  }

  parseQuestContent(content) {
    let actor = ForienQuestLog.Utils.findActor(content.actor);
    if (actor !== false)
      content.src = actor.img;

    content.tasks = {
      checked: content.tasks.filter(t => t.completed).length,
      total: content.tasks.length,
      tasks: content.tasks
    };

    return content;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", ".new-quest-btn", () => {
      new ForienQuestLog.QuestLogForm({}).render(true);
    });

    html.on("click", ".actions i", event => {
      let questId = $(event.target).data('quest-id');
      let classList = $(event.target).attr('class');
      if (classList.includes('move')) {
        let target = $(event.target).data('target');
        this.moveQuest(questId, target);
      } else if (classList.includes('delete')) {
        this.deleteQuest(questId);
      }
    });

    html.on("click", ".title", event => {
      let questId = $(event.target).data('quest-id');
      let questPreview = new ForienQuestLog.QuestPreview(questId);
      questPreview.render(true);
    });
  }

  async moveQuest(questId, target) {
    let journal = await this.getQuestJournalEntry(questId);
    let folder = this.getFolder(target);
    let permission = 2;
    if (target === 'hidden')
      permission = 0;

    journal.update({folder: folder._id, "permission.default": permission}).then(() => {
      game.questlog.render(true);
      ForienQuestLog.Socket.refreshQuestLog();
      let dirname = game.i18n.localize(this.getQuestTypes()[target]);
      ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved', {target: dirname}), {});
    });
  }

  async getQuestJournalEntry(questId) {
    return game.journal.get(questId);
    // return game.journal.entries.find(j => j._id === questId);
  }

  getFolder(target) {
    return game.journal.directory.folders.find(f => f.name === game.questlog.questDirName[target]);
  }

  async deleteQuestEntry(questId) {
    this.getQuestJournalEntry(questId).then((entry) => {
      entry.delete().then(() => {
        if (game.questlog.rendered)
          game.questlog.render(true);
        ForienQuestLog.Socket.refreshQuestLog();
      });
    });
  }

  async deleteQuest(questId) {
    this.getQuestJournalEntry(questId).then((entry) => {
      new Dialog({
        title: `Delete ${entry.name}`,
        content: "<h3>Are you sure?</h3>" +
          "<p>This quest and its data will be permanently deleted.</p>",
        buttons: {
          yes: {
            icon: '<i class="fas fa-trash"></i>',
            label: "Delete",
            callback: () => this.deleteQuestEntry(questId)
          },
          no: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
          }
        },
        default: 'yes'
      }).render(true);
    });
  }

  async initializeJournals() {
    let dirExists = this.folderExists();

    if (!dirExists) {
      let rootFolder = await Folder.create({name: this.questDirName.root, type: "JournalEntry", parent: null});

      for (let [key, value] of Object.entries(this.questDirName)) {
        if (key === 'root') continue;
        await Folder.create({name: value, type: "JournalEntry", parent: rootFolder._id});
      }
    }

    for (let key in this.questDirName) {
      let folder = await game.journal.directory.folders.find(f => f.name === this.questDirName[key]);
      this.questDirIds[key] = folder._id;
    }
  }

  /**
   * Preloads templates for partials
   */
  preloadTemplates() {
    loadTemplates([
      "modules/forien-quest-log/templates/partials/quest-log-tab.html"
    ]);
  }

  /**
   * Returns true if quest directory has been created
   *
   * @param folder
   * @returns {boolean}
   */
  folderExists(folder = 'root') {
    let result = game.journal.directory.folders.find(f => f.name === this.questDirName[folder]);

    return result !== undefined;
  }
};

ForienQuestLog.QuestLogForm = class extends FormApplication {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log-form",
      template: "modules/forien-quest-log/templates/quest-log-form.html",
      title: "Add new Quest",
      width: 940,
      height: 640,
      closeOnSubmit: true
    });
  }

  async getData(options = {}) {
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM
    });
  }

  getHiddenFolder() {
    return game.questlog.getFolder('hidden');
  }

  async _updateObject(event, formData) {
    let actor = ForienQuestLog.Utils.findActor(formData.actor);

    if (actor !== false) {
      actor = actor._id;
    }

    let title = formData.title;
    if (title.length === 0)
      title = 'New Quest';

    let tasks = [];
    if (formData.tasks !== undefined) {
      if (!Array.isArray(formData.tasks)) {
        formData.tasks = [formData.tasks];
      }
      tasks = formData.tasks.filter(t => t.length > 0).map(t => {
        return {
          name: t,
          completed: false
        }
      });
    }

    let data = {
      actor: actor,
      title: title,
      description: formData.description,
      gmnotes: formData.gmnotes,
      tasks: tasks
    };

    let folder = this.getHiddenFolder();

    JournalEntry.create({
      name: title,
      content: JSON.stringify(data),
      folder: folder._id
    }).then(() => {
      game.questlog.render(true);
      // players don't see Hidden tab, but assistant GM can, so emit anyway
      ForienQuestLog.Socket.refreshQuestLog();
    });
  }

  async _onEditorSave(target, element, content) {
    // keep function to override parent function
    // we don't need to submit form on editor save
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("change", "#actor", (event) => {
      let actorId = $(event.currentTarget).val();

      let actor = ForienQuestLog.Utils.findActor(actorId);

      if (actor !== false) {
        html.find('.actor-portrait').attr('src', actor.img).removeClass('hidden');
        html.find('.actor-name').text(actor.name).removeClass('hidden');
      }
    });

    html.on("drop", ".actor-data-fieldset", (event) => {
      event.preventDefault();
      let data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Actor') {
        html.find('#actor').val(data.id).change();
      }
    });

    html.on("click", ".add-new-task", () => {
      renderTemplate('modules/forien-quest-log/templates/partials/quest-log-form-task.html', {}).then(el => {
        html.find('.list').append(el);
      });
    });
  }
};

ForienQuestLog.QuestPreview = class extends FormApplication {
  questId;
  quest;

  constructor(questId, options = {}) {
    super(options);
    this.questId = questId;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-preview",
      classes: [],
      template: "modules/forien-quest-log/templates/quest-preview.html",
      width: 700,
      height: 540,
      minimizable: true,
      resizable: true,
      title: "Quest Details",
      tabs: [{navSelector: ".quest-tabs", contentSelector: ".quest-body", initial: "details"}]
    });
  }

  parseQuestContent(content) {
    let actor = ForienQuestLog.Utils.findActor(content.actor);
    if (actor !== false)
      content.actor = duplicate(actor);

    content.tasks = {
      checked: content.tasks.filter(t => t.completed).length,
      total: content.tasks.length,
      tasks: content.tasks
    };
    content.noRewards = (content.rewards === undefined || content.rewards.length === 0);
    if (content.noRewards) {
      content.rewards = [];
    } else {
      content.rewards.forEach((item) => {
        item.transfer = JSON.stringify(item.data);
      })
    }

    return content;
  }

  async getData(options = {}) {
    let entry = game.journal.get(this.questId);
    // little hack to remove outer <p> if it's there
    let div = document.createElement("p");
    div.innerHTML = entry.data.content;
    let content = div.innerText;

    content = JSON.parse(content);
    content = JSON.parse(content);

    this.quest = duplicate(content);

    content.id = entry._id;
    content = this.parseQuestContent(content);

    console.log(content);

    return mergeObject(content, {
      isGM: game.user.isGM
    });
  }

  async _updateObject(event, formData) {
    console.log(formData);
    // @todo
  }

  async _onEditorSave(target, element, content) {
    const formData = validateForm(this.form);
    let event = new Event("mcesave");
    return this._updateObject(event, formData);
    // @todo
  }

  async saveQuest() {
    let entry = game.journal.get(this.questId);
    entry.update({content: JSON.stringify(this.quest)}).then(() => {
      this.render(true);
      ForienQuestLog.Socket.refreshQuestPreview(this.questId);
    });
  }

  render(force = false, options = {}) {
    game.questPreview = this;
    return super.render(force, options);
  }

  async close() {
    delete game.questPreview;
    super.close();
  }

  async getItemFromPack(packId, itemId) {
    const pack = game.packs.get(packId);
    if (pack.metadata.entity !== "Item")
      return;
    return await pack.getEntity(itemId).then(ent => {
      // item = duplicate(ent);
      delete ent._id;
      return ent;
    });
  }

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
          if (this.quest.rewards === undefined) {
            this.quest.rewards = [];
          }
          this.quest.rewards.push({type: "Item", data: item});
          this.saveQuest();
        }
      }
    });

    html.on('dragstart', '.item-reward', (event) => {
      let dataTransfer = {
        type: "Item",
        data: $(event.target).data('transfer')
      };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
    });

    html.on("click", '.task input[type="checkbox"]', (event) => {
      let index = $(event.target).data('task-index');
      this.quest.tasks[index].completed = !this.quest.tasks[index].completed;
      this.saveQuest();
    });

    html.on("click", ".open-actor-sheet", (event) => {
      let actorId = $(event.target).data('actor-id');
      let actor = game.actors.get(actorId);
      if (actor.permission > 0)
        actor.sheet.render(true);
    });
  }
};
