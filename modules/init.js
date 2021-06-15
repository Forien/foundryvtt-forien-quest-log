import QuestAPI                  from './api/QuestAPI.js';
import QuestLogClass             from './view/QuestLog.js';
import QuestFloatingWindowClass  from './view/QuestFloatingWindow.js';
import QuestFolder               from './model/QuestFolder.js';
import ModuleSettings            from './control/ModuleSettings.js';
import Socket                    from './control/Socket.js';
import Utils                     from './utils/Utils.js';
import Quest                     from './model/Quest.js';
import QuestsCollection          from './model/QuestsCollection.js';
import QuestTracker              from './view/QuestTracker.js';
import registerHooks          from './control/registerHooks.js';

Hooks.once('init', () =>
{
   ModuleSettings.register();
   Utils.preloadTemplates();
   Utils.registerHandlebarsHelpers();
   Hooks.callAll('ForienQuestLog.afterInit');
});

Hooks.once('setup', () =>
{
   window.Quests = QuestAPI;
   window.QuestLog = new QuestLogClass();
   window.QuestFloatingWindow = new QuestFloatingWindowClass();
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