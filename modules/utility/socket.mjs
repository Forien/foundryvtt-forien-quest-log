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

  static listen() {
    game.socket.on("module.forien-quest-log", data => {
      if (data.type === "questLogRefresh") {
        if (game.questlog.rendered)
          game.questlog.render(true);
      } else if (data.type === "questPreviewRefresh") {
        if (game.questPreview !== undefined) {
          if (game.questPreview.quest.id === data.payload.questId)
            game.questPreview.render(true);
        }

        if (game.questlog.rendered)
          game.questlog.render(true);
      } else if (data.type === "showQuestPreview") {
        if (game.questPreview !== undefined)
          game.questPreview.close().then( () => game.quests.open(data.payload.questId));
        else
          game.quests.open(data.payload.questId);
      }
    });
  }
};
