import Utils from '../control/Utils.js';

const constants = {
   moduleName: 'forien-quest-log',
   moduleLabel: `Forien's Quest Log`,
   flagDB: 'json',
   folderState: 'forien.questlog.folderstate-'
};

/**
 * Stores strings for quest types (statuses)
 *
 * @returns {{hidden: string, available: string, active: string, completed: string, failed: string}}
 */
const questTypes = {
   active: 'active',
   available: 'available',
   completed: 'completed',
   failed: 'failed',
   inactive: 'inactive'
};

/**
 * Stores localization strings for quest types (statuses)
 *
 * @returns {{hidden: string, available: string, active: string, completed: string, failed: string}}
 */
const questTypesI18n = {
   active: 'ForienQuestLog.QuestTypes.Active',
   available: 'ForienQuestLog.QuestTypes.Available',
   completed: 'ForienQuestLog.QuestTypes.Completed',
   failed: 'ForienQuestLog.QuestTypes.Failed',
   inactive: 'ForienQuestLog.QuestTypes.InActive'
};

/**
 * Defines all the module settings for world and client.
 */
const settings = {
   allowPlayersAccept: 'allowPlayersAccept',
   allowPlayersCreate: 'allowPlayersCreate',
   allowPlayersDrag: 'allowPlayersDrag',
   countHidden: 'countHidden',
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

/**
 * Defines the left-hand UI control note buttons.
 *
 * @type {*[]}
 */
const noteControls = [
   {
      name: constants.moduleName,
      title: 'ForienQuestLog.QuestLogButton',
      icon: 'fas fa-scroll',
      visible: true,
      onClick: () => Utils.getFQLPublicAPI().questLog.render(true, { focus: true }),
      button: true
   },
   {
      name: 'forien-quest-log-floating-window',
      title: 'ForienQuestLog.FloatingQuestWindow',
      icon: 'fas fa-tasks',
      visible: true,
      onClick: () => Utils.getFQLPublicAPI().questLogFloating.render(true, { focus: true }),
      button: true
   }
];

export { constants, noteControls, questTypes, questTypesI18n, settings };
