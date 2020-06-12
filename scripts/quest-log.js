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
    FormApplication
    return buttons
  }

  async _render(force = false, options = {}) {
    await super._render(force, options);
  }

  getData(options = {}) {
    console.log(this.getQuestTypes());
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM,
      questTypes: this.getQuestTypes(),
      quests: this.getQuests()
    });
  }

  getQuestTypes() {
    return {
      progress: "ForienQuestLog.QuestTypes.InProgress",
      completed: "ForienQuestLog.QuestTypes.Completed",
      failed: "ForienQuestLog.QuestTypes.Failed",
      hidden: "ForienQuestLog.QuestTypes.Hidden"
    }
  }

  getQuests() {
    let quests = {};
    for (let [key, value] of Object.entries(this.questDirIds)) {
      if (key === 'root') continue;
      let folder = game.journal.directory.folders.find(f => f._id === value);
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

    console.log(content);
    return content;
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", ".new-quest-btn", event => {
      new ForienQuestLog.QuestLogForm({}).render(true);
    })
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
    return game.journal.directory.folders.find(f => f.name === game.questlog.questDirName.hidden);
  }

  async _updateObject(event, formData) {
    console.log(formData);
    let actor = ForienQuestLog.Utils.findActor(formData.actor);

    if (actor !== false) {
      actor = actor._id;
    }

    let title = formData.title;
    if (title.length === 0)
      title = 'New Quest';

    let tasks = formData.tasks.filter(t => t.length > 0).map(t => {
      return {
        name: t,
        completed: false
      }
    });

    let data = {
      actor: actor,
      title: title,
      description: formData.description,
      gmnotes: formData.gmnotes,
      tasks: tasks
    };

    let folder = this.getHiddenFolder();

    console.log(data);

    let journal = JournalEntry.create({
      name: title,
      content: JSON.stringify(data),
      folder: folder._id
    });
    console.log(journal);
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

    html.on("click", ".add-new-task", (event) => {
      renderTemplate('modules/forien-quest-log/templates/partials/quest-log-form-task.html', {}).then(el => {
        // let el = $('<div>').html('hi!');
        html.find('.list').append(el);
      });

    });
  }
};
