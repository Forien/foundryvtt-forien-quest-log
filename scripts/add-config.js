Hooks.on("init", function () {
  game.settings.register("forien-quest-log", "showTasks", {
    name: "ForienQuestLog.showTasks.Enable",
    hint: "ForienQuestLog.showTasks.EnableHint",
    scope: "world",
    config: true,
    default: "default",
    type: String,
    choices: {
      "default": "ForienQuestLog.showTasks.default",
      "onlyCurrent": "ForienQuestLog.showTasks.onlyCurrent",
      "no": "ForienQuestLog.showTasks.no"
    }, onChange: value => {
      if (game.questlog && game.questlog.rendered) {
        game.questlog.render();
      }
    }
  });
});
