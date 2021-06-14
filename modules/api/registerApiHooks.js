import Quest      from '../entities/Quest.js';
import ViewData   from '../apps/ViewData.js';

/**
 * Function for registering API-related Hooks.
 */
export default function registerApiHooks()
{
   // Open quest log
   Hooks.on('forienQuestLogOpen', () =>
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
}
