import ViewManager   from './ViewManager.js';
import Utils         from './Utils.js';

/**
 * Provides custom options for TinyMCE.
 */
export default class TinyMCE
{
   /**
    * Provides overrides for TinyMCE options. These options are selected for increased media embedding.
    *
    * In addition a few extra options like support for the `Esc` key to cancel editing and providing a custom
    * menu button for copying the background style selector useful for styling the background of the containing
    * element for the editor.
    *
    * Note the media include. Users can only input links to YouTube to create embeds without the need
    * to copy / paste iframe / embed code. Also note the setup function below which hides the embed option of TinyMCE.
    * Presently (06/10/21) there isn't a way to hide the embed tag. It should be noted though that the media field
    * of TinyMCE does have a XSS sanitation filter disabling scripts in embedded content.
    *
    * @param {object}   opts - Optional parameters.
    *
    * @param {string}   [opts.initialContent=''] - The initial content of the editor. Used to reset content via `Esc`
    *                                              key.
    *
    * @param {string}   [opts.questId] - The associated Quest ID for the editor.
    *
    * @param {string}   [opts.editorName] - Provides name / style selector for the given editor.
    *
    * @returns {object} TinyMCE options
    */
   static options({ initialContent = '', questId = void 0, editorName = void 0 } = {})
   {
      return {
         plugins: 'emoticons hr image link lists media charmap table code save help',
         toolbar: 'styleselect | formatgroup | insertgroup | table | bullist numlist | customcode | save | help',
         toolbar_groups: {
            formatgroup: {
               icon: 'format',
               tooltip: 'Formatting',
               items: 'fontsizeselect | forecolor backcolor | removeformat'
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
         valid_children: '+body[style]',
         setup: (editor) =>
         {
            editor.ui.registry.addMenuButton('customcode', {
               icon: 'sourcecode',
               fetch: (callback) =>
               {
                  const items = [
                     {
                        type: 'menuitem',
                        text: 'Edit Source',
                        icon: 'sourcecode',
                        onAction: () =>
                        {
                           editor.execCommand('mceCodeEditor');
                        }
                     }
                  ];

                  if (questId && editorName)
                  {
                     items.push({
                        type: 'menuitem',
                        text: 'Copy background style selector',
                        icon: 'code-sample',
                        onAction: () =>
                        {
                           // Defines the CSS selector to style the editor / content. Useful to style the background.
                           const backSelector = '<style>\n' +
                            `  #quest-${questId} .quest-${editorName} :where(.editor, .${editorName}) {\n` +
                            '  }\n' +
                            '</style>\n';

                           if (Utils.copyTextToClipboard(backSelector))
                           {
                              ViewManager.notifications.info(`Copied background style selector to clipboard.`);
                           }
                           else
                           {
                              ViewManager.notifications.warn(`Could not copy background style selector.`);
                           }
                        }
                     });
                  }

                  callback(items);
               }
            });

            // Close the editor on 'esc' key pressed; reset content; invoke the registered Foundry save callback with
            // a deferral via setTimeout.
            editor.on('keydown', ((e) =>
            {
               if (e.keyCode === 27)
               {
                  editor.resetContent(initialContent);
                  setTimeout(() => editor.execCallback('save_onsavecallback'), 0);
               }
            }));

            // Currently there is no easy way to remove the 'embed' tab from TinyMCE / media plugin; this hides it.
            editor.on('ExecCommand', (event) =>
            {
               const command = event.command;
               if (command === 'mceMedia')
               {
                  const tabElems = document.querySelectorAll(`div[role='tablist'] .tox-tab`);
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