import { constants, settings } from '../model/constants.js';

/**
 * Provides several general utility methods interacting with Foundry via UUID lookups to generating UUIDv4 internal
 * FQL IDs. There are also several general methods for Handlebars and TinyMCE setup.
 */
export default class Utils
{
   /**
    * Uses `document.execCommand('copy')` to copy the given text to the clipboard.
    *
    * @param {string}   text - Text to copy to the browser clipboard.
    *
    * @returns {boolean} Copy successful.
    */
   static copyTextToClipboard(text)
   {
      const textArea = document.createElement('textarea');

      // Place in the top-left corner of screen regardless of scroll position.
      textArea.style.position = 'fixed';
      textArea.style.top = '0';
      textArea.style.left = '0';

      // Ensure it has a small width and height. Setting to 1px / 1em
      // doesn't work as this gives a negative w/h on some browsers.
      textArea.style.width = '2em';
      textArea.style.height = '2em';

      // We don't need padding, reducing the size if it does flash render.
      textArea.style.padding = '0';

      // Clean up any borders.
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';

      // Avoid flash of the white box if rendered for any reason.
      textArea.style.background = 'transparent';

      textArea.value = text;

      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      let success = false;

      try
      {
         success = document.execCommand('copy');
      }
      catch (err) { /**/ }

      document.body.removeChild(textArea);

      return success;
   }

   /**
    * A convenience method to return the module data object for FQL.
    *
    * This is a scoped location where we can store any FQL data.
    *
    * @returns {object} The FQL module data object.
    */
   static getModuleData()
   {
      return game.modules.get(constants.moduleName);
   }

   /**
    * Parses a UUID and returns the component data parts.
    *
    * @param {string|object}  data - The UUID as a string or object with UUID key as a string.
    *
    * @returns {{id: string, type: string}|{id: string, type: string, pack: string}|*} UUID data parts
    */
   static getDataFromUUID(data)
   {
      const uuid = typeof data === 'string' ? data : data.uuid;

      if (typeof uuid !== 'string') { return void 0; }

      const match = uuid.match(/(\w+)/gm);

      switch (match.length)
      {
         case 2:
            return { type: match[0], id: match[1] };
         case 4:
            return { type: match[0], pack: `${match[1]}.${match[2]}`, id: match[3] };
         default:
            return void 0;
      }
   }

   /**
    * Gets a document for the given UUID. An error message will post if the UUID is invalid and a warning
    * message will be posted if the current `game.user` does not have permission to view the document.
    *
    * @param {string|object}  data - The UUID as a string or object with UUID key as a string.
    *
    * @param {boolean}  [permissionCheck] - The UUID as a string or object with UUID key as a string.
    *
    * @returns {Promise<void>}
    */
   static async getDocumentFromUUID(data, { permissionCheck = true } = {})
   {
      const uuid = typeof data === 'string' ? data : data.uuid;

      let document = null;

      try
      {
         const doc = await fromUuid(uuid);

         if (doc === null)
         {
            ui.notifications.error(game.i18n.format('ForienQuestLog.NoDocument', { uuid }));
            return null;
         }

         const checkPerm = typeof permissionCheck === 'boolean' ? permissionCheck : true;

         if (checkPerm && !doc.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER))
         {
            ui.notifications.warn('ForienQuestLog.NoPermission', { localize: true });
            return null;
         }

         document = doc;
      }
      catch (err)
      {
         ui.notifications.error(game.i18n.format('ForienQuestLog.NoDocument', { uuid }));
         console.error(err);
      }

      return document;
   }

   /**
    * Builds a UUID for the given actor / journal / item data.
    *
    * @param {object}   data - document data
    *
    * @param {string[]|undefined} type - Provide a list of Document types to build a UUID from given data. If the type
    *                                    doesn't match the data undefined is returned. If type is undefined any document
    *                                    will match.
    *
    * @returns {string|undefined} UUID
    */
   static getUUID(data, type = void 0)
   {
      // 'type' doesn't match the data type.
      if (Array.isArray(type) && !type.includes(data.type)) { return void 0; }
      if (typeof type === 'string' && data.type !== type) { return void 0; }

      return typeof data.pack === 'string' ? `Compendium.${data.pack}.${data.id}` : `${data.type}.${data.id}`;
   }

   /**
    * Returns whether the player is a trusted player and `trustedPlayerEdit` is enabled.
    *
    * @param {User} user - User to check for trusted status and `trustedPlayerEdit`.
    *
    * @returns {boolean} Is trusted player edit.
    */
   static isTrustedPlayerEdit(user = game.user)
   {
      return user.isTrusted && game.settings.get(constants.moduleName, settings.trustedPlayerEdit);
   }

   /**
    * Returns true if FQL is hidden from players. This will always return false if the user is a GM.
    *
    * @returns {boolean} Is FQL hidden from players.
    */
   static isFQLHiddenFromPlayers()
   {
      if (game.user.isGM) { return false; }

      return game.settings.get(constants.moduleName, settings.hideFQLFromPlayers);
   }

   /**
    * Sets an image based on boolean setting state for FQL macros.
    *
    * @param {string}   setting - Setting name.
    *
    * @returns {Promise<void>}
    */
   static async setMacroImage(setting)
   {
      for (const macroEntry of game.macros.contents)
      {
         const macroSetting = macroEntry.getFlag(constants.moduleName, 'macro-setting');
         if (macroSetting !== setting) { continue; }

         const state = game.settings.get(constants.moduleName, setting);

         const img = typeof state === 'boolean' && state ?
          `modules/forien-quest-log/assets/icons/macros/${setting}On.png` :
           `modules/forien-quest-log/assets/icons/macros/${setting}Off.png`;

         await macroEntry.update({ img }, { diff: false });
      }
   }

   /**
    * Shows a document sheet for the given UUID. An error message will post if the UUID is invalid and a warning
    * message will be posted if the current `game.user` does not have permission to view the document.
    *
    * @param {string|object}  data - The UUID as a string or object with UUID key as a string.
    *
    * @param {object}         [opts] - Optional parameters.
    *
    * @param {boolean}        [opts.permissionCheck=true] - Perform permission check.
    *
    * @param {...*}           [opts.options] - Options to pass to sheet render method.
    *
    * @returns {Promise<number|null>} The appId if rendered otherwise null.
    */
   static async showSheetFromUUID(data, { permissionCheck = true, ...options } = {})
   {
      const uuid = typeof data === 'string' ? data : data.uuid;

      try
      {
         const document = await fromUuid(uuid);

         if (document === null)
         {
            ui.notifications.error(game.i18n.format('ForienQuestLog.NoDocument', { uuid }));
            return null;
         }

         if (permissionCheck && !document.testUserPermission(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER))
         {
            ui.notifications.warn('ForienQuestLog.NoPermission', { localize: true });
            return null;
         }

         if (document?.sheet)
         {
            if (document.sheet.rendered)
            {
               document.sheet.bringToTop();
               return null;
            }
            else
            {
               document.sheet.render(true, options);
               return document.sheet.appId;
            }
         }
      }
      catch (err)
      {
         ui.notifications.error(game.i18n.format('ForienQuestLog.NoDocument', { uuid }));
         console.error(err);
         return null;
      }
   }

   /**
    * Preloads templates for partials
    */
   static preloadTemplates()
   {
      let templates = [
         "templates/partials/quest-log/tab.html",
         "templates/partials/quest-preview/gmnotes.html",
         "templates/partials/quest-preview/details.html",
         "templates/partials/quest-preview/management.html"
      ];

      templates = templates.map((t) => `modules/forien-quest-log/${t}`);
      loadTemplates(templates);
   }

   /**
    * Register additional Handlebars helpers. `format` allows invoking `game.i18n.format` from a Handlebars template.
    */
   static registerHandlebarsHelpers()
   {
      Handlebars.registerHelper('format', (stringId, ...arrData) =>
      {
         let objData;
         if (typeof arrData[0] === 'object')
         {
            objData = arrData[0];
         }
         else
         {
            objData = { ...arrData };
         }

         return game.i18n.format(stringId, objData);
      });
   }

   /**
    * Generates a UUID v4 compliant ID. This is used by Quest to attach a UUID to any data that isn't backed by a
    * FoundryVTT document. Right now that is particularly {@link Task}. All GUI interaction and storage in Quest data
    * that isn't based on an FVTT document must use a UUIDv4 to interact with this data. Lookups in Quest data must be
    * by UUIDv4 to find an index in Quest data arrays before modifying data. FQL is potentially a multi-user module
    * where many users could potentially be modifying Quest data that isn't backed by an FVTT document, so the Foundry
    * core DB won't be synching or resolving this data.
    *
    * This code is an evolution of the following Gist.
    * https://gist.github.com/jed/982883
    *
    * There is a public domain / free copy license attached to it that is not a standard OSS license...
    * https://gist.github.com/jed/982883#file-license-txt
    *
    * @returns {string} UUIDv4
    */
   static uuidv4()
   {
      return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c) =>
       (c ^ (window.crypto || window.msCrypto).getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
   }
}
