import QuestDB from './QuestDB.js';

import { constants, settings }   from '../model/constants.js';

export default class Utils
{
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
    * A convenience method to return the module data object for FQL.
    *
    * This is a scoped location where we can store any FQL data.
    *
    * @returns {FQLPublicAPI} The FQL module data object.
    */
   static getFQLPublicAPI()
   {
      return this.getModuleData().public;
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
   static isTrustedPlayer(user = game.user)
   {
      return user.isTrusted && game.settings.get(constants.moduleName, settings.trustedPlayerEdit);
   }

   /**
    * Convenience method to determine if the QuestTracker is visible to the current user. Always for the GM when
    * QuestTracker is enabled, but only for users if `hideFromPlayers` is false. There must also be active quests for
    * the tracker to be visible.
    *
    * @returns {boolean} Whether the QuestTracker is visible.
    */
   static isQuestTrackerVisible()
   {
      return game.settings.get(constants.moduleName, settings.enableQuestTracker) &&
       (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers)) &&
        QuestDB.getActiveCount() > 0;
   }

   /**
    * Shows a document sheet for the given UUID. An error message will post if the UUID is invalid and a warning
    * message will be posted if the current `game.user` does not have permission to view the document.
    *
    * @param {string|object}  data - The UUID as a string or object with UUID key as a string.
    *
    * @param {object}         options - Options to pass to sheet render method.
    *
    * @returns {Promise<void>}
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
            }
            else
            {
               document.sheet.render(true, options);
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
    * Provides overrides for TinyMCE options. These options are selected for increased media embedding and restricting
    * source code editing. It's important to override the default Foundry options to explicitly disable source code
    * editing as there is no script filter on FQL quest data. Data entered normally into TinyMCE is escaped, but not
    * through the source code tool which is turned on by default in FoundryVTT core.
    *
    * Note the media include. Users can input links to YouTube / Vimeo to create embeds without the need
    * to copy / paste iframe / embed code. Also note the setup function below which hides the embed option of TinyMCE.
    * Presently (06/10/21) there isn't a way to hide the embed tag. It should be noted though that the media field
    * of TinyMCE does have a XSS sanitation filter disabling scripts in embedded content.
    *
    * @returns {object} TinyMCE options
    */
   static tinyMCEOptions()
   {
      return {
         plugins: "emoticons hr image link lists media charmap table save",
         toolbar: "styleselect | formatgroup | insertgroup | table | bullist numlist | save",
         toolbar_groups: {
            formatgroup: {
               icon: 'format',
               tooltip: 'Formatting',
               items: 'forecolor backcolor | removeformat'
            },
            insertgroup: {
               icon: 'plus',
               tooltip: 'Insert',
               items: 'link image media emoticons charmap hr'
            }
         },
         file_picker_types: 'image media',
         media_alt_source: false,
         media_poster: false,
         setup: (editor) =>
         {
            // Close the editor on 'esc' key pressed; reset content; invoke the registered Foundry save callback with
            // a deferral via setTimeout.
            editor.on('keydown', ((e) =>
            {
               if (e.keyCode === 27)
               {
                  editor.resetContent();
                  setTimeout(() => editor.execCallback('save_onsavecallback'), 0);
               }
            }));

            // Currently there is no easy way to remove the 'embed' tab from TinyMCE / media plugin; this hides it.
            editor.on('ExecCommand', (event) =>
            {
               const command = event.command;
               if (command === 'mceMedia')
               {
                  const tabElems = document.querySelectorAll('div[role="tablist"] .tox-tab');
                  tabElems.forEach((tabElem) =>
                  {
                     if (tabElem.innerText === 'Embed')
                     {
                        tabElem.style.display = 'none';
                     }
                  });
               }
            });
         }
      };
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
