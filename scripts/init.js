import registerApiHooks from "../modules/api/hooks.js";
import QuestApi from "../modules/api/quest-api.mjs";
import ModuleSettings from "../modules/config.mjs";
import QuestFolder from "../modules/quest-folder.mjs";
import QuestLog from "../modules/quest-log.mjs";
import Socket from "../modules/socket.mjs";
import Utils from "../modules/utils.mjs";
import VersionCheck from "../modules/version-check.mjs";
import renderWelcomeScreen from "../modules/welcome-screen.mjs";
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
