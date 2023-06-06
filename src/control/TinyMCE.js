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
    * In addition, a few extra options like support for the `Esc` key to cancel editing and providing a custom
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
         plugins: `emoticons image link lists typhonjs-oembed charmap table code save help`,
         toolbar: 'styles | formatgroup | removeformat | insertgroup | table | bulletgroup | customcode | save | help',
         toolbar_groups: {
            bulletgroup: {
               icon: 'unordered-list',
               tooltip: 'Lists',
               items: 'bullist | numlist'
            },
            formatgroup: {
               icon: 'format',
               tooltip: 'Formatting',
               items: 'fontfamily | fontsize | lineheight | forecolor backcolor'
            },
            insertgroup: {
               icon: 'plus',
               tooltip: 'Insert',
               items: 'link image typhonjs-oembed emoticons charmap hr'
            }
         },
         content_css: CONFIG.TinyMCE.content_css.concat(s_CSS_URL),
         contextmenu: false,  // Prefer default browser context menu
         font_size_formats: s_DEFAULT_FONT_SIZE,
         font_family_formats: s_DEFAULT_FONTS,
         file_picker_types: 'image media',
         image_advtab: true,
         line_height_formats: s_DEFAULT_LINE_HEIGHT,

         // For typhonjs-oembed plugin when loaded.
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
                        onAction: async () =>
                        {
                           // Defines the CSS selector to style the editor / content. Useful to style the background.
                           const backSelector = '<style>\n' +
                            `  #quest-${questId} .quest-${editorName} :where(.editor, .${editorName}) {\n` +
                            '  }\n' +
                            '</style>\n';

                           if (await Utils.copyTextToClipboard(backSelector))
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

                  const saveCallback = editor?.options?.get?.('save_onsavecallback');
                  if (typeof saveCallback === 'function')
                  {
                     // For TinyMCE v6 on Foundry v10+
                     setTimeout(() => saveCallback(), 0);
                  }
                  else
                  {
                     // For TinyMCE v5 on Foundry v9
                     setTimeout(() => editor?.execCallback?.('save_onsavecallback'), 0);
                  }
               }
            }));
         }
      };
   }
}

/**
 * Defines the CSS URL to load into TinyMCE when editing.
 *
 * Note: Foundry applies `getRoute` to add a route prefix as applicable.
 *
 * @type {string}
 */
const s_CSS_URL = '/modules/forien-quest-log/css/init-tinymce.css';

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
const s_DEFAULT_FONT_SIZE = '10.5pt 12pt 13pt 14pt 15pt 16pt 18pt 22pt 28pt 32pt 36pt 42pt 48pt 64pt';

/**
 * Defines the line-height styles available in the toolbar options.
 *
 * @type {string}
 */
const s_DEFAULT_LINE_HEIGHT = '0.8 0.9 1 1.1 1.2 1.3 1.4 1.5 1.75 2';

/**
 * Provides extra CSS styles to configure text and various elements in TinyMCE.
 *
 * @type {object}
 */
const s_DEFAULT_STYLE_FORMATS = [{
      title: "Styles",
      items: [
         {
            title: 'Blend Mode', items: [
               {
                  title: 'BM Unset', selector: '*', styles: {
                     'mix-blend-mode': 'unset'
                  }
               },
               {
                  title: 'BM Normal', selector: '*', styles: {
                     'mix-blend-mode': 'normal'
                  }
               },
               {
                  title: 'BM Multiply', selector: '*', styles: {
                     'mix-blend-mode': 'multiply'
                  }
               },
               {
                  title: 'BM Screen', selector: '*', styles: {
                     'mix-blend-mode': 'screen'
                  }
               },
               {
                  title: 'BM Overlay', selector: '*', styles: {
                     'mix-blend-mode': 'overlay'
                  }
               },
               {
                  title: 'BM Darken', selector: '*', styles: {
                     'mix-blend-mode': 'darken'
                  }
               },
               {
                  title: 'BM Lighten', selector: '*', styles: {
                     'mix-blend-mode': 'lighten'
                  }
               },
               {
                  title: 'BM Color Dodge', selector: '*', styles: {
                     'mix-blend-mode': 'color-dodge'
                  }
               },
               {
                  title: 'BM Color Burn', selector: '*', styles: {
                     'mix-blend-mode': 'color-burn'
                  }
               },
               {
                  title: 'BM Hard Light', selector: '*', styles: {
                     'mix-blend-mode': 'hard-light'
                  }
               },
               {
                  title: 'BM Soft Light', selector: '*', styles: {
                     'mix-blend-mode': 'soft-light'
                  }
               },
               {
                  title: 'BM Difference', selector: '*', styles: {
                     'mix-blend-mode': 'difference'
                  }
               },
               {
                  title: 'BM Exclusion', selector: '*', styles: {
                     'mix-blend-mode': 'exclusion'
                  }
               },
               {
                  title: 'BM Hue', selector: '*', styles: {
                     'mix-blend-mode': 'hue'
                  }
               },
               {
                  title: 'BM Saturation', selector: '*', styles: {
                     'mix-blend-mode': 'saturation'
                  }
               },
               {
                  title: 'BM Color', selector: '*', styles: {
                     'mix-blend-mode': 'color'
                  }
               },
               {
                  title: 'BM Luminosity', selector: '*', styles: {
                     'mix-blend-mode': 'luminosity'
                  }
               },
            ]
         },
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
            title: 'Filters', items: [
               {
                  title: 'No Filter', selector: '*', styles: {
                     filter: 'none'
                  }
               },
               {
                  title: 'Blur', items: [
                     {
                        title: 'Blur 1px', selector: '*', styles: {
                           filter: 'blur(1px)'
                        }
                     },
                     {
                        title: 'Blur 2px', selector: '*', styles: {
                           filter: 'blur(2px)'
                        }
                     },
                     {
                        title: 'Blur 3px', selector: '*', styles: {
                           filter: 'blur(3px)'
                        }
                     },
                     {
                        title: 'Blur 4px', selector: '*', styles: {
                           filter: 'blur(4px)'
                        }
                     },
                  ]
               },
               {
                  title: 'Drop Shadow', items: [
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
                  title: 'Grayscale', items: [
                     {
                        title: 'GS 25%', selector: '*', styles: {
                           filter: 'grayscale(25%)'
                        }
                     },
                     {
                        title: 'GS 50%', selector: '*', styles: {
                           filter: 'grayscale(50%)'
                        }
                     },
                     {
                        title: 'GS 75%', selector: '*', styles: {
                           filter: 'grayscale(75%)'
                        }
                     },
                     {
                        title: 'GS 100%', selector: '*', styles: {
                           filter: 'grayscale(100%)'
                        }
                     },
                  ]
               },
            ],
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
                     },
                     {
                        title: 'MT 25px', selector: '*', styles: {
                           inline: 'span',
                           'margin-top': '25px'
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
                     },
                     {
                        title: 'ML 25px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '25px'
                        }
                     },
                     {
                        title: 'ML 50px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '50px'
                        }
                     },
                     {
                        title: 'ML 75px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '75px'
                        }
                     },
                     {
                        title: 'ML 100px', selector: '*', styles: {
                           inline: 'span',
                           'margin-left': '100px'
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
                     },
                     {
                        title: 'MB 25px', selector: '*', styles: {
                           inline: 'span',
                           'margin-bottom': '25px'
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
                     },
                     {
                        title: 'MR 25px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '25px'
                        }
                     },
                     {
                        title: 'MR 50px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '50px'
                        }
                     },
                     {
                        title: 'MR 75px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '75px'
                        }
                     },
                     {
                        title: 'MR 100px', selector: '*', styles: {
                           inline: 'span',
                           'margin-right': '100px'
                        }
                     }
                  ]
               }
            ]
         },
         {
            title: 'Opacity', items: [
               {
                  title: 'OP 100%', selector: '*', styles: {
                     opacity: '1'
                  }
               },
               {
                  title: 'OP 90%', selector: '*', styles: {
                     opacity: '0.9'
                  }
               },
               {
                  title: 'OP 80%', selector: '*', styles: {
                     opacity: '0.8'
                  }
               },
               {
                  title: 'OP 70%', selector: '*', styles: {
                     opacity: '0.7'
                  }
               },
               {
                  title: 'OP 60%', selector: '*', styles: {
                     opacity: '0.6'
                  }
               },
               {
                  title: 'OP 50%', selector: '*', styles: {
                     opacity: '0.5'
                  }
               },
               {
                  title: 'OP 40%', selector: '*', styles: {
                     opacity: '0.4'
                  }
               },
               {
                  title: 'OP 30%', selector: '*', styles: {
                     opacity: '0.3'
                  }
               },
               {
                  title: 'OP 20%', selector: '*', styles: {
                     opacity: '0.2'
                  }
               },
               {
                  title: 'OP 10%', selector: '*', styles: {
                     opacity: '0.1'
                  }
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