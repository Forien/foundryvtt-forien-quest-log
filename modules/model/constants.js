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

const settings = {
   defaultPermission: 'defaultPermission',
   enableQuestTracker: 'enableQuestTracker',
   hideFQLFromPlayers: 'hideFQLFromPlayers',
   questTrackerTasks: 'questTrackerTasks',
   showTasks: 'showTasks'
};

export { constants, questTypes, settings };
