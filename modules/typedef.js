/**
 * @typedef {object} FQLPublicAPI - Exposes a few FQL classes and instances publicly.
 *
 * @property {QuestAPI} QuestAPI - QuestAPI class - Exposes static methods to interact with the quest system.
 *
 * @property {QuestLog} questLog - The main quest log app instance.
 *
 * @property {QuestLogFloating} questLogFloating - The floating quest log window instance.
 *
 * @property {QuestTracker} questTracker - The floating quest tracker.
 *
 * @property {object<string, QuestPreview>} questPreview - The open quest preview app / windows.
 *
 * @property {Function} closeAll - Convenience function to close all windows.
 *
 * @property {Function} renderAll - Convenience function to render all windows / apps except QuestPreview.
 */

/**
 * @typedef {object} FQLDropData An object attached to drop data transfer which describes the FQL reward item and who
 *                               is dropping it into an actor sheet.
 *
 * @property {string} questId - The Quest ID
 *
 * @property {string} uuidv4 - The associated UUIDv4 of a quest reward.
 *
 * @property {string} itemName - The reward item name.
 *
 * @property {string} userName - The user name who is dropping the item.
 */

/**
 * @typedef {object} SortedQuests
 *
 * @property {QuestEntry[]} active - Active quest entries
 *
 * @property {QuestEntry[]} available - Available quests entries
 *
 * @property {QuestEntry[]} completed - Completed quests entries
 *
 * @property {QuestEntry[]} failed - Failed quests entries
 *
 * @property {QuestEntry[]} hidden - Hidden quests entries
 */