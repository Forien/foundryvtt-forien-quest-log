import QuestDB          from './QuestDB.js';
import QuestLog         from '../view/log/QuestLog.js';
import QuestLogFloating from '../view/QuestLogFloating.js';
import QuestTracker     from '../view/QuestTracker.js';

import { constants, questTypes, questTypesI18n, settings } from '../model/constants.js';

const Apps = {
   questLog: void 0,
   questLogFloating: void 0,
   questTracker: void 0,
   questPreview: {}
};

let s_ADD_QUEST_PREVIEW_ID;

export default class ViewManager
{
   static init()
   {
      Apps.questLog = new QuestLog();
      Apps.questLogFloating = new QuestLogFloating();
      Apps.questTracker = new QuestTracker();

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

   static get questLog() { return Apps.questLog; }

   static get questLogFloating() { return Apps.questLogFloating; }

   static get questPreview() { return Apps.questPreview; }

   static get questTracker() { return Apps.questTracker; }

   /**
    * @param {object}   options - Optional parameters
    *
    * @param {boolean}  [options.questPreview] -
    *
    * @param {object}   [options.options] -
    */
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
        QuestDB.getCount({ type: questTypes.active }) > 0;
   }

   /**
    * @param {object}   options - Optional parameters
    *
    * @param {boolean}  [options.force] -
    *
    * @param {boolean}  [options.questPreview] -
    *
    * @param {object}   [options.options] -
    */
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


/**
 * Provides a helper class to gate UI notifications that may come in from various players in a rapid fashion
 * through Socket. By default a 4 second delay is applied between each notification, but the last notification
 * received will always be displayed.
 */
class UINotifications
{
   constructor()
   {
      this._lastNotifyWarn = Date.now();
      this._lastNotifyInfo = Date.now();
   }

   warn(message, delay = 4000)
   {
      if (Date.now() - this._lastNotifyWarn > delay)
      {
         ui.notifications.warn(message);
         this._lastNotifyWarn = Date.now();
      }
      else
      {
         if (this._timeoutWarn)
         {
            clearTimeout(this._timeoutWarn);
            this._timeoutWarn = void 0;
         }

         this._timeoutWarn = setTimeout(() =>
         {
            ui.notifications.warn(message);
         }, delay);
      }
   }

   info(message, delay = 4000)
   {
      if (Date.now() - this._lastNotifyInfo > delay)
      {
         ui.notifications.info(message);
         this._lastNotifyInfo = Date.now();
      }
      else
      {
         if (this._timeoutInfo)
         {
            clearTimeout(this._timeoutInfo);
            this._timeoutInfo = void 0;
         }

         this._timeoutInfo = setTimeout(() =>
         {
            ui.notifications.info(message);
         }, delay);
      }
   }

   error(message)
   {
      ui.notifications.error(message);
   }
}

const s_NOTIFICATIONS = new UINotifications();
