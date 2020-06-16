import Quest from "./quest.mjs";
import QuestPreview from "./quest-preview.mjs";
import QuestForm from "./quest-form.mjs";

export default class QuestLog extends Application {
  sortBy = null;
  sortDirection = 'asc';

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log",
      classes: ["forien-quest-log"],
      template: "modules/forien-quest-log/templates/quest-log.html",
      width: 700,
      height: 480,
      minimizable: true,
      resizable: true,
      title: game.i18n.localize("ForienQuestLog.QuestLog.Title"),
      tabs: [{navSelector: ".log-tabs", contentSelector: ".log-body", initial: "progress"}]
    });
  }

  getData(options = {}) {
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM,
      showTasks: game.settings.get("forien-quest-log", "showTasks"),
      style: game.settings.get("forien-quest-log", "navStyle"),
      titleAlign: game.settings.get("forien-quest-log", "titleAlign"),
      questTypes: Quest.getQuestTypes(),
      quests: Quest.getQuests(this.sortBy, this.sortDirection)
    });
  }

  toggleSort(target) {
    if (this.sortBy === target) {
      this.sortDirection = (this.sortDirection === 'desc') ? 'asc' : 'desc';
    } else {
      this.sortBy = target;
      this.sortDirection = 'asc';
    }

    this.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", ".new-quest-btn", () => {
      new QuestForm({}).render(true);
    });

    html.on("click", ".actions i", event => {
      let questId = $(event.target).data('quest-id');
      let classList = $(event.target).attr('class');
      if (classList.includes('move')) {
        let target = $(event.target).data('target');
        Quest.move(questId, target);
      } else if (classList.includes('delete')) {
        Quest.delete(questId);
      }
    });

    html.on("click", ".title", event => {
      let questId = $(event.target).data('quest-id');
      let questPreview = new QuestPreview(questId);
      questPreview.render(true);
    });

    html.on("click", ".sortable", event => {
      let el = $(event.target);
      this.toggleSort(el.data('sort'));
    });
  }
};
