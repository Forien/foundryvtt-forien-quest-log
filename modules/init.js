import QuestAPI                  from './api/QuestAPI.js';
import QuestLogClass             from './apps/QuestLog.js';
import QuestFloatingWindowClass  from './apps/QuestFloatingWindow.js';
import QuestFolder               from './entities/QuestFolder.js';
import ModuleSettings            from './utility/ModuleSettings.js';
import Socket                    from './utility/Socket.js';
import Utils                     from './utility/Utils.js';
import Quest                     from './entities/Quest.js';
import QuestsCollection          from './entities/collection/QuestsCollection.js';
import QuestTracker              from './apps/QuestTracker.js';
import registerApiHooks          from './api/registerApiHooks.js';

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
   registerApiHooks();

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

Hooks.on('renderJournalDirectory', (app, html) =>
{
   const button = $(`<button class="quest-log-btn">${game.i18n.localize('ForienQuestLog.QuestLogButton')}</button>`);
   let footer = html.find('.directory-footer');
   if (footer.length === 0)
   {
      footer = $(`<footer class="directory-footer"></footer>`);
      html.append(footer);
   }
   footer.append(button);

   button.click(() =>
   {
      QuestLog.render(true);
   });

   if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder')))
   {
      const folderId = QuestFolder.get().id;
      const folder = html.find(`.folder[data-folder-id="${folderId}"]`);

      folder.remove();
   }
});

Hooks.on('getSceneControlButtons', (controls) =>
{
   const notes = controls.find((c) => c.name === 'notes');

   notes.tools.push({
      name: 'forien-quest-log',
      title: 'ForienQuestLog.QuestLogButton',
      icon: 'fas fa-pen-fancy',
      visible: true,
      onClick: () => QuestLog.render(true),
      button: true
   });

   notes.tools.push({
      name: 'forien-quest-log-floating-window',
      title: 'ForienQuestLog.FloatingQuestWindow',
      icon: 'fas fa-bookmark',
      visible: true,
      onClick: () => QuestFloatingWindow.render(true),
      button: true
   });

});


/**
 * Need to Update Quest Log with custom Hooks :c
 */
Hooks.on('updateJournalEntry', () =>
{
   if (ui.questTracker)
   {
      ui.questTracker.render();
   }
});
