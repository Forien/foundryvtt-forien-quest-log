import Quest         from '../model/Quest.js';
import QuestFolder   from '../model/QuestFolder.js';
import ViewData      from '../view/ViewData.js';

/**
 * Function for registering API-related Hooks.
 */
export default function registerHooks()
{
   // Open quest log
   Hooks.on('ForienQuestLog.Open.QuestLog', () =>
   {
      QuestLog.render(true);
   });

   // Create 'open quest' Macro when Quest is dropped onto Hotbar.
   Hooks.on('hotbarDrop', async (bar, data, slot) =>
   {
      if (data.type === 'Quest')
      {
         const questId = data.id;

         const quest = Quest.get(questId);
         if (!quest)
         {
            throw new Error(game.i18n.localize('ForienQuestLog.Api.hooks.createOpenQuestMacro.error.noQuest'));
         }

         // TODO: CHANGEAPI TO THE NEW API LOCATION
         const command = `Quests.open('${questId}');`;

         const macroData = {
            name: game.i18n.format('ForienQuestLog.Api.hooks.createOpenQuestMacro.name', { name: quest.title }),
            type: 'script',
            command
         };

         macroData.img = quest.splash.length ? quest.splash : (await ViewData.giverFromQuest(quest)).img;

         let macro = game.macros.contents.find((m) => (m.data.command === command));
         if (!macro)
         {
            macro = await Macro.create(macroData, { displaySheet: false });
         }

         game.user.assignHotbarMacro(macro, slot);
      }
      return false;
   });

   Hooks.on('renderJournalDirectory', (app, html) =>
   {
      const button = $(`<button class="quest-log-btn">${game.i18n.localize('ForienQuestLog.QuestLogButton')}</button>`);
      let footer = html.find('.directory-footer');
      if (footer.length === 0)
      {
         footer = $(`<footer class="directory-footer"></footer>`);
         html.append(footer);
      }
      footer.append(button);

      button.click(() =>
      {
         QuestLog.render(true);
      });

      if (!(game.user.isGM && game.settings.get('forien-quest-log', 'showFolder')))
      {
         const folderId = QuestFolder.get().id;
         const folder = html.find(`.folder[data-folder-id="${folderId}"]`);

         folder.remove();
      }
   });

   Hooks.on('getSceneControlButtons', (controls) =>
   {
      const notes = controls.find((c) => c.name === 'notes');

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
   Hooks.on('updateJournalEntry', () =>
   {
      if (ui.questTracker)
      {
         ui.questTracker.render();
      }
   });
}
