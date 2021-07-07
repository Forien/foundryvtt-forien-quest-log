import QuestDB       from './control/QuestDB.js';
import ViewManager   from './control/ViewManager.js';

import { constants, noteControls, settings } from './model/constants.js';

const s_QUEST_TRACKER_DEFAULT = { top: 80 };

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
    * @see {link:settings}
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
         onChange: () =>
         {
            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

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
         onChange: () =>
         {
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
         onChange: () =>
         {
            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

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
         onChange: () =>
         {
            // Must perform a consistency check as there are possible quests that need to be added / removed
            // from the in-memory DB based on trusted player edit status.
            QuestDB.consistencyCheck();

            ViewManager.renderAll({ questPreview: true });
         }
      });

      game.settings.register(constants.moduleName, settings.countHidden, {
         name: 'ForienQuestLog.Settings.countHidden.Enable',
         hint: 'ForienQuestLog.Settings.countHidden.EnableHint',
         scope: scope.world,
         config: true,
         default: true,
         type: Boolean,
         onChange: () =>
         {
            // Must enrich all quests again in QuestDB.
            QuestDB.enrichAll();

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
            if (ViewManager.questLog.rendered) { ViewManager.questLog.render(); }
         }
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

            ViewManager.renderAll({ force: true });
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
            if (ViewManager.isQuestTrackerVisible())
            {
               ViewManager.questTracker.render(true, { focus: true });
            }
            else
            {
               ViewManager.questTracker.close();
            }

            if (!game.user.isGM)
            {
               // Hide all FQL windows from non GM user and remove the ui.controls for FQL.
               if (value)
               {
                  ViewManager.closeAll({ questPreview: true });

                  const notes = ui?.controls?.controls.find((c) => c.name === 'notes');
                  if (notes) { notes.tools = notes?.tools.filter((c) => !c.name.startsWith(constants.moduleName)); }

                  QuestDB.removeAll();
               }
               else  // Add back ui.controls
               {
                  const notes = ui?.controls?.controls.find((c) => c.name === 'notes');
                  if (notes) { notes.tools.push(...noteControls); }

                  await QuestDB.init();
               }

               ui?.controls?.render(true);
            }

            game?.journal?.render();
         }
      });

      game.settings.register(constants.moduleName, settings.notifyRewardDrop, {
         name: 'ForienQuestLog.Settings.notifyRewardDrop.Enable',
         hint: 'ForienQuestLog.Settings.notifyRewardDrop.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
      });

      game.settings.register(constants.moduleName, settings.showFolder, {
         name: 'ForienQuestLog.Settings.showFolder.Enable',
         hint: 'ForienQuestLog.Settings.showFolder.EnableHint',
         scope: scope.world,
         config: true,
         default: false,
         type: Boolean,
         onChange: () => game.journal.render()
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
         default: false,
         type: Boolean,
         onChange: () =>
         {
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
