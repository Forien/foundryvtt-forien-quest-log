import registerApiHooks from "./api/hooks.js";
import QuestApi from "./api/quest-api.mjs";
import QuestLogClass from "./apps/quest-log.mjs";
import QuestFloatingWindowClass from "./apps/quest-floating-window.mjs";
import QuestFolder from "./entities/quest-folder.mjs";
import ModuleSettings from "./utility/config.mjs";
import Socket from "./utility/socket.mjs";
import Utils from "./utility/utils.mjs";
import Quest from "./entities/quest.mjs";
import QuestsCollection from "./entities/collection/quests-collection.mjs";


Hooks.once('init', () => {
  ModuleSettings.register();

  CONST.ENTITY_TYPES?.push("Quest");
  CONST.ENTITY_LINK_TYPES?.push("Quest");
  CONFIG["Quest"] = {
    entityClass: Quest,
    collection: QuestsCollection,
    sidebarIcon: 'far fa-question-circle',
  };

  Utils.preloadTemplates();
  Utils.registerHandlebarsHelpers();

  Hooks.callAll("ForienQuestLog.afterInit");
});

Hooks.once('setup', () => {
  window.Quests = QuestApi;
  window.QuestLog = new QuestLogClass();
  window.QuestFloatingWindow = new QuestFloatingWindowClass();
  game.questPreview = {};

  Hooks.callAll("ForienQuestLog.afterSetup");
});

Hooks.once("ready", () => {
  QuestFolder.initializeJournals();
  registerApiHooks();

  // Allow and process incoming socket data
  Socket.listen();

  Hooks.callAll("ForienQuestLog.afterReady");
});

Hooks.on("renderJournalDirectory", (app, html, data) => {
  const button = $(`<button class="quest-log-btn">${game.i18n.localize("ForienQuestLog.QuestLogButton")}</button>`);
  const buttonFloatingWindow = $(`<button class="quest-log-btn-floating-window">${game.i18n.localize("ForienQuestLog.QuestLogButton")}</button>`);
  let footer = html.find(".directory-footer");
  if (footer.length === 0) {
    footer = $(`<footer class="directory-footer"></footer>`);
    html.append(footer);
  }
  footer.append(button);
  footer.append(buttonFloatingWindow);

  button.click(ev => {
    QuestLog.render(true)
  });

  buttonFloatingWindow.click(ev => {
    QuestFloatingWindow.render(true)
  });

  if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder'))) {
    let folderId = QuestFolder.get('root')._id;
    let folder = html.find(`.folder[data-folder-id="${folderId}"]`);

    folder.remove();
  }
});
