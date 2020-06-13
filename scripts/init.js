let ForienQuestLog = {};

Hooks.on("renderJournalDirectory", (app, html, data) => {
  const button = $(`<button class="quest-log-btn">Quest Log</button>`);
  html.find(".directory-footer").append(button);

  button.click(ev => {
    console.log('click!');
    game.questlog.render(true)
  });

  // Allow and process incoming socket data
  game.socket.on("module.forien-quest-log", data => {
    if (data.type === "questLogRefresh") {
      if (game.questlog.rendered)
        game.questlog.render(true);
    } else if (data.type === "questPreviewRefresh") {
      if (game.questPreview !== undefined) {
        if (game.questPreview.questId === data.payload.questId) {
          game.questPreview.render(true);
        }
      }
    }
  });
});

Hooks.on('init', () => {
  if (!game.questlog) {
    game.questlog = new ForienQuestLog.QuestLog();
    // game.questPreviews = {};
  }

  ForienQuestLog.Utils.preloadTemplates();
});

Hooks.on("ready", () => {
  if (game.questlog)
    game.questlog.initializeJournals();
});

