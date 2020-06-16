export default class ModuleSettings {
  static register() {
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

    game.settings.register("forien-quest-log", "navStyle", {
      name: "ForienQuestLog.navStyle.Enable",
      hint: "ForienQuestLog.navStyle.EnableHint",
      scope: "world",
      config: true,
      default: "bookmarks",
      type: String,
      choices: {
        "bookmarks": "ForienQuestLog.navStyle.bookmarks",
        "classic": "ForienQuestLog.navStyle.classic"
      }, onChange: value => {
        if (game.questlog && game.questlog.rendered) {
          game.questlog.render();
        }
      }
    });

    game.settings.register("forien-quest-log", "titleAlign", {
      name: "ForienQuestLog.titleAlign.Enable",
      hint: "ForienQuestLog.titleAlign.EnableHint",
      scope: "client",
      config: true,
      default: "left",
      type: String,
      choices: {
        "left": "ForienQuestLog.titleAlign.left",
        "center": "ForienQuestLog.titleAlign.center"
      }, onChange: value => {
        if (game.questlog && game.questlog.rendered) {
          game.questlog.render();
        }
      }
    });
  }
}
