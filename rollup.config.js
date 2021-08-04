import path       from 'path';

import commonjs   from '@rollup/plugin-commonjs';
import resolve    from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';        // Terser is used for minification / mangling
import virtual    from '@rollup/plugin-virtual';

// Terser config; refer to respective documentation for more information.
const terserConfig = {
   compress: { passes: 3 },
   mangle: { toplevel: true, keep_classnames: true, keep_fnames: true },
   ecma: 2020,
   module: true
};

// The deploy path for the server bundle which includes the common code.
const s_DEPLOY_PATH = './external';

const s_DEPLOY_MINIFY = true;

// Produce sourcemaps or not
const s_SOURCEMAP = true;

// Defines potential output plugins to use conditionally if the .env file indicates the bundles should be
// minified / mangled.
const outputPlugins = [];
if (s_DEPLOY_MINIFY)
{
   outputPlugins.push(terser(terserConfig));
}

/**
 * Defines the DOMPurify bundle. As per comments below a new method `sanitizeWithVideo` is added which allows
 * `iframes`, but only ones that have a `src` field with a YouTube video embed.
 *
 * @type {string}
 */
const s_DOM_PURIFY = `import DOMPurify from './node_modules/dompurify/dist/purify.es.js';

// Only allow YouTube and Vimeo embeds through.
const s_REGEX = new RegExp('^(https://www.youtube.com/embed/|https://player.vimeo.com/)');

// When 'iframes' are allowed only accept ones where 'src' starts with a YouTube embed link; reject all others.
DOMPurify.addHook('uponSanitizeElement', (node, data) => {
   if (data.tagName === 'iframe') 
   {
      const src = node.getAttribute('src') || '';
      if (!s_REGEX.test(src)) 
      {
         return node.parentNode.removeChild(node);
      }
   }
});

// Provide a new method that allows 'iframe' but with the 'src' requirement defined above.
// FORCE_BODY allows 'style' tags to be entered into TinyMCE code editor.
DOMPurify.sanitizeWithVideo = (dirty) =>
{
   return DOMPurify.sanitize(dirty,{
      ADD_TAGS: ['iframe'],
      ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
      FORCE_BODY: true
   });
}

export default DOMPurify;
`;

export default () =>
{
   return [
      {
         input: 'pack',
         output: [{
            file: `${s_DEPLOY_PATH}${path.sep}collect.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
         }],
         plugins: [
            virtual({
               pack: `export { collect as default } from './node_modules/collect.js/src/index.js';`
            }),
            resolve({ browser: true }),
            commonjs()
         ]
      },
      {
         input: 'pack',
         output: [{
            file: `${s_DEPLOY_PATH}${path.sep}DOMPurify.js`,
            format: 'es',
            plugins: outputPlugins,
            preferConst: true,
            sourcemap: s_SOURCEMAP,
         }],
         plugins: [
            virtual({
               pack: s_DOM_PURIFY
            })
         ]
      }
   ];
};
