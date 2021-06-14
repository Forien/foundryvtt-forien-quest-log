export default class Utils
{
   /**
    * Builds a UUID for the given actor / journal / item data.
    *
    * @param {object}   data - document data
    *
    * @param {string[]|undefined} type - Provide a list of Document types to build a UUID from given data. If the type
    *                                    doesn't match the data undefined is returned. If type is undefined any document
    *                                    will match.
    *
    * @returns {string|undefined}
    */
   static getUUID(data, type = void 0)
   {
      // 'type' doesn't match the data type.
      if (Array.isArray(type) && !type.includes(data.type)) { return void 0; }
      if (typeof type === 'string' && data.type !== type) { return void 0; }

      return typeof data.pack === 'string' ? `Compendium.${data.pack}.${data.id}` : `${data.type}.${data.id}`;
   }

   static findActor(actorId)
   {
      let actor = game.actors.get(actorId);

      if (actor === undefined || actor === null)
      {
         actor = game.actors.find((a) => a.name === actorId);
      }

      if (actor === undefined || actor === null)
      {
         return false;
      }

      return actor;
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
         // Currently there is no easy way to remove the 'embed' tab from TinyMCE / media plugin; this hides it.
         setup: (editor) =>
         {
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
}
