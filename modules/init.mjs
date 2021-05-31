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
import QuestTracker from "./apps/QuestTracker.mjs";

Hooks.once('init', () => {
  ModuleSettings.register();
  Utils.preloadTemplates();
  Utils.registerHandlebarsHelpers();
});

Hooks.once('ready', () => {
  CONST.ENTITY_TYPES?.push("Quest");
  CONST.ENTITY_LINK_TYPES?.push("Quest");
  CONFIG["Quest"] = {
    entityClass: Quest,
    collection: QuestsCollection,
    sidebarIcon: 'far fa-question-circle',
  };

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

  if (game.settings.get('forien-quest-log', 'enableQuestTracker')) {
    if (game.modules.get("forien-quest-log")?.active) {
      QuestTracker.init();
    }
  }

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

Hooks.on('getSceneControlButtons', (controls) => {
  const notes = controls
    .find((c) => c.name === 'notes');

  notes.tools.push({
    name: 'forien-quest-log',
    title: 'ForienQuestLog.QuestLogButton',
    icon: 'fas fa-pen-fancy',
    visible: true,
    onClick: () => QuestLog.render(true),
    button: true
  });

  notes.tools.push({
    name: 'forien-quest-log-floating-window',
    title: 'ForienQuestLog.FloatingQuestWindow',
    icon: 'fas fa-bookmark',
    visible: true,
    onClick: () => QuestFloatingWindow.render(true),
    button: true
  });

});


/**
 * Need to Update Quest Log with custom Hooks :c
 */
Hooks.on("updateJournalEntry", () => {
  if (ui.questTracker) {
    ui.questTracker.render();
  }
});
