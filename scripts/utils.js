ForienQuestLog.Utils = class {
 static findActor(actorId) {
    let actor = game.actors.get(actorId);
    if (actor === undefined || actor === null) {
      actor = game.actors.find(a => a.name === actorId);
    }

    if (actor === undefined || actor === null) {
      return false;
    }

    return actor;
  }

  /**
   * Preloads templates for partials
   */
  static preloadTemplates() {
    loadTemplates([
      "modules/forien-quest-log/templates/partials/quest-log-tab.html",
      "modules/forien-quest-log/templates/partials/quest-preview-gmnotes.html",
      "modules/forien-quest-log/templates/partials/quest-preview-details.html"
    ]);
  }
};
