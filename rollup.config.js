import path from 'path';

import commonjs   from '@rollup/plugin-commonjs';
import resolve    from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';        // Terser is used for minification / mangling
import virtual    from '@rollup/plugin-virtual';

// Terser config; refer to respective documentation for more information.
const terserConfig = {
   compress: { passes: 3 },
   mangle: { toplevel: true },
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

export default () =>
{
   return [{
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
            pack: `export { collect as default } from 'collect.js';`
         }),
         resolve({ browser: true }),
         commonjs()
      ]
   }];
};
