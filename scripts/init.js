let ForienQuestLog = {};

Hooks.on("renderJournalDirectory", (app, html, data) => {
    const button = $(`<button class="quest-log-btn">Quest Log</button>`);
    html.find(".directory-footer").append(button);

    button.click(ev => {
      console.log('click!');
      game.questlog.render(true)
    })
});

Hooks.on('init', () => {
  if (!game.questlog)
    game.questlog = new ForienQuestLog.QuestLog();

  game.questlog.preloadTemplates();
});

Hooks.on("ready", () => {
  if (game.questlog)
    game.questlog.initializeJournals();
});

