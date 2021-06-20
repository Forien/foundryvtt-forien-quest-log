import ModuleSettings      from './control/ModuleSettings.js';
import registerHooks       from './control/registerHooks.js';
import Socket              from './control/Socket.js';
import QuestAPI            from './control/QuestAPI.js';
import Utils               from './control/Utils.js';
import Quest               from './model/Quest.js';
import QuestFolder         from './model/QuestFolder.js';
import QuestsCollection    from './model/QuestsCollection.js';
import QuestLogFloating    from './view/QuestLogFloating.js';
import QuestLog            from './view/QuestLog.js';
import QuestPreview        from './view/QuestPreview.js';
import QuestTracker        from './view/QuestTracker.js';

Hooks.once('init', () =>
{
   // Set the sheet to render quests.
   Quest.setSheet(QuestPreview);

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
      questLogFloating: new QuestLogFloating(),
      questPreview: {},
      questTracker: new QuestTracker()
   };

   Object.freeze(moduleData.public);

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
      documentClass: Quest,
      collection: QuestsCollection,
      sidebarIcon: 'fas fa-scroll',
      sheetClass: QuestPreview
   };

   game.collections.set('Quest', QuestsCollection);

   QuestFolder.initializeJournals();
   registerHooks();

   if (game.settings.get('forien-quest-log', 'enableQuestTracker'))
   {
      if (game.modules.get('forien-quest-log')?.active)
      {
         Utils.getFQLPublicAPI().questTracker.render(true);
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
      Utils.getFQLPublicAPI().questLog.render(true);
   });

   if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder')))
   {
      const folderId = QuestFolder.get().id;
      const folder = html.find(`.folder[data-folder-id="${folderId}"]`);

      if (folder) { folder.remove(); }
   }
});

/**
 * Remove option item for quest journal folder when any journal entry is rendered. This prevents users from placing
 * non-quest journals into the quest journal folder.
 */
Hooks.on('renderJournalSheet', (app, html) =>
{
   const folderId = QuestFolder.get().id;

   const option = html.find(`option[value="${folderId}"]`);

   if (option) { option.remove(); }
});
