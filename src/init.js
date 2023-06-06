import FQLHooks   from './control/FQLHooks.js';

// Initialize all hooks
FQLHooks.init();

/**
 * Handle loading the TyphonJS oEmbed TinyMCE plugin based on Foundry version.
 *
 * v9 of Foundry ships with TinyMCE v5.
 * v10 of Foundry ships with TinyMCE v6.
 */
Hooks.once('init', async () =>
{
   try
   {
      // Load oEmbed TinyMCE v6 plugin.
      await import('../external/typhonjs-oembed-v6.js');
   }
   catch (err)
   {
      console.warn(`ForienQuestLog warning: Failed to load TyphonJS oEmbed plugin.`);
   }
});