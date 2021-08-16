import ViewManager from '../control/ViewManager.js';

/**
 * Defines the main FQL constants for module name and the DB flag.
 *
 * @type {{folderState: string, flagDB: string, moduleName: string, moduleLabel: string}}
 */
const constants = {
   moduleName: 'forien-quest-log',
   moduleLabel: `Forien's Quest Log`,
   flagDB: 'json',
   folderState: 'forien.questlog.folderstate-'
};

/**
 * Defines the {@link JQuery} events that are used in FQL.
 *
 * @type {{click: string, dragstart: string, drop: string, focus: string, focusout: string, mousedown: string}}
 */
const jquery = {
   click: 'click',
   dragenter: 'dragenter',
   dragstart: 'dragstart',
   drop: 'drop',
   focus: 'focus',
   focusout: 'focusout',
   keydown: 'keydown',
   mousedown: 'mousedown'
};

/**
 * Defines the left-hand UI control note buttons.
 *
 * @type {object[]}
 */
const noteControls = [
   {
      name: constants.moduleName,
      title: 'ForienQuestLog.QuestLogButton',
      icon: 'fas fa-scroll',
      visible: true,
      onClick: () => ViewManager.questLog.render(true, { focus: true }),
      button: true
   },
   {
      name: 'forien-quest-log-floating-window',
      title: 'ForienQuestLog.FloatingQuestWindow',
      icon: 'fas fa-tasks',
      visible: true,
      onClick: () => ViewManager.questLogFloating.render(true, { focus: true }),
      button: true
   }
];

/**
 * Stores strings for quest types (statuses)
 *
 * @returns {{active: string, available: string, completed: string, failed: string, inactive: string}}
 */
const questStatus = {
   active: 'active',
   available: 'available',
   completed: 'completed',
   failed: 'failed',
   inactive: 'inactive'
};

/**
 * Stores localization strings for quest types (statuses)
 *
 * @type {{active: string, available: string, completed: string, failed: string, inactive: string}}
 */
const questStatusI18n = {
   active: 'ForienQuestLog.QuestTypes.Active',
   available: 'ForienQuestLog.QuestTypes.Available',
   completed: 'ForienQuestLog.QuestTypes.Completed',
   failed: 'ForienQuestLog.QuestTypes.Failed',
   inactive: 'ForienQuestLog.QuestTypes.InActive'
};

/**
 * Stores the QuestLog tab indexes.
 *
 * @type {{inactive: number, available: number, active: number, completed: number, failed: number}}
 */
const questTabIndex = {
   active: 1,
   available: 0,
   completed: 2,
   failed: 3,
   inactive: 4
};

/**
 * @type {FQLSettings} Defines all the module settings for world and client.
 */
const settings = {
   allowPlayersAccept: 'allowPlayersAccept',
   allowPlayersCreate: 'allowPlayersCreate',
   allowPlayersDrag: 'allowPlayersDrag',
   countHidden: 'countHidden',
   defaultAbstractRewardImage: 'defaultAbstractRewardImage',
   defaultPermission: 'defaultPermission',
   dynamicBookmarkBackground: 'dynamicBookmarkBackground',
   enableQuestTracker: 'enableQuestTracker',
   hideFQLFromPlayers: 'hideFQLFromPlayers',
   navStyle: 'navStyle',
   notifyRewardDrop: 'notifyRewardDrop',
   questTrackerBackground: 'questTrackerBackground',
   questTrackerPosition: 'questTrackerPosition',
   resetQuestTracker: 'resetQuestTracker',
   showFolder: 'showFolder',
   showTasks: 'showTasks',
   trustedPlayerEdit: 'trustedPlayerEdit'
};

export { constants, jquery, noteControls, questStatus, questStatusI18n, questTabIndex, settings };

/**
 * @typedef {object} FQLSettings
 *
 * @property {string}   allowPlayersAccept - Allow players to accept quests.
 *
 * @property {string}   allowPlayersCreate - Allow players to create quests.
 *
 * @property {string}   allowPlayersDrag - Allow players to drag reward items to actor sheet.
 *
 * @property {string}   countHidden - Count hidden objectives / subquests.
 *
 * @property {string}   defaultAbstractRewardImage - Sets the default abstract reward image path.
 *
 * @property {string}   defaultPermission - Sets the default permission level for new quests.
 *
 * @property {string}   dynamicBookmarkBackground - Uses jQuery to dynamically set the tab background image.
 *
 * @property {string}   enableQuestTracker - Enables the quest tracker.
 *
 * @property {string}   hideFQLFromPlayers - Completely hides FQL from players.
 *
 * @property {string}   navStyle - Navigation style / classic / or bookmark tabs.
 *
 * @property {string}   notifyRewardDrop - Post a notification UI message when rewards are dropped in actor sheets.
 *
 * @property {string}   questTrackerBackground - Renders a background for the quest tracker.
 *
 * @property {string}   questTrackerPosition - Hidden setting to store current quest tracker position.
 *
 * @property {string}   resetQuestTracker - Resets the quest tracker position.
 *
 * @property {string}   showFolder - Shows the `_fql_quests` directory in the journal entries sidebar.
 *
 * @property {string}   showTasks - Determines if objective counts are rendered.
 *
 * @property {string}   trustedPlayerEdit - Allows trusted players to have full quest editing capabilities.
 */
