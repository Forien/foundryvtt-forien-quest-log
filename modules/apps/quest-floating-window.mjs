import Quest from "../entities/quest.mjs";
import QuestPreview from "./quest-preview.mjs";

export default class QuestFloatingWindow extends Application {
  sortBy = null;
  sortDirection = 'asc';

  /**
   * Default Application options
   *
   * @returns {Object}
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "forien-quest-log-floating-window",
      classes: ["sidebar-popout"],
      template: "modules/forien-quest-log/templates/quest-floating-window.html",
      width: 300,
      height: 480,
      minimizable: false,
      resizable: false,
      title: game.i18n.localize("ForienQuestLog.QuestLog.Title"),
    });
  }

  /**
   * Retrieves Data to be used in rendering template.
   *
   * @param options
   * @returns {Promise<Object>}
   */
  getData(options = {}) {
    return mergeObject(super.getData(), {
      options: options,
      isGM: game.user.isGM,
      showTasks: game.settings.get("forien-quest-log", "showTasks"),
      style: game.settings.get("forien-quest-log", "navStyle"),
      questTypes: Quest.getQuestTypes(),
      quests: Quest.getQuests(this.sortBy, this.sortDirection, false, true)
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

    html.on("click", ".folder-toggle", event => {
      let questId = $(event.target).closest('.folder-toggle').data('quest-id');
      $(`.directory-item[data-quest-id='${questId}']`).toggleClass('collapsed');
      $(`.folder-toggle[data-quest-id='${questId}'] i`).toggleClass('fas');
      $(`.folder-toggle[data-quest-id='${questId}'] i`).toggleClass('far');
      localStorage.setItem(`forien.questlog.folderstate-${questId}`,$(`.directory-item[data-quest-id='${questId}']`).hasClass('collapsed'));
    });

    html.on("click", ".quest-open", event => {
      let questId = $(event.target).closest('.quest-open').data('quest-id');
      let questPreview = new QuestPreview(questId);
      questPreview.render(true);
    });

    html.on("click", ".sortable", event => {
      let el = $(event.target);
      this.toggleSort(el.data('sort'));
    });

    // Open and close folders on rerender. Data is store in localstorage so
    // display is consistent after each render.
    for (let quest of Quest.getQuests(this.sortBy, this.sortDirection, false, true).active) {
        $(`.directory-item[data-quest-id='${quest.id}']`).toggleClass('collapsed',localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) === "true");
        $(`.folder-toggle[data-quest-id='${quest.id}'] i`).toggleClass('fas',localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) === "true");
        $(`.folder-toggle[data-quest-id='${quest.id}'] i`).toggleClass('far',localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) !== "true");
    }
  }
};
