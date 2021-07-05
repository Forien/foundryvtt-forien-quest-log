import ModuleSettings   from './ModuleSettings.js';
import registerHooks    from './control/registerHooks.js';
import Socket           from './control/Socket.js';
import QuestAPI         from './control/QuestAPI.js';
import QuestDB          from './control/QuestDB.js';
import Utils            from './control/Utils.js';
import ViewManager      from './control/ViewManager.js';
import Quest            from './model/Quest.js';
import QuestFolder      from './model/QuestFolder.js';
import QuestsCollection from './model/QuestsCollection.js';
import QuestPreview     from './view/preview/QuestPreview.js';
import DBMigration      from '../database/DBMigration.js';

import { constants, settings }   from './model/constants.js';

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
      QuestAPI
   };

   Object.freeze(moduleData.public);

   Hooks.callAll('ForienQuestLog.afterSetup');
});

Hooks.once('ready', async () =>
{
   // Only attempt to run DB migration for GM.
   if (game.user.isGM) { await DBMigration.migrate(); }

   CONST.ENTITY_TYPES?.push('Quest');
   CONST.ENTITY_LINK_TYPES?.push('Quest');

   CONFIG['Quest'] = {
      entityClass: Quest,
      documentClass: Quest,
      collection: QuestsCollection,
      sidebarIcon: 'fas fa-scroll',
      sheetClass: QuestPreview
   };

   game.collections.set('Quest', QuestsCollection);

   await QuestDB.init();
   await QuestFolder.initializeJournals();
   registerHooks();

   ViewManager.init();

   // Allow and process incoming socket data
   Socket.listen();

   Hooks.callAll('ForienQuestLog.afterReady');
});

Hooks.on('renderJournalDirectory', (app, html) =>
{
   if (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers))
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
         ViewManager.questLog.render(true);
      });
   }

   if (!(game.user.isGM && game.settings.get(constants.moduleName, settings.showFolder)))
   {
      const folder = QuestFolder.get();
      if (folder !== void 0)
      {
         const element = html.find(`.folder[data-folder-id="${folder.id}"]`);
         if (element !== void 0)
         {
            element.remove();
         }
      }
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
