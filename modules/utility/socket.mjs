import QuestApi from "../api/quest-api.mjs";
import Quest from "../entities/quest.mjs";

export default class Socket {
  static refreshQuestLog() {
    if (QuestLog.rendered)
      QuestLog.render(true);
    game.socket.emit("module.forien-quest-log", {
      type: "questLogRefresh"
    })
  }

  static refreshQuestPreview(questId) {
    if (game.questPreview[questId] !== undefined)
      game.questPreview[questId].render(true);
    game.socket.emit("module.forien-quest-log", {
      type: "questPreviewRefresh",
      payload: {
        questId: questId
      }
    })
  }

  static showQuestPreview(questId) {
    game.socket.emit("module.forien-quest-log", {
      type: "showQuestPreview",
      payload: {
        questId: questId
      }
    })
  }

  static userCantOpenQuest() {
    game.socket.emit("module.forien-quest-log", {
      type: "userCantOpenQuest",
      payload: {
        user: game.user.name
      }
    })
  }

  static acceptQuest(questId) {
    game.socket.emit("module.forien-quest-log", {
      type: "acceptQuest",
      payload: {
        questId: questId
      }
    })
  }

  static closeQuest(questId) {
    if (game.questPreview[questId] !== undefined)
      game.questPreview[questId].close();
    game.socket.emit("module.forien-quest-log", {
      type: "closeQuest",
      payload: {
        questId: questId
      }
    })
  }

  static listen() {
    game.socket.on("module.forien-quest-log", data => {
      if (data.type === "questLogRefresh") {
        if (QuestLog.rendered)
          QuestLog.render(true);
        return;
      }

      if (data.type === "questPreviewRefresh") {
        if (game.questPreview[data.payload.questId] !== undefined)
          game.questPreview[data.payload.questId].render(true);

        if (QuestLog.rendered)
          QuestLog.render(true);

        return;
      }

      if (data.type === "showQuestPreview") {
        QuestApi.open(data.payload.questId, false);

        return;
      }

      if (data.type === "userCantOpenQuest") {
        if (game.user.isGM) {
          ui.notifications.warn(game.i18n.format("ForienQuestLog.Notifications.UserCantOpen", {user: data.payload.user}), {});
        }

        return;
      }

      if (data.type === "acceptQuest") {
        if (game.user.isGM) {
          Quest.move(data.payload.questId, 'active');
        }
      }

      if (data.type === "closeQuest") {
        if (game.questPreview[data.payload.questId] !== undefined)
          game.questPreview[data.payload.questId].close();
      }
    });
  }
};
