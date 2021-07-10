import QuestDB          from './QuestDB.js';
import QuestLog         from '../view/log/QuestLog.js';
import QuestLogFloating from '../view/QuestLogFloating.js';
import QuestTracker     from '../view/QuestTracker.js';

import { constants, questTypes, questTypesI18n, settings } from '../model/constants.js';

/**
 * Locally stores the app instances which are accessible by getter methods.
 *
 * @type {{questLog: QuestLog, questLogFloating: QuestLogFloating, questPreview: Map<string, QuestPreview>,
 * questTracker: QuestTracker}}
 *
 * @see {@link ViewManager.questLog}
 * @see {@link ViewManager.questLogFloating}
 * @see {@link ViewManager.questPreview}
 * @see {@link ViewManager.questTracker}
 */
const Apps = {
   questLog: void 0,
   questLogFloating: void 0,
   questTracker: void 0,
   questPreview: new Map()
};

/**
 * Stores the QuestPreview app that is the current newly added quest. It needs to be closed before more quests can be
 * added as a gate to prevent many quests from being added rapidly.
 */
let s_ADD_QUEST_PREVIEW;

/**
 * Stores and manages all the GUI apps / view for FQL.
 */
export default class ViewManager
{
   /**
    * Initializes all GUI apps.
    */
   static init()
   {
      Apps.questLog = new QuestLog();
      Apps.questLogFloating = new QuestLogFloating();
      Apps.questTracker = new QuestTracker();

      if (ViewManager.isQuestTrackerVisible() && game.modules.get(constants.moduleName)?.active)
      {
         ViewManager.questTracker.render(true);
      }

      // Whenever a QuestPreview closes and matches any tracked app that is adding a new quest set it to undefined.
      Hooks.on('closeQuestPreview', (questPreview) =>
      {
         if (s_ADD_QUEST_PREVIEW === questPreview) { s_ADD_QUEST_PREVIEW = void 0; }
      });
   }

   /**
    * @returns {UINotifications} Returns the UINotifications helper.
    */
   static get notifications() { return s_NOTIFICATIONS; }

   /**
    * @returns {QuestLog} The main quest log app accessible from the left hand menu bar or
    *                     `Hook.call('ForienQuestLog.Open.QuestLog')`.
    *
    * @see {@link FQLHooks.openQuestLog}
    */
   static get questLog() { return Apps.questLog; }

   /**
    * @returns {QuestLogFloating} The floating quest log app accessible from the left hand menu bar or
    *                             `Hooks.call('ForienQuestLog.Open.QuestLogFloating')`.
    *
    * @see {@link FQLHooks.openQuestLogFloating}
    */
   static get questLogFloating() { return Apps.questLogFloating; }

   /**
    * @returns {Map<string, QuestPreview>} A Map that contains all currently rendered / visible QuestPreview instances
    *                                      indexed by questId / string which is the Foundry 'id' of quests and the
    *                                      backing journal entries.
    */
   static get questPreview() { return Apps.questPreview; }

   /**
    * @returns {QuestTracker} Returns the quest tracker overlap app. This app is accessible when module seting
    *                         {@link settings.enableQuestTracker} is enabled.
    */
   static get questTracker() { return Apps.questTracker; }

   /**
    * @param {object}      options - Optional parameters
    *
    * @param {boolean}     [options.questPreview=false] - If true closes all QuestPreview apps.
    *
    * @param {...object}   [options.options] - Optional parameters passed onto {@link Application.close}
    *
    * @see https://foundryvtt.com/api/Application.html#close
    */
   static closeAll({ questPreview = false, ...options } = {})
   {
      if (ViewManager.questLog.rendered) { ViewManager.questLog.close(options); }
      if (ViewManager.questLogFloating.rendered) { ViewManager.questLogFloating.close(options); }
      if (ViewManager.questTracker.rendered) { ViewManager.questTracker.close(options); }

      if (questPreview)
      {
         for (const qp of ViewManager.questPreview.values())
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
    * Renders all GUI apps including the quest tracker which may also be closed depending on
    * {@link ViewManager.isQuestTrackerVisible}. With the option `questPreview` set to true all QuestPreviews are also
    * rendered. Remaining options are forwarded onto the Foundry Application render method.
    *
    * @param {object}      options - Optional parameters
    *
    * @param {boolean}     [options.force] - Forces a data refresh.
    *
    * @param {boolean}     [options.questPreview] - Render all open QuestPreview apps.
    *
    * @param {...object}   [options.options] - Remaining options for the {@link Application.render} method.
    *
    * @see https://foundryvtt.com/api/Application.html#render
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
         for (const qp of ViewManager.questPreview.values())
         {
            if (qp.rendered) { qp.render(force, options); }
         }
      }
   }

   /**
    * Performs the second half of the quest addition view management.
    *
    * @param {object}   options - Optional parameters.
    *
    * @param {Quest}    options.quest - The new quest being added.
    *
    * @param {boolean}  [options.notify=true] - Post a UI notification with the quest name and the status / category.
    *
    * @param {boolean}  [options.swapTab=true] - If rendered switch to the QuestLog tab of the new quest status.
    */
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
         const questSheet = quest.sheet;
         questSheet.render(true, { focus: true });

         // Set current QuestPreview being tracked as the add app.
         s_ADD_QUEST_PREVIEW = questSheet;
      }
   }

   /**
    * The first half of the add quest action which verifies if there is a current "add" QuestPreview open. If so it
    * will bring the current add QuestPreview app to front, post a UI notification and return false. Otherwise returns
    * true indicating that a new quest can be added / created.
    *
    * @returns {boolean} Whether a new quest can be added.
    */
   static verifyQuestCanAdd()
   {
      if (s_ADD_QUEST_PREVIEW !== void 0)
      {
         if (s_ADD_QUEST_PREVIEW.rendered)
         {
            s_ADD_QUEST_PREVIEW.bringToTop();
            ViewManager.notifications.warn(game.i18n.localize('ForienQuestLog.Notifications.FinishQuestAdded'));
            return false;
         }
         else
         {
            s_ADD_QUEST_PREVIEW = void 0;
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
   /**
    */
   constructor()
   {
      /**
       * Stores the last notify warn time epoch in MS.
       *
       * @type {number}
       * @private
       */
      this._lastNotifyWarn = Date.now();

      /**
       * Stores the last notify info time epoch in MS.
       *
       * @type {number}
       * @private
       */
      this._lastNotifyInfo = Date.now();


      /**
       * Stores the last call to setTimeout for info messages, so that they can be cancelled as new notifications
       * arrive.
       *
       * @type {number}
       * @private
       */
      this._timeoutInfo = void 0;

      /**
       * Stores the last call to setTimeout for warn messages, so that they can be cancelled as new notifications
       * arrive.
       *
       * @type {number}
       * @private
       */
      this._timeoutWarn = void 0;
   }

   /**
    * Potentially gates `warn` UI notifications to prevent overloading the UI notification system.
    *
    * @param {string}   message - Message to post.
    *
    * @param {number}   delay - The delay in MS between UI notifications posted.
    */
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

   /**
    * Potentially gates `info` UI notifications to prevent overloading the UI notification system.
    *
    * @param {string}   message - Message to post.
    *
    * @param {number}   delay - The delay in MS between UI notifications posted.
    */
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

   /**
    * Post all error messages with no gating.
    *
    * @param {string}   message - Message to post.
    */
   error(message)
   {
      ui.notifications.error(message);
   }
}

/**
 * Stores the UINotifications instance to return in {@link ViewManager.notifications}.
 *
 * @type {UINotifications}
 */
const s_NOTIFICATIONS = new UINotifications();