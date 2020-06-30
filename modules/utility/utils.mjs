import QuestFolder from "../entities/quest-folder.mjs";

export default class Utils {
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

  static registerHandlebarsHelpers() {
    Handlebars.registerHelper('format', function(stringId, ...arrData) {
      let objData;
      if (typeof arrData[0] === 'object')
        objData = arrData[0];
      else
        objData = {...arrData};

      return game.i18n.format(stringId, objData);
    });
  }

  /**
   * Update Quests to use newer, flexible data format
   */
  static updateQuests() {
    if (!game.user.isGM) return;
    const rootFolder = QuestFolder.get('root');
    let questDirs = {
      active: '_fql_active',
      completed: '_fql_completed',
      failed: '_fql_failed',
      hidden: '_fql_hidden'
    };

    for (let key in questDirs) {
      const value = questDirs[key];
      let folder = game.journal.directory.folders.find(f => f.name === value);
      if (folder === undefined) continue;

      folder.content.forEach(entry => {
        let content = entry.data.content;
        content = JSON.parse(content);

        let isAvailable = false;
        if (key === 'hidden') {
          isAvailable = (entry.data.permission.default === 2 || content.personal);
        }
        content.id = entry._id;
        content.status = key;
        content.giver = null;

        if (isAvailable) {
          content.status = 'available';
        }

        let actor = content.actor || null;
        if (actor !== null) {
          let actorE = game.actors.get(actor);
          if (actorE) {
            content.giver = actorE.uuid;
          }
        }
        delete content.actor;

        content = JSON.stringify(content);
        entry.update({content: content, folder: rootFolder}, {diff: false});
      });

      folder.delete();
    }
  }
};
