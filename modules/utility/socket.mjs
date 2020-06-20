import QuestApi from "../api/quest-api.mjs";

export default class Socket {
  static refreshQuestLog() {
    game.socket.emit("module.forien-quest-log", {
      type: "questLogRefresh"
    })
  }

  static refreshQuestPreview(questId) {
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

  static userCantOpenQuest(){
    game.socket.emit("module.forien-quest-log", {
      type: "userCantOpenQuest",
      payload: {
        user: game.user.name
      }
    })
  }

  static listen() {
    game.socket.on("module.forien-quest-log", data => {
      if (data.type === "questLogRefresh") {
        if (QuestLog.rendered)
          QuestLog.render(true);
      } else if (data.type === "questPreviewRefresh") {
        if (game.questPreview !== undefined) {
          if (game.questPreview.quest.id === data.payload.questId)
            game.questPreview.render(true);
        }

        if (QuestLog.rendered)
          QuestLog.render(true);
      } else if (data.type === "showQuestPreview") {
        if (game.questPreview !== undefined)
          game.questPreview.close().then( () => QuestApi.open(data.payload.questId, false));
        else
          QuestApi.open(data.payload.questId, false);
      } else if (data.type === "userCantOpenQuest") {
        if (game.user.isGM) {
          ui.notifications.warn(game.i18n.format("ForienQuestLog.Notifications.UserCantOpen", {user: data.payload.user}), {});
        }
        }
    });
  }
};
