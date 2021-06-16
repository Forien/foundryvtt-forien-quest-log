export default class FQLDialog
{
   /**
    * Show a dialog to confirm deletion
    *
    * @param {Quest} quest - The quest to delete / using name of quest in dialog.
    *
    * @returns {Promise<boolean>} Result of the delete confirmation dialog.
    */
   static confirmDelete(quest)
   {
      return new Promise((resolve) =>
      {
         new Dialog({
            title: game.i18n.format('ForienQuestLog.DeleteDialog.Title', quest.name),
            content: `<h3>${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}</h3>` +
             `<p>${game.i18n.localize('ForienQuestLog.DeleteDialog.Body')}</p>`,
            buttons: {
               yes: {
                  icon: '<i class="fas fa-trash"></i>',
                  label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
                  callback: () => resolve(true)
               },
               no: {
                  icon: '<i class="fas fa-times"></i>',
                  label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel'),
                  callback: () => resolve(false)
               }
            },
            default: 'yes'
         }).render(true);
      });
   }
}