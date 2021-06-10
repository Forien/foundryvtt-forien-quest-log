import jsesc from './jsesc.mjs';

export default class Utils {
  /**
   * Decodes a base64 encoded escaped JSON string.
   *
   * Special handling of removing any leading / trailing HTML <p> tags is performed just in case someone happened to
   * view / save the JE entry without editing it. By default when doing this leading / trailing <p> tags are added and
   * need be removed before decoding.
   *
   * @param {string}  content - base64 encoded Journal Entry storing escaped JSON.
   *
   * @returns {object} Parsed JSON object.
   */
  static decodeJE(content) {
    // Strip leading / trailing HTML tags in case someone attempted to look at / modify the JE.
    content = content.replace(/^<p>/, '');
    content = content.replace(/<\/p>$/, '');

    return JSON.parse(atob(content));
  }

  /**
   * Escapes and encodes a JSON data object to base64 to store as a JournalEntry.
   *
   * @param {object}  object - A JSON data object.
   *
   * @returns {string} base64 encoded string.
   */
  static encodeJE(object)
  {
    return btoa(jsesc(object, { json: true }))
  }

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
};
