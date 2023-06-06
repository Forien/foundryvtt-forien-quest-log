import QuestDB       from './QuestDB.js';
import QuestLog      from '../view/log/QuestLog.js';
import QuestPreview  from '../view/preview/QuestPreview.js';
import QuestTracker  from '../view/tracker/QuestTracker.js';

import { constants, questStatus, questStatusI18n, settings } from '../model/constants.js';

/**
 * Locally stores the app instances which are accessible by getter methods.
 *
 * @type {{questLog: QuestLog, questPreview: Map<string, QuestPreview>, questTracker: QuestTracker}}
 *
 * @see {@link ViewManager.questLog}
 * @see {@link ViewManager.questPreview}
 * @see {@link ViewManager.questTracker}
 */
const Apps = {
   questLog: void 0,
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
      Apps.questTracker = new QuestTracker();

      // Load and set the quest tracker position from settings.
      try
      {
         const position = JSON.parse(game.settings.get(constants.moduleName, settings.questTrackerPosition));
         if (position && position.width && position.height)
         {
            Apps.questTracker.position = position;
         }
      }
      catch (err) { /**/ }

      ViewManager.renderOrCloseQuestTracker();

      // Whenever a QuestPreview closes and matches any tracked app that is adding a new quest set it to undefined.
      Hooks.on('closeQuestPreview', s_QUEST_PREVIEW_CLOSED);
      Hooks.on('renderQuestPreview', s_QUEST_PREVIEW_RENDER);

      // Right now ViewManager responds to permission changes across add, remove, update of quests.
      Hooks.on(QuestDB.hooks.addQuestEntry, s_QUEST_ENTRY_ADD);
      Hooks.on(QuestDB.hooks.removeQuestEntry, s_QUEST_ENTRY_REMOVE);
      Hooks.on(QuestDB.hooks.updateQuestEntry, s_QUEST_ENTRY_UPDATE);
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
    * @returns {Map<string, QuestPreview>} A Map that contains all currently rendered / visible QuestPreview instances
    *                                      indexed by questId / string which is the Foundry 'id' of quests and the
    *                                      backing journal entries.
    */
   static get questPreview() { return Apps.questPreview; }

   /**
    * @returns {QuestTracker} Returns the quest tracker overlap app. This app is accessible when module setting
    *                         {@link FQLSettings.questTrackerEnable} is enabled.
    */
   static get questTracker() { return Apps.questTracker; }

   /**
    * @param {object}   opts - Optional parameters
    *
    * @param {boolean}  [opts.questPreview=false] - If true closes all QuestPreview apps.
    *
    * @param {...*}     [opts.options] - Optional parameters passed onto {@link Application.close}
    *
    * @see https://foundryvtt.com/api/Application.html#close
    */
   static closeAll({ questPreview = false, ...options } = {})
   {
      if (ViewManager.questLog.rendered) { ViewManager.questLog.close(options); }
      if (ViewManager.questTracker.rendered) { ViewManager.questTracker.close(options); }

      if (questPreview)
      {
         for (const qp of ViewManager.questPreview.values()) { qp.close(options); }
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
      return game.settings.get(constants.moduleName, settings.questTrackerEnable) &&
       (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers)) &&
        QuestDB.getCount({ status: questStatus.active }) > 0;
   }

   /**
    * Refreshes local {@link QuestPreview} apps.
    *
    * @param {string|string[]}   questId - A single quest ID or an array of IDs to update.
    *
    * @param {RenderOptions}     [options] - Any options to pass onto QuestPreview render method invocation.
    */
   static refreshQuestPreview(questId, options = {})
   {
      // Handle local QuestPreview rendering.
      if (Array.isArray(questId))
      {
         for (const id of questId)
         {
            const questPreview = ViewManager.questPreview.get(id);
            if (questPreview !== void 0) { questPreview.render(true, options); }
         }
      }
      else
      {
         const questPreview = ViewManager.questPreview.get(questId);
         if (questPreview !== void 0) { questPreview.render(true, options); }
      }
   }

   /**
    * Renders all GUI apps including the quest tracker which may also be closed depending on
    * {@link ViewManager.isQuestTrackerVisible}. With the option `questPreview` set to true all QuestPreviews are also
    * rendered. Remaining options are forwarded onto the Foundry Application render method.
    *
    * @param {object}   opts - Optional parameters
    *
    * @param {boolean}  [opts.force] - Forces a data refresh.
    *
    * @param {boolean}  [opts.questPreview] - Render all open QuestPreview apps.
    *
    * @param {...*}     [opts.options] - Remaining options for the {@link Application.render} method.
    *
    * @see https://foundryvtt.com/api/Application.html#render
    */
   static renderAll({ force = false, questPreview = false, ...options } = {})
   {
      // Never force render the quest log to maintain quest details pages above the log.
      if (ViewManager.questLog.rendered) { ViewManager.questLog.render(false, options); }

      ViewManager.renderOrCloseQuestTracker({ updateSetting: false });

      if (questPreview)
      {
         for (const qp of ViewManager.questPreview.values())
         {
            if (qp.rendered) { qp.render(force, options); }
         }
      }
   }

   /**
    * If the QuestTracker is visible then render it otherwise close it.
    *
    * @param {object}   [options] - Optional parameters.
    *
    * @param {boolean}  [options.updateSetting=true] - If closed true then {@link settings.questTrackerEnable} is set
    *                                                  to false.
    */
   static renderOrCloseQuestTracker(options = {})
   {
      if (ViewManager.isQuestTrackerVisible())
      {
         ViewManager.questTracker.render(true, { focus: false });
      }
      else
      {
         // Necessary to check rendered state as the setting is set to false in the close method.
         if (ViewManager.questTracker.rendered) { ViewManager.questTracker.close(options); }
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
            status: game.i18n.localize(questStatusI18n[quest.status])
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

/**
 * Handles the `addQuestEntry` hook.
 *
 * @param {QuestEntry}  questEntry - The added QuestEntry.
 *
 * @param {object}      flags - Quest flags.
 *
 * @returns {Promise<void>}
 */
async function s_QUEST_ENTRY_ADD(questEntry, flags)
{
   if ('permission' in flags)
   {
      ViewManager.refreshQuestPreview(questEntry.questIds);
      ViewManager.renderAll();
   }
}

/**
 * Handles the `removeQuestEntry` hook.
 *
 * @param {QuestEntry}  questEntry - The added QuestEntry.
 *
 * @param {object}      flags - Quest flags.
 *
 * @returns {Promise<void>}
 */
async function s_QUEST_ENTRY_REMOVE(questEntry, flags)
{
   const quest = questEntry.quest;

   const questPreview = ViewManager.questPreview.get(quest.id);
   if (questPreview && questPreview.rendered) { await questPreview.close({ noSave: true }); }

   if ('permission' in flags)
   {
      ViewManager.refreshQuestPreview(questEntry.questIds);
      ViewManager.renderAll();
   }
}

/**
 * Handles the `updateQuestEntry` hook.
 *
 * @param {QuestEntry}  questEntry - The added QuestEntry.
 *
 * @param {object}      flags - Quest flags.
 *
 * @returns {Promise<void>}
 */
async function s_QUEST_ENTRY_UPDATE(questEntry, flags)
{
   if ('permission' in flags)
   {
      ViewManager.refreshQuestPreview(questEntry.questIds);
      ViewManager.renderAll();
   }
}

/**
 * Handles the `closeQuestPreview` hook. Removes the QuestPreview from tracking and removes any current set
 * `s_ADD_QUEST_PREVIEW` state if QuestPreview matches.
 *
 * @param {QuestPreview}   questPreview - The closed QuestPreview.
 */
function s_QUEST_PREVIEW_CLOSED(questPreview)
{
   if (!(questPreview instanceof QuestPreview)) { return; }

   if (s_ADD_QUEST_PREVIEW === questPreview) { s_ADD_QUEST_PREVIEW = void 0; }

   const quest = questPreview.quest;
   if (quest !== void 0) { ViewManager.questPreview.delete(quest.id); }
}

/**
 * Handles the `renderQuestPreview` hook; adding the quest preview to tracking.
 *
 * @param {QuestPreview}   questPreview - The rendered QuestPreview.
 */
function s_QUEST_PREVIEW_RENDER(questPreview)
{
   if (questPreview instanceof QuestPreview)
   {
      const quest = questPreview.quest;
      if (quest !== void 0) { ViewManager.questPreview.set(quest.id, questPreview); }
   }
}

/**
 * @typedef {Object} RenderOptions Additional rendering options which are applied to customize the way that the
 * Application is rendered in the DOM.
 *
 * @property {number}   [left] - The left positioning attribute.
 *
 * @property {number}   [top] - The top positioning attribute.
 *
 * @property {number}   [width] - The rendered width.
 *
 * @property {number}   [height] - The rendered height.
 *
 * @property {number}   [scale] - The rendered transformation scale.
 *
 * @property {boolean}  [focus=false] - Apply focus to the application, maximizing it and bringing it to the top
 *                                      of the vertical stack.
 *
 * @property {string}   [renderContext] - A context-providing string which suggests what event triggered the render.
 *
 * @property {object}   [renderData] - The data change which motivated the render request.
 */