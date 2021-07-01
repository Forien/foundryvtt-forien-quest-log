import ModuleSettings            from './ModuleSettings.js';
import registerHooks             from './control/registerHooks.js';
import Socket                    from './control/Socket.js';
import QuestAPI                  from './control/QuestAPI.js';
import QuestDB                   from './control/QuestDB.js';
import Utils                     from './control/Utils.js';
import Quest                     from './model/Quest.js';
import QuestFolder               from './model/QuestFolder.js';
import QuestsCollection          from './model/QuestsCollection.js';
import QuestLogFloating          from './view/QuestLogFloating.js';
import QuestLog                  from './view/QuestLog.js';
import QuestPreview              from './view/QuestPreview.js';
import QuestTracker              from './view/QuestTracker.js';
import DBMigration               from '../database/DBMigration.js';
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
      QuestAPI,
      questLog: new QuestLog(),
      questLogFloating: new QuestLogFloating(),
      questPreview: {},
      questTracker: new QuestTracker(),
      closeAll: function({ questPreview = false, ...options } = {})
      {
         if (this.questLog.rendered) { this.questLog.close(options); }
         if (this.questLogFloating.rendered) { this.questLogFloating.close(options); }
         if (this.questTracker.rendered) { this.questTracker.close(options); }

         if (questPreview)
         {
            for (const qp of Object.values(this.questPreview))
            {
               qp.close(options);
            }
         }
      },
      renderAll: function({ force = false, questPreview = false, ...options } = {})
      {
         if (this.questLog.rendered) { this.questLog.render(force, options); }
         if (this.questLogFloating.rendered) { this.questLogFloating.render(force, options); }

         if (Utils.isQuestTrackerVisible())
         {
            this.questTracker.render(force, options);
         }
         else
         {
            this.questTracker.close();
         }

         if (questPreview)
         {
            for (const qp of Object.values(this.questPreview))
            {
               if (qp.rendered) { qp.render(force, options); }
            }
         }
      }
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

   if (Utils.isQuestTrackerVisible())
   {
      if (game.modules.get(constants.moduleName)?.active)
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
         Utils.getFQLPublicAPI().questLog.render(true);
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
