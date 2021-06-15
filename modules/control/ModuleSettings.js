import QuestTracker from '../view/QuestTracker.js';

const s_QUEST_TRACKER_DEFAULT = { top: 80 };

export default class ModuleSettings
{
   /**
    * Registers various configuration settings for Module
    */
   static register()
   {
      game.settings.register('forien-quest-log', 'availableQuests', {
         name: 'ForienQuestLog.Settings.availableQuests.Enable',
         hint: 'ForienQuestLog.Settings.availableQuests.EnableHint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'allowPlayersDrag', {
         name: 'ForienQuestLog.Settings.allowPlayersDrag.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersDrag.EnableHint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'allowPlayersCreate', {
         name: 'ForienQuestLog.Settings.allowPlayersCreate.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersCreate.EnableHint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'allowPlayersAccept', {
         name: 'ForienQuestLog.Settings.allowPlayersAccept.Enable',
         hint: 'ForienQuestLog.Settings.allowPlayersAccept.EnableHint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'countHidden', {
         name: 'ForienQuestLog.Settings.countHidden.Enable',
         hint: 'ForienQuestLog.Settings.countHidden.EnableHint',
         scope: 'world',
         config: true,
         default: true,
         type: Boolean,
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'showTasks', {
         name: 'ForienQuestLog.Settings.showTasks.Enable',
         hint: 'ForienQuestLog.Settings.showTasks.EnableHint',
         scope: 'world',
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
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      game.settings.register('forien-quest-log', 'navStyle', {
         name: 'ForienQuestLog.Settings.navStyle.Enable',
         hint: 'ForienQuestLog.Settings.navStyle.EnableHint',
         scope: 'client',
         config: true,
         default: 'bookmarks',
         type: String,
         choices: {
            bookmarks: 'ForienQuestLog.Settings.navStyle.bookmarks',
            classic: 'ForienQuestLog.Settings.navStyle.classic'
         },
         onChange: () =>
         {
            // TODO: Need to replace this with game.modules.get(...).QuestLog
            if (QuestLog && QuestLog.rendered)
            {
               QuestLog.render();
            }
         }
      });

      /*
          game.settings.register('forien-quest-log', 'titleAlign', {
            name: 'ForienQuestLog.Settings.titleAlign.Enable',
            hint: 'ForienQuestLog.Settings.titleAlign.EnableHint',
            scope: 'client',
            config: true,
            default: 'left',
            type: String,
            choices: {
              'left': 'ForienQuestLog.Settings.titleAlign.left',
              'center': 'ForienQuestLog.Settings.titleAlign.center'
            },
            onChange: value => {
              if (QuestLog && QuestLog.rendered)
                QuestLog.render();
            }
          });
      */

      game.settings.register('forien-quest-log', 'showFolder', {
         name: 'ForienQuestLog.Settings.showFolder.Enable',
         hint: 'ForienQuestLog.Settings.showFolder.EnableHint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: () => game.journal.render()
      });

      game.settings.register('forien-quest-log', 'quest-tracker-position', {
         scope: 'client',
         config: false,
         default: s_QUEST_TRACKER_DEFAULT,
      });

      game.settings.register('forien-quest-log', 'enableQuestTracker', {
         name: 'ForienQuestLog.WorkshopPUF.Settings.enableQuestTracker.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.enableQuestTracker.hint',
         scope: 'world',
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            if (value && game.modules.get('forien-quest-log')?.active)
            {
               QuestTracker.init();
               ui.questTracker.render(true);
            }
            else
            {
               ui.questTracker.close();
            }
         }
      });

      game.settings.register('forien-quest-log', 'questTrackerBackground', {
         name: 'ForienQuestLog.WorkshopPUF.Settings.questTrackerBackground.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.questTrackerBackground.hint',
         scope: 'client',
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            if (ui.questTracker?.rendered)
            {
               ui.questTracker.element.toggleClass('background', value);
            }
         }
      });

      game.settings.register('forien-quest-log', 'resetQuestTracker', {
         name: 'ForienQuestLog.WorkshopPUF.Settings.resetQuestTracker.name',
         hint: 'ForienQuestLog.WorkshopPUF.Settings.resetQuestTracker.hint',
         scope: 'client',
         config: true,
         default: false,
         type: Boolean,
         onChange: (value) =>
         {
            if (value)
            {
               game.settings.set('forien-quest-log', 'quest-tracker-position', s_QUEST_TRACKER_DEFAULT);
               game.settings.set('forien-quest-log', 'resetQuestTracker', false);
               if (ui.questTracker?.rendered)
               {
                  ui.questTracker.render();
               }
            }
         }
      });
   }
}
