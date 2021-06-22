let s_CONFIRM_DELETE_REWARD = void 0;
let s_CONFIRM_DELETE_TASK = void 0;
let s_CONFIRM_DELETE_QUEST = void 0;

/**
 * Dialogs for confirming quest / task deletion and closing the QuestForm during quest creation.
 *
 * It would be nice to use Foundry VTT dialog implementations for a delete and close dialog, but there is no out of the
 * box way to provide a modal dialog. It might be possible to create a modal dialog in the future with a custom class
 * extension of Dialog, but for the time being the dialog implementations below are the semi-modal.
 */
export default class FQLDialog
{
   static closeDialogs(questId)
   {
      if (s_CONFIRM_DELETE_TASK && s_CONFIRM_DELETE_TASK.fqlQuestId === questId)
      {
         s_CONFIRM_DELETE_TASK.close();
         s_CONFIRM_DELETE_TASK = void 0;
      }

      if (s_CONFIRM_DELETE_REWARD && s_CONFIRM_DELETE_REWARD.fqlQuestId === questId)
      {
         s_CONFIRM_DELETE_REWARD.close();
         s_CONFIRM_DELETE_REWARD = void 0;
      }

      if (s_CONFIRM_DELETE_QUEST && s_CONFIRM_DELETE_QUEST.fqlQuestId === questId)
      {
         s_CONFIRM_DELETE_QUEST.close();
         s_CONFIRM_DELETE_QUEST = void 0;
      }
   }

   /**
    * Show a dialog to confirm quest deletion.
    *
    * @param {options} options - Optional parameters.
    *
    * @param {string} options.name - The name for the reward to delete.
    *
    * @param {string} options.result - The UUID of the reward to delete.
    *
    * @param {string} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteQuest({ name, result, questId })
   {
      if (s_CONFIRM_DELETE_QUEST && s_CONFIRM_DELETE_QUEST.rendered)
      {
         s_CONFIRM_DELETE_QUEST.updateFQLData(name, result);
         return void 0;
      }

      s_CONFIRM_DELETE_QUEST = void 0;

      return new Promise((resolve) =>
      {
         s_CONFIRM_DELETE_QUEST = new FQLDialogImpl({
            result,
            resolve,
            name,
            questId,
            title: game.i18n.localize('ForienQuestLog.Quest'),
            body: 'ForienQuestLog.DeleteDialog.BodyQuest'
         });

         s_CONFIRM_DELETE_QUEST.render(true);
      });
   }

   /**
    * Show a dialog to confirm reward deletion.
    *
    * @param {options} options - Optional parameters.
    *
    * @param {string} options.name - The name for the reward to delete.
    *
    * @param {string} options.result - The UUID of the reward to delete.
    *
    * @param {string} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteReward({ name, result, questId })
   {
      if (s_CONFIRM_DELETE_REWARD && s_CONFIRM_DELETE_REWARD.rendered)
      {
         s_CONFIRM_DELETE_REWARD.updateFQLData(name, result);
         return void 0;
      }

      s_CONFIRM_DELETE_REWARD = void 0;

      return new Promise((resolve) =>
      {
         s_CONFIRM_DELETE_REWARD = new FQLDialogImpl({
            result,
            resolve,
            name,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Reward'),
            body: 'ForienQuestLog.DeleteDialog.BodyReward'
         });

         s_CONFIRM_DELETE_REWARD.render(true);
      });
   }

   /**
    * Show a dialog to confirm task deletion.
    *
    * @param {options} options - Optional parameters.
    *
    * @param {string} options.name - The name for the task to delete.
    *
    * @param {string} options.result - The UUIDv4 of the task to delete.
    *
    * @param {string} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteTask({ name, result, questId })
   {
      if (s_CONFIRM_DELETE_TASK && s_CONFIRM_DELETE_TASK.rendered)
      {
         s_CONFIRM_DELETE_TASK.updateFQLData(name, result);
         return void 0;
      }

      s_CONFIRM_DELETE_TASK = void 0;

      return new Promise((resolve) =>
      {
         s_CONFIRM_DELETE_TASK = new FQLDialogImpl({
            result,
            resolve,
            name,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Objective'),
            body: 'ForienQuestLog.DeleteDialog.BodyObjective'
         });

         s_CONFIRM_DELETE_TASK.render(true);
      });
   }
}

class FQLDialogImpl extends Dialog
{
   /**
    * @param {Object} options FQLDialogImpl Options
    */
   constructor(options)
   {
      super(void 0, { minimizable: false });

      this.fqlResult = options.result;
      this.fqlResolve = options.resolve;
      this.fqlBody = options.body;
      this.fqlQuestId = options.questId;

      this.data = {
         title: game.i18n.format('ForienQuestLog.DeleteDialog.TitleDel', options),
         content: `<h3>${game.i18n.format('ForienQuestLog.DeleteDialog.HeaderDel', options)}</h3>` +
          `<p>${game.i18n.localize(this.fqlBody)}</p>`,
         buttons: {
            yes: {
               icon: '<i class="fas fa-trash"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
               callback: () => this.fqlResolve(this.fqlResult)
            },
            no: {
               icon: '<i class="fas fa-times"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel'),
               callback: () => this.fqlResolve(void 0)
            }
         }
      };
   }

   async close()
   {
      this.fqlResolve(void 0);
      return super.close();
   }

   updateFQLData(name, result)
   {
      this.data.content = `<h3>${game.i18n.format('ForienQuestLog.DeleteDialog.HeaderDel', { name })}</h3>` +
       `<p>${game.i18n.localize(this.fqlBody)}</p>`;

      this.fqlResult = result;
      this.bringToTop();
      this.render(true);
   }
}