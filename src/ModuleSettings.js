import QuestDB       from './control/QuestDB.js';
import Utils         from './control/Utils.js';
import ViewManager   from './control/ViewManager.js';

import { constants, noteControls, settings } from './model/constants.js';

/**
 * The default location for the QuestTracker
 *
 * @type {{top: number}}
 */
const s_QUEST_TRACKER_DEFAULT = { top: 80 };

/**
 * Constants for setting scope type.
 *
 * @type {{world: string, client: string}}
 */
const scope = {
   client: 'client',
   world: 'world'
};

/**
 * Provides registration for all module settings.
 */
export default class ModuleSettings
{
   /**
    * Registers all module settings.
    *
    * @see {@link settings}
    */
   static register()
   {
      game.settings.register(constants.moduleName, settings.allowPlayersDrag, {
         name: 'ForienQuestLog.Settings.allowPlayersDrag.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersDrag.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.allowPlayersDrag, value); }

            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

            // Render all views; immediately stops / enables player drag if Quest view is open.
            ViewManager.renderAll({ force: true, questPreview: true });
         }
      });

      game.settings.register(constants.moduleName, settings.allowPlayersCreate, {
         name: 'ForienQuestLog.Settings.allowPlayersCreate.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersCreate.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.allowPlayersCreate, value); }

            // Render quest log to show / hide add quest button.
            if (ViewManager.questLog.rendered) { ViewManager.questLog.render(); }
         }
      });

      game.settings.register(constants.moduleName, settings.allowPlayersAccept, {
         name: 'ForienQuestLog.Settings.allowPlayersAccept.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersAccept.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.allowPlayersAccept, value); }

            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

            // Render all views as quest status actions need to be shown or hidden for some players.
            ViewManager.renderAll({ questPreview: true });
         }
      });

      game.settings.register(constants.moduleName, settings.trustedPlayerEdit, {
         name: 'ForienQuestLog.Settings.trustedPlayerEdit.Enable',
         hint: 'ForienQuestLog.Settings.trustedPlayerEdit.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.trustedPlayerEdit, value); }

            // Must perform a consistency check as there are possible quests that need to be added / removed
            // from the in-memory DB based on trusted player edit status.
            QuestDB.consistencyCheck();

            // Render all views as trusted player edit adds / removes capabilities.
            ViewManager.renderAll({ questPreview: true });
         }
      });

      game.settings.register(constants.moduleName, settings.countHidden, {
         name: 'ForienQuestLog.Settings.countHidden.Enable',
         hint: 'ForienQuestLog.Settings.countHidden.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.countHidden, value); }

            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

            // Must render the quest log / floating quest log / quest tracker.
            ViewManager.renderAll();
         }
      });

      game.settings.register(constants.moduleName, settings.dynamicBookmarkBackground, {
         name: 'ForienQuestLog.Settings.dynamicBookmarkBackground.Enable',
         hint: 'ForienQuestLog.Settings.dynamicBookmarkBackground.EnableHint',
         scope: scope.world,
         config: true,
         default: true,
         type: Boolean,
         onChange: () =>
         {
            // Must render the quest log.
            if (ViewManager.questLog.rendered) { ViewManager.questLog.render(); }
         }
      });

      // Currently provides a hidden setting to set the default abstract reward image.
      // It may never be displayed in the module settings menu, but if it is in the future this is where it would go.
      game.settings.register(constants.moduleName, settings.defaultAbstractRewardImage, {
         scope: 'world',
         config: false,
         default: 'icons/svg/item-bag.svg',
         type: String
      });

      game.settings.register(constants.moduleName, settings.navStyle, {
         name: 'ForienQuestLog.Settings.navStyle.Enable',
         hint: 'ForienQuestLog.Settings.navStyle.EnableHint',
         scope: scope.client,
         config: true,
         default: 'bookmarks',
         type: String,
         choices: {
            bookmarks: 'ForienQuestLog.Settings.navStyle.bookmarks',
            classic: 'ForienQuestLog.Settings.navStyle.classic'
         },
         onChange: () =>
         {
            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

            // Must render the quest log.
            if (ViewManager.questLog.rendered) { ViewManager.questLog.render(); }
         }
      });

      game.settings.register(constants.moduleName, settings.showTasks, {
         name: 'ForienQuestLog.Settings.showTasks.Enable',
         hint: 'ForienQuestLog.Settings.showTasks.EnableHint',
         scope: scope.world,
         config: true,
         default: 'default',
         type: String,
         choices: {
            default: 'ForienQuestLog.Settings.showTasks.default',
            onlyCurrent: 'ForienQuestLog.Settings.showTasks.onlyCurrent',
            no: 'ForienQuestLog.Settings.showTasks.no'
         },
         onChange: () =>
         {
            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

            // Must render the quest log.
            ViewManager.renderAll();
         }
      });

      game.settings.register(constants.moduleName, settings.defaultPermission, {
         name: 'ForienQuestLog.Settings.defaultPermissionLevel.Enable',
         hint: 'ForienQuestLog.Settings.defaultPermissionLevel.EnableHint',
         scope: scope.world,
         config: true,
         default: 'Observer',
         type: String,
         choices: {
            OBSERVER: 'ForienQuestLog.Settings.defaultPermissionLevel.OBSERVER',
            NONE: 'ForienQuestLog.Settings.defaultPermissionLevel.NONE',
            OWNER: 'ForienQuestLog.Settings.defaultPermissionLevel.OWNER'
         }
      });

      game.settings.register(constants.moduleName, settings.hideFQLFromPlayers, {
         name: 'ForienQuestLog.Settings.hideFQLFromPlayers.Enable',
         hint: 'ForienQuestLog.Settings.hideFQLFromPlayers.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: async(value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.hideFQLFromPlayers, value); }

            if (!game.user.isGM)
            {
               // Hide all FQL apps from non GM user and remove the ui.controls for FQL.
               if (value)
               {
                  ViewManager.closeAll({ questPreview: true });

                  const notes = ui?.controls?.controls.find((c) => c.name === 'notes');
                  if (notes) { notes.tools = notes?.tools.filter((c) => !c.name.startsWith(constants.moduleName)); }

                  // Remove all quests from in-memory DB. This is required so that users can not retrieve quests
                  // from the QuestAPI or content links in Foundry resolve when FQL is hidden.
                  QuestDB.removeAll();
               }
               else
               {
                  // Initialize QuestDB loading all quests that are currently observable for the user.
                  await QuestDB.init();

                  // Add back ui.controls
                  const notes = ui?.controls?.controls.find((c) => c.name === 'notes');
                  if (notes) { notes.tools.push(...noteControls); }
               }

               ui?.controls?.render(true);
            }

            // Render the journal to show / hide open quest log button & folder.
            game?.journal?.render();

            // Close or open the quest tracker based on active quests (users w/ FQL hidden will have no quests in
            // QuestDB)
            if (ViewManager.isQuestTrackerVisible())
            {
               ViewManager.questTracker.render(true, { focus: true });
            }
            else
            {
               ViewManager.questTracker.close();
            }
         }
      });

      game.settings.register(constants.moduleName, settings.notifyRewardDrop, {
         name: 'ForienQuestLog.Settings.notifyRewardDrop.Enable',
         hint: 'ForienQuestLog.Settings.notifyRewardDrop.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            if (game.user.isGM) { Utils.setMacroImage(settings.notifyRewardDrop, value); }
         }
      });

      game.settings.register(constants.moduleName, settings.showFolder, {
         name: 'ForienQuestLog.Settings.showFolder.Enable',
         hint: 'ForienQuestLog.Settings.showFolder.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: () => game.journal.render()  // Render the journal to show / hide the quest folder.
      });

      game.settings.register(constants.moduleName, settings.questTrackerPosition, {
         scope: scope.client,
         config: false,
         default: s_QUEST_TRACKER_DEFAULT,
      });

      game.settings.register(constants.moduleName, settings.enableQuestTracker, {
         name: 'ForienQuestLog.WorkshopPUF.Settings.enableQuestTracker.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.enableQuestTracker.hint',
         scope: scope.client,
         config: true,
         default: true,
         type: Boolean,
         onChange: (value) =>
         {
            // Swap macro image based on current state. No need to await.
            Utils.setMacroImage(settings.enableQuestTracker, value);

            // Show hide the quest tracker based on visible quests and this setting.
            if (ViewManager.isQuestTrackerVisible())
            {
               ViewManager.questTracker.render(true, { focus: true });
            }
            else
            {
               ViewManager.questTracker.close();
            }
         }
      });

      game.settings.register(constants.moduleName, settings.questTrackerBackground, {
         name: 'ForienQuestLog.WorkshopPUF.Settings.questTrackerBackground.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.questTrackerBackground.hint',
         scope: scope.client,
         config: true,
         default: true,
         type: Boolean,
         onChange: (value) =>
         {
            // Toggle the background CSS class for the quest tracker.
            if (ViewManager.questTracker.rendered)
            {
               ViewManager.questTracker.element.toggleClass('background', value);
            }
         }
      });

      game.settings.register(constants.moduleName, settings.resetQuestTracker, {
         name: 'ForienQuestLog.WorkshopPUF.Settings.resetQuestTracker.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.resetQuestTracker.hint',
         scope: scope.client,
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            if (value)
            {
               // Reset the quest tracker position.
               game.settings.set(constants.moduleName, settings.questTrackerPosition, s_QUEST_TRACKER_DEFAULT);
               game.settings.set(constants.moduleName, settings.resetQuestTracker, false);

               if (ViewManager.questTracker.rendered)
               {
                  ViewManager.questTracker.render();
               }
            }
         }
      });
   }
}
