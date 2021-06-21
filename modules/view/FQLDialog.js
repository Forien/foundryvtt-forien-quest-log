/**
 * Dialogs for confirming quest / task deletion and closing the QuestForm during quest creation.
 *
 * It would be nice to use Foundry VTT dialog implementations for a delete and close dialog, but there is no out of the
 * box way to provide a modal dialog. It might be possible to create a modal dialog in the future with a custom class
 * extension of Dialog, but for the time being it was easier to implement with certainty the modal experience using
 * the standard Javascript confirm mechanism.
 *
 * The methods below are async even though they do not need to be, but if and when these dialogs are replaced they
 * will have to be async.
 */
export default class FQLDialog
{
   /**
    * Show a dialog to confirm quest deletion.
    *
    * @param {Quest} quest - The quest to delete / using name for the quest in dialog.
    *
    * @returns {Promise<boolean>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteQuest(quest)
   {
      const content = `${game.i18n.format('ForienQuestLog.DeleteDialog.Title', quest)}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.BodyQuest')}`;

      return confirm(content);
   }

   /**
    * Show a dialog to confirm reward deletion.
    *
    * @param {string} name - The name for the reward to delete.
    *
    * @returns {Promise<boolean>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteReward(name)
   {
      const content = `${game.i18n.format('ForienQuestLog.DeleteDialog.Title', { name })}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.BodyReward')}`;

      return confirm(content);
   }

   /**
    * Show a dialog to confirm task deletion.
    *
    * @param {string} name - The task name to delete.
    *
    * @returns {Promise<boolean>} Result of the delete confirmation dialog.
    */
   static async confirmDeleteTask(name)
   {
      const content = `${game.i18n.format('ForienQuestLog.DeleteDialog.Title', { name })}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.BodyTask')}`;

      return confirm(content);
   }

   /**
    * Used to show a modal dialog when potentially closing QuestForm early.
    *
    * @returns {Promise<boolean>} Result of the close confirmation dialog.
    */
   static async confirmClose()
   {
      return confirm(game.i18n.localize('ForienQuestLog.CloseDialog.Body'));
   }
}

