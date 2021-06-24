let s_DELETE_DIALOG = void 0;

/**
 * Provides a single dialog for confirming quest, task, & reward deletion.
 *
 * Note: You have been warned. This is tricky code. Please understand it before modifying. Feel free to ask questions:

 * Discord: MLeahy#4299 / Michael Leahy <support@typhonjs.io> (https://github.com/typhonrt)
 *
 * There presently is no modal dialog in Foundry and this dialog implementation repurposes a single dialog instance
 * through potentially multiple cycles of obtaining and resolving Promises storing the resolve function in the dialog
 * itself. There are four locations in the codebase where a delete confirmation dialog is invoked and awaited upon. Each
 * time one of the static methods below is invoked the previous the current promise resolves with undefined / void 0
 * and then the same dialog instance is reconfigured with new information about a successive delete confirmation
 * operation and brings the dialog to front and renders again. This provides reasonable semi-modal behavior from just a
 * single dialog instance shared across confirmation to delete quests, tasks, and rewards.
 */
export default class FQLDialog
{
   static closeDialogs(questId)
   {
      if (s_DELETE_DIALOG && s_DELETE_DIALOG.fqlQuestId === questId)
      {
         s_DELETE_DIALOG.close();
         s_DELETE_DIALOG = void 0;
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
    * @param {string|void} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteQuest({ name, result, questId })
   {
      if (s_DELETE_DIALOG && s_DELETE_DIALOG.rendered)
      {
         return s_DELETE_DIALOG.updateFQLData({
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.Quest'),
            body: 'ForienQuestLog.DeleteDialog.BodyQuest'
         });
      }

      s_DELETE_DIALOG = void 0;

      return new Promise((resolve) =>
      {
         s_DELETE_DIALOG = new FQLDialogImpl({
            resolve,
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.Quest'),
            body: 'ForienQuestLog.DeleteDialog.BodyQuest'
         });

         s_DELETE_DIALOG.render(true);
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
    * @param {string|void} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteReward({ name, result, questId })
   {
      if (s_DELETE_DIALOG && s_DELETE_DIALOG.rendered)
      {
         return s_DELETE_DIALOG.updateFQLData({
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Reward'),
            body: 'ForienQuestLog.DeleteDialog.BodyReward'
         });
      }

      s_DELETE_DIALOG = void 0;

      return new Promise((resolve) =>
      {
         s_DELETE_DIALOG = new FQLDialogImpl({
            resolve,
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Reward'),
            body: 'ForienQuestLog.DeleteDialog.BodyReward'
         });

         s_DELETE_DIALOG.render(true);
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
    * @param {string|void} options.questId - The questId to track to auto-close the dialog when the QuestPreview closes.
    *
    * @returns {Promise<string|void>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteTask({ name, result, questId })
   {
      if (s_DELETE_DIALOG && s_DELETE_DIALOG.rendered)
      {
         return s_DELETE_DIALOG.updateFQLData({
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Objective'),
            body: 'ForienQuestLog.DeleteDialog.BodyObjective'
         });
      }

      s_DELETE_DIALOG = void 0;

      return new Promise((resolve) =>
      {
         s_DELETE_DIALOG = new FQLDialogImpl({
            resolve,
            name,
            result,
            questId,
            title: game.i18n.localize('ForienQuestLog.QuestPreview.Objective'),
            body: 'ForienQuestLog.DeleteDialog.BodyObjective'
         });

         s_DELETE_DIALOG.render(true);
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

      this._fqlOptions = options;

      this.data = {
         title: game.i18n.format('ForienQuestLog.DeleteDialog.TitleDel', this._fqlOptions),
         content: `<h3>${game.i18n.format('ForienQuestLog.DeleteDialog.HeaderDel', this._fqlOptions)}</h3>` +
          `<p>${game.i18n.localize(this._fqlOptions.body)}</p>`,
         buttons: {
            yes: {
               icon: '<i class="fas fa-trash"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
               callback: () => this._fqlOptions.resolve(this._fqlOptions.result)
            },
            no: {
               icon: '<i class="fas fa-times"></i>',
               label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel'),
               callback: () => this._fqlOptions.resolve(void 0)
            }
         }
      };
   }

   async close()
   {
      this._fqlOptions.resolve(void 0);
      return super.close();
   }

   get fqlQuestId() { return this._fqlOptions.questId; }

   updateFQLData(options)
   {
      // Resolve old promise with undefined
      this._fqlOptions.resolve(void 0);

      // Set new options
      this._fqlOptions = options;

      // Create a new Promise that will store the resolve function in this FQLDialogImpl.
      const promise = new Promise((resolve) => { this._fqlOptions.resolve = resolve; });

      // Update title and content with new data.
      this.data.title = game.i18n.format('ForienQuestLog.DeleteDialog.TitleDel', this._fqlOptions);
      this.data.content = `<h3>${game.i18n.format('ForienQuestLog.DeleteDialog.HeaderDel', this._fqlOptions)}</h3>` +
       `<p>${game.i18n.localize(this._fqlOptions.body)}</p>`;

      // Bring the dialog to top and render again.
      this.bringToTop();
      this.render(true);

      // Return the new promise which is resolved from another update with undefined or the dialog confirmation action,
      // or the dialog being closed.
      return promise;
   }
}
