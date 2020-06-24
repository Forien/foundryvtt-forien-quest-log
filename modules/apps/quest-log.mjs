import Quest from "../entities/quest.mjs";
import QuestPreview from "./quest-preview.mjs";
import QuestForm from "./quest-form.mjs";
import renderWelcomeScreen from "../versioning/welcome-screen.mjs";

export default class QuestLog extends Application {
  sortBy = null;
  sortDirection = 'asc';

  /**
   * Default Application options
   *
   * @returns {Object}
   */
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

  _getHeaderButtons() {
    const buttons = super._getHeaderButtons();

    buttons.unshift({
      label: "",
      class: "help",
      icon: "fas fa-question-circle",
      onclick: ev => renderWelcomeScreen()
    });

    return buttons
  }

  /**
   * Retrieves Data to be used in rendering template.
   *
   * @param options
   * @returns {Promise<Object>}
   */
  getData(options = {}) {
    let available = game.settings.get("forien-quest-log", "availableQuests");
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM,
      availableTab: available,
      showTasks: game.settings.get("forien-quest-log", "showTasks"),
      style: game.settings.get("forien-quest-log", "navStyle"),
      titleAlign: game.settings.get("forien-quest-log", "titleAlign"),
      questTypes: Quest.getQuestTypes(),
      quests: Quest.getQuests(this.sortBy, this.sortDirection, available)
    });
  }

  /**
   * Set sort target and toggle direction. Refresh window
   *
   * @param target
   */
  toggleSort(target, direction = undefined) {
    if (this.sortBy === target) {
      this.sortDirection = (this.sortDirection === 'desc') ? 'asc' : 'desc';
    } else {
      this.sortBy = target;
      this.sortDirection = 'asc';
    }
    if (direction !== undefined && (direction === 'asc' || direction === 'desc'))
      this.sortDirection = direction;

    this.render(true);
  }

  /**
   * Defines all event listeners like click, drag, drop etc.
   *
   * @param html
   */
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

    html.on("dragstart", ".drag-quest", event => {
      let dataTransfer = {
        type: "Quest",
        id: $(event.target).data('quest-id')
      };
      event.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));

    });
  }
};
