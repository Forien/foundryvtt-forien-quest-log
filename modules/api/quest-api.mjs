import QuestPreview from "../quest-preview.mjs";
import Quest from "../quest.mjs";
import Reward from "../reward.mjs";
import Task from "../task.mjs";

/**
 * Quest public Api available under `game.quests.`
 */
export default class QuestApi {
  /**
   * Retrieves Quest instance for given quest ID
   *
   * @param questId
   * @returns {Quest}
   */
  static get(questId) {
    return Quest.get(questId);
  }

  /**
   * Opens Quest Details for given quest ID
   *
   * @param questId
   */
  static open(questId) {
    try {
      let questPreview = new QuestPreview(questId);
      questPreview.render(true);
    } catch (error) {
      ui.notifications.error(game.i18n.localize("ForienQuestLog.Api.open"), {});
    }
  }

  /**
   * Creates new Quest programmatically through API
   *
   * @param data
   * @returns {Quest}
   */
  static create(data = {}) {
    if (data.title === undefined) {
      throw new Error(game.i18n.localize("ForienQuestLog.Api.create.title"));
    }

    return new Quest({});
  }

  /**
   * Tunnel to `game.quests.reward.create()`. Creates new Reward programmatically through API.
   *
   * @returns {Reward}
   */
  static get reward() {
    return Reward;
  }

  /**
   * Tunnel to `game.quests.task.create()`. Creates new Task programmatically through API.
   *
   * @returns {Task}
   */
  static get task() {
    return Task;
  }
}
