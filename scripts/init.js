import QuestFolder from "../modules/quest-folder.mjs";
import QuestLog from "../modules/quest-log.mjs";
import Utils from "../modules/utils.mjs";
import Socket from "../modules/socket.mjs";
import ModuleSettings from "../modules/config.mjs";

Hooks.on('init', () => {
  ModuleSettings.register();

  if (!game.questlog) {
    game.questlog = new QuestLog();
  }

  Utils.preloadTemplates();

  // Allow and process incoming socket data
  Socket.listen();
});

Hooks.on("ready", () => {
  if (game.questlog)
    QuestFolder.initializeJournals();
});

Hooks.on("renderJournalDirectory", (app, html, data) => {
  const button = $(`<button class="quest-log-btn">Quest Log</button>`);
  let footer = html.find(".directory-footer")
  if (footer.length === 0) {
    footer = $(`<footer class="directory-footer"></footer>`)
    html.append(footer);
  }
  footer.append(button);

  button.click(ev => {
    game.questlog.render(true)
  });

  if (!game.user.isGM) {
    let folderId = QuestFolder.get('root')._id;
    let folder = html.find(`.folder[data-folder-id="${folderId}"]`);

    folder.remove();
  }
});
