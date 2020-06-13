ForienQuestLog.Socket = class {
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
};
