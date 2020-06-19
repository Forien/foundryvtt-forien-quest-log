import registerApiHooks from "./api/hooks.js";
import QuestApi from "./api/quest-api.mjs";
import ModuleSettings from "./utility/config.mjs";
import QuestFolder from "./entities/quest-folder.mjs";
import QuestLog from "./apps/quest-log.mjs";
import Socket from "./utility/socket.mjs";
import Utils from "./utility/utils.mjs";
import VersionCheck from "./versioning/version-check.mjs";
import renderWelcomeScreen from "./versioning/welcome-screen.mjs";
import constants from "./constants.mjs";


Hooks.once('init', () => {
  ModuleSettings.register();

  Utils.preloadTemplates();

  // Allow and process incoming socket data
  Socket.listen();
});

Hooks.once("ready", () => {
  if (!game.questlog)
    game.questlog = new QuestLog();

  if (game.questlog)
    QuestFolder.initializeJournals();

  if (!game.quests)
    game.quests = QuestApi;

  registerApiHooks();

  if (VersionCheck.check(constants.moduleName)) {
    renderWelcomeScreen();
  }
});

Hooks.on("renderJournalDirectory", (app, html, data) => {
  const button = $(`<button class="quest-log-btn">${game.i18n.localize("ForienQuestLog.QuestLogButton")}</button>`);
  let footer = html.find(".directory-footer");
  if (footer.length === 0) {
    footer = $(`<footer class="directory-footer"></footer>`);
    html.append(footer);
  }
  footer.append(button);

  button.click(ev => {
    game.questlog.render(true)
  });

  if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder'))) {
    let folderId = QuestFolder.get('root')._id;
    let folder = html.find(`.folder[data-folder-id="${folderId}"]`);

    folder.remove();
  }
});
