/**
 * @typedef {object} FQLPublicAPI - Exposes a few FQL classes and instances publicly.
 *
 * @property {QuestAPI} QuestAPI - QuestAPI class - Exposes static methods to interact with the quest system.
 *
 * @property {QuestLog} questLog - The main quest log app instance.
 *
 * @property {QuestLogFloating} questLogFloating - The floating quest log window instance.
 */

/**
 * @typedef {object} SortedQuests
 *
 * @property {object[]} active - Active quests
 *
 * @property {object[]} available - Available quests
 *
 * @property {object[]} completed - Completed quests
 *
 * @property {object[]} failed - Failed quests
 *
 * @property {object[]} hidden - Hidden quests
 */