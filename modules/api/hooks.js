import Quest from "../entities/quest.mjs";
import Utils from "../utility/utils.mjs";

/**
 * Function for registering API-related Hooks.
 */
export default function registerApiHooks() {
  // Create "open quest" Macro when Quest is dropped onto Hotbar.
  Hooks.on("hotbarDrop", async (bar, data, slot) => {
    if (data.type === "Quest") {
      let questId = data.id;

      let quest = Quest.get(questId);
      if (!quest)
        throw new Error(game.i18n.localize("ForienQuestLog.Api.hooks.createOpenQuestMacro.error.noQuest"));

      let command = `Quests.open("${questId}");`;
      let macroData = {
        name: game.i18n.format("ForienQuestLog.Api.hooks.createOpenQuestMacro.name", {name: quest.title}),
        type: "script",
        command: command
      };

      let actor = Utils.findActor(quest.giver);
      if (actor) {
        if (quest.image === 'actor')
          macroData.img = actor.img;
        else
          macroData.img = actor.data.token.img;
      } else {
        if (quest.giver) {
          let entity = await fromUuid(quest.giver);
          macroData.img = entity.img;
        }
      }

      let macro = game.macros.entities.find(m => (m.data.command === command));
      if (!macro) {
        macro = await Macro.create(macroData, {displaySheet: false})
      }

      game.user.assignHotbarMacro(macro, slot);
    }
    return false;
  });
}
