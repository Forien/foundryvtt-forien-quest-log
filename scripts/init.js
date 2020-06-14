let ForienQuestLog = {};

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
    let folderId = game.questlog.getFolder('root')._id;
    let folder = html.find(`.folder[data-folder-id="${folderId}"]`);

    folder.remove();
  }
});

Hooks.on('init', () => {
  if (!game.questlog) {
    game.questlog = new ForienQuestLog.QuestLog();
    // game.questPreviews = {};
  }

  ForienQuestLog.Utils.preloadTemplates();

  // Allow and process incoming socket data
  game.socket.on("module.forien-quest-log", data => {
    if (data.type === "questLogRefresh") {
      if (game.questlog.rendered)
        game.questlog.render(true);
    } else if (data.type === "questPreviewRefresh") {
      if (game.questPreview !== undefined)
        if (game.questPreview.questId === data.payload.questId)
          game.questPreview.render(true);

      if (game.questlog.rendered)
        game.questlog.render(true);
    }
  });
});

Hooks.on("ready", () => {
  if (game.questlog)
    game.questlog.initializeJournals();
});

