import ViewManager   from './ViewManager.js';
import Utils         from './Utils.js';

/**
 * Provides custom options for TinyMCE.
 *
 * Please see {@link CONFIG.TinyMCE} for the default Foundry options.
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
      // Strip out any unwanted custom items from other modules. Currently Monk's Extended Journals.
      const foundryBaseItems = CONFIG.TinyMCE.style_formats[0].items.filter((e) => e.title === 'Secret');
      const style_formats = [
         {
            title: "Custom",
            items: foundryBaseItems
         }
      ].concat(s_DEFAULT_STYLE_FORMATS);

      return {
         plugins: 'emoticons hr image link lists typhonjs-oembed charmap table code save help',
         toolbar: 'styleselect | formatgroup | removeformat | insertgroup | table | bulletgroup | customcode | save | help',
         toolbar_groups: {
            bulletgroup: {
               icon: 'unordered-list',
               tooltip: 'Lists',
               items: 'bullist | numlist'
            },
            formatgroup: {
               icon: 'format',
               tooltip: 'Formatting',
               items: 'fontselect | fontsizeselect | forecolor backcolor'
            },
            insertgroup: {
               icon: 'plus',
               tooltip: 'Insert',
               items: 'link image typhonjs-oembed emoticons charmap hr'
            }
         },
         content_css: CONFIG.TinyMCE.content_css.concat(s_CSS_URL),
         font_formats: s_DEFAULT_FONTS,
         fontsize_formats: s_DEFAULT_FONT_SIZE,
         file_picker_types: 'image media',
         image_advtab: true,
         oembed_live_embeds: false,
         oembed_default_width: 424,
         oembed_default_height: 238,
         oembed_disable_file_source: true,
         style_formats,
         table_class_list: s_DEFAULT_TABLE_CLASS_LIST,

         // This allows the manual addition of a style tag in the code editor.
         valid_children: '+body[style]',

         // Note we can include all internal tags as we prefilter the URL to make sure it is for YouTube then use the
         // oembed API to get the embed URL. Additionally DOMPurify is configured to only accept iframes from YouTube.
         extended_valid_elements: 'iframe[allow|allowfullscreen|frameborder|scrolling|class|style|src|width|height]',
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
         }
      };
   }
}

/**
 * Defines the CSS URL to load into TinyMCE when editing.
 *
 * @type {string}
 */
const s_CSS_URL = foundry.utils.getRoute('/modules/forien-quest-log/css/init-tinymce.css');

/**
 * Defines the fonts available.
 *
 * @type {string}
 */
const s_DEFAULT_FONTS = 'Almendra=Almendra,serif; Arial=arial,helvetica,sans-serif; ' +
'Arial Black=arial black,avant garde; Audiowide=Audiowide,cursive; Bilbo Swash Caps=Bilbo Swash Caps,cursive; ' +
'Book Antiqua=book antiqua,palatino; Brush Script MT=Brush Script MT,Brush Script Std,cursive; ' +
'Helvetica=helvetica; Impact=impact,chicago; MedievalSharp=MedievalSharp,cursive; Metamorphous=Metamorphous,cursive; ' +
'Modesto Condensed=Modesto Condensed,sans-serif; Nova Square=Nova Square,cursive; Signika=Signika,sans-serif; ' +
'Symbol=symbol';

/**
 * Defines the font sizes available in the toolbar options.
 *
 * @type {string}
 */
const s_DEFAULT_FONT_SIZE = '14pt 16pt 18pt 22pt 28pt 32pt 36pt 42pt 48pt 64pt';

/**
 * Provides extra CSS styles to configure text and various elements in TinyMCE.
 *
 * @type {object}
 */
const s_DEFAULT_STYLE_FORMATS = [{
      title: "Styles",
      items: [
         {
            title: 'Border', items: [
               {
                  title: 'No Border', selector: '*', styles: {
                     border: 'none'
                  }
               },
               {
                  title: 'Border Radius', items: [
                     {
                        title: 'BR None', selector: '*', styles: {
                           'border-radius': 'unset'
                        }
                     },
                     {
                        title: 'BR 4px', selector: '*', styles: {
                           'border-radius': '4px'
                        }
                     },
                     {
                        title: 'BR 8px', selector: '*', styles: {
                           'border-radius': '8px'
                        }
                     },
                     {
                        title: 'BR 16px', selector: '*', styles: {
                           'border-radius': '16px'
                        }
                     },
                  ]
               },
            ]
         },
         {
            title: 'Drop Shadow', items: [
               {
                  title: 'DS None', selector: '*', styles: {
                     filter: 'unset'
                  }
               },
               {
                  title: 'DS 2px', selector: '*', styles: {
                     filter: 'drop-shadow(2px 2px 2px black)'
                  }
               },
               {
                  title: 'DS 4px', selector: '*', styles: {
                     filter: 'drop-shadow(4px 4px 3px black)'
                  }
               },
               {
                  title: 'DS 8px', selector: '*', styles: {
                     filter: 'drop-shadow(8px 8px 6px black)'
                  }
               },
            ]
         },
         {
            title: 'Float', items: [
               {
                  title: 'Float Left', selector: '*', styles: {
                     float: 'left',
                     margin: '0 10px 0 0'
                  }
               },
               {
                  title: 'Float Right', selector: '*', styles: {
                     float: 'right',
                     margin: '0 0 0 10px'
                  }
               }
            ]
         },
         {
            title: "Fonts",
            items: [
               {
                  title: 'Line Height', items: [
                     {
                        title: 'LH Normal', selector: '*', styles: {
                           'line-height': 'normal'
                        }
                     },
                     {
                        title: 'LH 50%', selector: '*', styles: {
                           'line-height': '50%'
                        }
                     },
                     {
                        title: 'LH 75%', selector: '*', styles: {
                           'line-height': '75%'
                        }
                     },
                     {
                        title: 'LH 125%', selector: '*', styles: {
                           'line-height': '125%'
                        }
                     },
                     {
                        title: 'LH 150%', selector: '*', styles: {
                           'line-height': '150%'
                        }
                     }
                  ]
               },
               {
                  title: 'Neon', items: [
                     {
                        title: 'Neon Blue', selector: '*', styles: {
                           color: '#fff',
                           'text-shadow': '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #0073e6, 0 0 20px #0073e6, 0 0 25px #0073e6'
                        }
                     },
                     {
                        title: 'Neon Green', selector: '*', styles: {
                           color: '#fff',
                           'text-shadow': '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #00e704, 0 0 20px #00e704, 0 0 25px #00e704'
                        }
                     },
                     {
                        title: 'Neon Red', selector: '*', styles: {
                           color: '#fff',
                           'text-shadow': '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #e70000, 0 0 20px #e70000, 0 0 25px #e70000'
                        }
                     },
                     {
                        title: 'Neon Purple', selector: '*', styles: {
                           color: '#fff',
                           'text-shadow': '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #7900ea, 0 0 20px #7900ea, 0 0 25px #7900ea'
                        }
                     }
                  ]
               }
            ]
         },
         {
            title: 'Margin', items: [
               {
                  title: 'No Margin', selector: '*', styles: {
                     margin: 'unset'
                  }
               },
               {
                  title: 'Top', items: [
                     {
                        title: 'MT 5px', selector: '*', styles: {
                           inline: 'span',
                           'margin-top': '5px'
                        }
                     },
                     {
                        title: 'MT 10px', selector: '*', styles: {
                           inline: 'span',
                           'margin-top': '10px'
                        }
                     },
                     {
                        title: 'MT 15px', selector: '*', styles: {
                           inline: 'span',
                           'margin-top': '15px'
                        }
                     }
                  ]
               },
               {
                  title: 'Left', items: [
                     {
                        title: 'ML 5px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '5px'
                        }
                     },
                     {
                        title: 'ML 10px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '10px'
                        }
                     },
                     {
                        title: 'ML 15px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '15px'
                        }
                     }
                  ]
               },
               {
                  title: 'Bottom', items: [
                     {
                        title: 'MB 5px', selector: '*', styles: {
                           inline: 'span',
                           'margin-bottom': '5px'
                        }
                     },
                     {
                        title: 'MB 10px', selector: '*', styles: {
                           inline: 'span',
                           'margin-bottom': '10px'
                        }
                     },
                     {
                        title: 'MB 15px', selector: '*', styles: {
                           inline: 'span',
                           'margin-bottom': '15px'
                        }
                     }
                  ]
               },
               {
                  title: 'Right', items: [
                     {
                        title: 'MR 5px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '5px'
                        }
                     },
                     {
                        title: 'MR 10px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '10px'
                        }
                     },
                     {
                        title: 'MR 15px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '15px'
                        }
                     }
                  ]
               }
            ]
         },
      ]
   },
];

/**
 * Provides a class list for the table dialog.
 *
 * @type {object}
 */
const s_DEFAULT_TABLE_CLASS_LIST =  [
   { title: 'None', value: '' },
   { title: 'No Colors / Border', value: 'tmce-nocolors' },
];