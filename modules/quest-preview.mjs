import Quest from "./quest.mjs";
import Socket from "./socket.mjs";

export default class QuestPreview extends FormApplication {
  constructor(questId, options = {}) {
    super(options);
    this.quest = Quest.get(questId);
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
      title: game.i18n.localize("ForienQuestLog.QuestPreview.Title"),
      tabs: [{navSelector: ".quest-tabs", contentSelector: ".quest-body", initial: "details"}]
    });
  }

  async getData(options = {}) {
    let content = duplicate(this.quest);
    content = Quest.populate(content);

    return mergeObject(content, {
      isGM: game.user.isGM
    });
  }

  async _onSubmit(event, {updateData = null, preventClose = false, preventRender = false} = {}) {
    event.preventDefault();

    return false;
  }

  async _updateObject(event, formData) {
    event.preventDefault();

    return false;
  }

  async _onEditorSave(target, element, content) {
    this.quest[target] = content;
    this.saveQuest();
  }

  async saveQuest() {
    this.quest.save().then(() => {
      this.refresh();
    });
  }

  async refresh() {
    this.render(true);
    if (game.questlog.rendered)
      game.questlog.render(true);
    Socket.refreshQuestPreview(this.quest.id);
  }

  render(force = false, options = {}) {
    game.questPreview = this;
    if (force) this.quest.refresh();
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
      this.quest.toggleImage();
      this.saveQuest();
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
  }
};
