import ModuleSettings      from './control/ModuleSettings.js';
import registerHooks       from './control/registerHooks.js';
import Socket              from './control/Socket.js';
import QuestAPI            from './control/QuestAPI.js';
import Quest               from './model/Quest.js';
import QuestFolder         from './model/QuestFolder.js';
import QuestsCollection    from './model/QuestsCollection.js';
import QuestLogFloating from './view/QuestLogFloating.js';
import QuestLog            from './view/QuestLog.js';
import QuestTracker        from './view/QuestTracker.js';
import Utils               from './utils/Utils.js';

Hooks.once('init', () =>
{
   ModuleSettings.register();
   Utils.preloadTemplates();
   Utils.registerHandlebarsHelpers();
   Hooks.callAll('ForienQuestLog.afterInit');
});

Hooks.once('setup', () =>
{
   const moduleData = Utils.getModuleData();

   /**
    * @type {FQLPublicAPI}
    */
   moduleData.public = {
      QuestAPI,
      questLog: new QuestLog(),
      questLogFloating: new QuestLogFloating()
   };

   Object.freeze(moduleData.public);

   game.questPreview = {};

   Hooks.callAll('ForienQuestLog.afterSetup');
});

Hooks.once('ready', () =>
{
   // TODO verify that these values exist or a substitute.
   CONST.ENTITY_TYPES?.push('Quest');
   CONST.ENTITY_LINK_TYPES?.push('Quest');

   // TODO switch to documentClass / sheetClass
   CONFIG['Quest'] = {
      entityClass: Quest,
      // documentClass: Quest,
      collection: QuestsCollection,
      sidebarIcon: 'far fa-question-circle',
      // sheetClass: QuestPreview
   };

   game.collections.set('Quest', QuestsCollection);

   QuestFolder.initializeJournals();
   registerHooks();

   if (game.settings.get('forien-quest-log', 'enableQuestTracker'))
   {
      if (game.modules.get('forien-quest-log')?.active)
      {
         QuestTracker.init();
      }
   }

   // Allow and process incoming socket data
   Socket.listen();

   Hooks.callAll('ForienQuestLog.afterReady');
});