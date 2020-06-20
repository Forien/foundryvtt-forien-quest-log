import QuestPreview from "../apps/quest-preview.mjs";
import Quest from "../entities/quest.mjs";
import Reward from "../entities/reward.mjs";
import Task from "../entities/task.mjs";
import Socket from "../utility/socket.mjs";

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
   * @param notif
   */
  static open(questId, notif = true) {
    try {
      let questPreview = new QuestPreview(questId);
      questPreview.render(true);
    } catch (error) {
      if (notif)
        ui.notifications.error(game.i18n.localize("ForienQuestLog.Notifications.CannotOpen"), {});
      else
        Socket.userCantOpenQuest();
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
