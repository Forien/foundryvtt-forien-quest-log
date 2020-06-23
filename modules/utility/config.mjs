export default class ModuleSettings {
  /**
   * Registers various configuration settings for Module
   */
  static register() {
    game.settings.register("forien-quest-log", "availableQuests", {
      name: "ForienQuestLog.Settings.availableQuests.Enable",
      hint: "ForienQuestLog.Settings.availableQuests.EnableHint",
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "allowPlayersDrag", {
      name: "ForienQuestLog.Settings.allowPlayersDrag.Enable",
      hint: "ForienQuestLog.Settings.allowPlayersDrag.EnableHint",
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "countHidden", {
      name: "ForienQuestLog.Settings.countHidden.Enable",
      hint: "ForienQuestLog.Settings.countHidden.EnableHint",
      scope: "world",
      config: true,
      default: true,
      type: Boolean,
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "showTasks", {
      name: "ForienQuestLog.Settings.showTasks.Enable",
      hint: "ForienQuestLog.Settings.showTasks.EnableHint",
      scope: "world",
      config: true,
      default: "default",
      type: String,
      choices: {
        "default": "ForienQuestLog.Settings.showTasks.default",
        "onlyCurrent": "ForienQuestLog.Settings.showTasks.onlyCurrent",
        "no": "ForienQuestLog.Settings.showTasks.no"
      },
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "navStyle", {
      name: "ForienQuestLog.Settings.navStyle.Enable",
      hint: "ForienQuestLog.Settings.navStyle.EnableHint",
      scope: "client",
      config: true,
      default: "bookmarks",
      type: String,
      choices: {
        "bookmarks": "ForienQuestLog.Settings.navStyle.bookmarks",
        "classic": "ForienQuestLog.Settings.navStyle.classic"
      },
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "titleAlign", {
      name: "ForienQuestLog.Settings.titleAlign.Enable",
      hint: "ForienQuestLog.Settings.titleAlign.EnableHint",
      scope: "client",
      config: true,
      default: "left",
      type: String,
      choices: {
        "left": "ForienQuestLog.Settings.titleAlign.left",
        "center": "ForienQuestLog.Settings.titleAlign.center"
      },
      onChange: value => {
        if (QuestLog && QuestLog.rendered)
          QuestLog.render();
      }
    });

    game.settings.register("forien-quest-log", "playersWelcomeScreen", {
      name: "ForienQuestLog.Settings.playersWelcomeScreen.Enable",
      hint: "ForienQuestLog.Settings.playersWelcomeScreen.EnableHint",
      scope: "world",
      config: true,
      default: true,
      type: Boolean
    });

    game.settings.register("forien-quest-log", "showFolder", {
      name: "ForienQuestLog.Settings.showFolder.Enable",
      hint: "ForienQuestLog.Settings.showFolder.EnableHint",
      scope: "world",
      config: true,
      default: false,
      type: Boolean,
      onChange: value => game.journal.render()
    });
  }
}
