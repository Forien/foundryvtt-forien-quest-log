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

  /**
   * Update Macros to use new global API
   */
  static updateMacros() {
    let macros = game.macros.filter(e => e.visible);

    macros.forEach((macro) => {
      let data = duplicate(macro);
      data.command = data.command.replace(/game\.questlog\./g, 'QuestLog.');
      data.command = data.command.replace(/game\.quests\./g, 'Quests.');

      macro.update(data);
    });
  }
};
