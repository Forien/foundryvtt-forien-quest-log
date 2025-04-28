import {QuestDB, Socket, Utils} from "../../control/index.js";

/**
 *
 * @param {jQuery|HTMLElement} element
 * @returns {Quest|void} Quest associated with the element, if any.
 */
function getQuestFromElement(element)
{
   let questId;

   if (!element)
   {
      return void 0;
   }

   if (element instanceof jQuery)
   {
      questId = element.closest('[data-quest-id]')?.data('quest-id');
   }
   else
   {
      questId = element.closest('[data-quest-id]')?.dataset.questId;
   }

   return questId ? QuestDB.getQuest(questId) : void 0;
}

export const menuItemCopyLink = {
   name: 'ForienQuestLog.QuestLog.ContextMenu.CopyEntityLink',
   icon: '<i class="fas fa-link"></i>',
   callback: async (menu) =>
   {
      const quest = getQuestFromElement(menu);

      if (quest && await Utils.copyTextToClipboard(`@JournalEntry[${quest.id}]{${quest.name}}`))
      {
         ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.LinkCopied'));
      }
   }
};

export const copyQuestId = {
   name: 'ForienQuestLog.QuestLog.ContextMenu.CopyQuestID',
   icon: '<i class="fas fa-key"></i>',
   callback: async (menu) =>
   {
      const quest = getQuestFromElement(menu);

      if (quest && await Utils.copyTextToClipboard(quest.id))
      {
         ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestIDCopied'));
      }
   }
};

export const togglePrimaryQuest = {
   name: 'ForienQuestLog.QuestLog.ContextMenu.PrimaryQuest',
   icon: '<i class="fas fa-star"></i>',
   callback: (menu) =>
   {
      const quest = getQuestFromElement(menu);
      if (quest) { Socket.setQuestPrimary({ quest }); }
   }
};

export const jumpToPin = {
   name: "SIDEBAR.JumpPin",
   icon: '<i class="fa-solid fa-crosshairs"></i>',
   condition: (menu) => !!getQuestFromElement(menu)?.entry.sceneNote,
   callback: (menu) =>
   {
      const quest = getQuestFromElement(menu);
      quest.entry.panToNote();
   }
};