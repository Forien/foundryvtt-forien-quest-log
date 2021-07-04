import QuestDB          from './QuestDB.js';
import QuestLog         from '../view/QuestLog.js';
import QuestLogFloating from '../view/QuestLogFloating.js';
import QuestTracker     from '../view/QuestTracker.js';

import { constants, questTypesI18n, settings } from '../model/constants.js';

let s_QUESTLOG;
let s_QUESTLOG_FLOATING;
const s_QUESTPREVIEW = {};
let s_QUESTTRACKER;

let s_ADD_QUEST_PREVIEW_ID;

let s_LAST_NOTIFY_MS = Date.now();

const s_NOTIFICATIONS = {
   warn: (message, delay = 4000) =>
   {
      if (Date.now() - s_LAST_NOTIFY_MS > delay)
      {
         ui.notifications.warn(message);
         s_LAST_NOTIFY_MS = Date.now();
      }
   },
   info: (message, delay = 4000) =>
   {
      if (Date.now() - s_LAST_NOTIFY_MS > delay)
      {
         ui.notifications.info(message);
         s_LAST_NOTIFY_MS = Date.now();
      }
   },
   error: (message) =>
   {
      ui.notifications.error(message);
   }
};

export default class ViewManager
{
   static init()
   {
      s_QUESTLOG = new QuestLog();
      s_QUESTLOG_FLOATING = new QuestLogFloating();
      s_QUESTTRACKER = new QuestTracker();

      if (ViewManager.isQuestTrackerVisible() && game.modules.get(constants.moduleName)?.active)
      {
         ViewManager.questTracker.render(true);
      }

      Hooks.on('closeQuestPreview', (questPreview) =>
      {
         if (ViewManager.addQuestPreviewId === questPreview.quest.id)
         {
            ViewManager.addQuestPreviewId = void 0;
         }
      });
   }

   static get addQuestPreviewId() { return s_ADD_QUEST_PREVIEW_ID; }
   static set addQuestPreviewId(questId) { s_ADD_QUEST_PREVIEW_ID = questId; }
   static get notifications() { return s_NOTIFICATIONS; }
   static get questLog() { return s_QUESTLOG; }
   static get questLogFloating() { return s_QUESTLOG_FLOATING; }
   static get questPreview() { return s_QUESTPREVIEW; }
   static get questTracker() { return s_QUESTTRACKER; }

   static closeAll({ questPreview = false, ...options } = {})
   {
      if (ViewManager.questLog.rendered) { ViewManager.questLog.close(options); }
      if (ViewManager.questLogFloating.rendered) { ViewManager.questLogFloating.close(options); }
      if (ViewManager.questTracker.rendered) { ViewManager.questTracker.close(options); }

      if (questPreview)
      {
         for (const qp of Object.values(ViewManager.questPreview))
         {
            qp.close(options);
         }
      }
   }

   /**
    * Convenience method to determine if the QuestTracker is visible to the current user. Always for the GM when
    * QuestTracker is enabled, but only for users if `hideFromPlayers` is false. There must also be active quests for
    * the tracker to be visible.
    *
    * @returns {boolean} Whether the QuestTracker is visible.
    */
   static isQuestTrackerVisible()
   {
      return game.settings.get(constants.moduleName, settings.enableQuestTracker) &&
       (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers)) &&
        QuestDB.getActiveCount() > 0;
   }

   static renderAll({ force = false, questPreview = false, ...options } = {})
   {
      if (ViewManager.questLog.rendered) { ViewManager.questLog.render(force, options); }
      if (ViewManager.questLogFloating.rendered) { ViewManager.questLogFloating.render(force, options); }

      if (ViewManager.isQuestTrackerVisible())
      {
         ViewManager.questTracker.render(force, options);
      }
      else
      {
         ViewManager.questTracker.close();
      }

      if (questPreview)
      {
         for (const qp of Object.values(ViewManager.questPreview))
         {
            if (qp.rendered) { qp.render(force, options); }
         }
      }
   }

   static questAdded({ quest, notify = true, swapTab = true } = {})
   {
      if (notify)
      {
         ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestAdded', {
            name: quest.name,
            status: game.i18n.localize(questTypesI18n[quest.status])
         }));
      }

      if (swapTab)
      {
         const questLog = ViewManager.questLog;
         if (questLog._tabs[0] && quest.status !== questLog?._tabs[0]?.active && null !== questLog?._tabs[0]?._nav)
         {
            questLog._tabs[0].activate(quest.status);
         }
      }

      if (quest.isObservable)
      {
         ViewManager.addQuestPreviewId = quest.id;

         const questSheet = quest.sheet;
         questSheet.render(true, { focus: true });
      }
   }

   static verifyQuestCanAdd()
   {
      if (ViewManager.addQuestPreviewId !== void 0)
      {
         const qPreview = ViewManager.questPreview[ViewManager.addQuestPreviewId];
         if (qPreview && qPreview.rendered)
         {
            qPreview.bringToTop();
            ViewManager.notifications.warn(game.i18n.localize('ForienQuestLog.Notifications.FinishQuestAdded'));
            return false;
         }
         else
         {
            ViewManager.addQuestPreviewId = void 0;
         }
      }
      return true;
   }
}