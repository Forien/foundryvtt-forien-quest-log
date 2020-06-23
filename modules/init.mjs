import registerApiHooks from "./api/hooks.js";
import QuestApi from "./api/quest-api.mjs";
import QuestLogClass from "./apps/quest-log.mjs";
import constants from "./constants.mjs";
import QuestFolder from "./entities/quest-folder.mjs";
import ModuleSettings from "./utility/config.mjs";
import Socket from "./utility/socket.mjs";
import Utils from "./utility/utils.mjs";
import VersionCheck from "./versioning/version-check.mjs";
import renderWelcomeScreen from "./versioning/welcome-screen.mjs";
import Quest from "./entities/quest.mjs";


Hooks.once('init', () => {
  ModuleSettings.register();

  CONST.ENTITY_LINK_TYPES.push("Quest");
  CONFIG["Quest"] = {
    entityClass: Quest,
    sidebarIcon: 'far fa-question-circle',
  };

  Utils.preloadTemplates();

  Hooks.callAll("ForienQuestLog.afterInit");
});

Hooks.once('setup', () => {
  window.Quests = QuestApi;
  window.QuestLog = new QuestLogClass();

  Hooks.callAll("ForienQuestLog.afterSetup");
});

Hooks.once("ready", () => {
  QuestFolder.initializeJournals();

  if (VersionCheck.check(constants.moduleName)) {
    if (game.user.isGM || game.settings.get('forien-quest-log', 'playersWelcomeScreen')) {
      renderWelcomeScreen();
    }
    Utils.updateMacros();
  }

  registerApiHooks();

  // Allow and process incoming socket data
  Socket.listen();

  Hooks.callAll("ForienQuestLog.afterReady");
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
    QuestLog.render(true)
  });

  if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder'))) {
    let folderId = QuestFolder.get('root')._id;
    let folder = html.find(`.folder[data-folder-id="${folderId}"]`);

    folder.remove();
  }
});
