import Quest from '../entities/Quest.js';
import Utils from '../utility/Utils.js';

/**
 * Function for registering API-related Hooks.
 */
export default function registerApiHooks()
{
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

         const command = `Quests.open('${questId}');`;
         const macroData = {
            name: game.i18n.format('ForienQuestLog.Api.hooks.createOpenQuestMacro.name', { name: quest.title }),
            type: 'script',
            command
         };

         // TODO: More robust handling of quest images. First attempt to select quest sn
         const actor = Utils.findActor(quest.giver);
         if (actor)
         {
            if (quest.image === 'actor')
            {
               macroData.img = actor.img;
            }
            else
            {
               macroData.img = actor.data.token.img;
            }
         }
         else
         {
            if (quest.giver)
            {
               const entity = await fromUuid(quest.giver);
               macroData.img = entity.img;
            }
         }

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
