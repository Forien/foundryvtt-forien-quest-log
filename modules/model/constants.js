import Utils from '../control/Utils.js';

const constants = {
   moduleName: 'forien-quest-log',
   moduleLabel: `Forien's Quest Log`,
   flagDB: 'json'
};

/**
 * Stores localization strings for quest types (statuses)
 *
 * @returns {{hidden: string, available: string, active: string, completed: string, failed: string}}
 */
const questTypes = {
   active: 'ForienQuestLog.QuestTypes.InProgress',
   completed: 'ForienQuestLog.QuestTypes.Completed',
   failed: 'ForienQuestLog.QuestTypes.Failed',
   hidden: 'ForienQuestLog.QuestTypes.Hidden',
   available: 'ForienQuestLog.QuestLog.Tabs.Available'
};

/**
 * Defines all the module settings for world and client.
 */
const settings = {
   allowPlayersAccept: 'allowPlayersAccept',
   allowPlayersCreate: 'allowPlayersCreate',
   allowPlayersDrag: 'allowPlayersDrag',
   availableQuests: 'availableQuests',
   countHidden: 'countHidden',
   defaultPermission: 'defaultPermission',
   dynamicBookmarkBackground: 'dynamicBookmarkBackground',
   enableQuestTracker: 'enableQuestTracker',
   hideFQLFromPlayers: 'hideFQLFromPlayers',
   navStyle: 'navStyle',
   notifyRewardDrop: 'notifyRewardDrop',
   questTrackerBackground: 'questTrackerBackground',
   questTrackerTasks: 'questTrackerTasks',
   questTrackerPosition: 'questTrackerPosition',
   resetQuestTracker: 'resetQuestTracker',
   showFolder: 'showFolder',
   showTasks: 'showTasks'
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

export { constants, noteControls, questTypes, settings };
