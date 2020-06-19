export default  class Utils {
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
    let templates = [
      "templates/partials/quest-log/tab.html",
      "templates/partials/quest-preview/gmnotes.html",
      "templates/partials/quest-preview/details.html",
      "templates/partials/quest-preview/management.html"
    ];

    templates = templates.map(t => `modules/forien-quest-log/${t}`);
    loadTemplates(templates);
  }
};
