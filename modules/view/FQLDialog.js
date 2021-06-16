let s_CONFIG_DELETE = void 0;

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
      if (s_CONFIG_DELETE)
      {
         s_CONFIG_DELETE.bringToTop();
         return Promise.resolve(false);
      }

      return new Promise((resolve) =>
      {
         s_CONFIG_DELETE = new Dialog({
            title: game.i18n.format('ForienQuestLog.DeleteDialog.Title', quest.name),
            content: `<h3>${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}</h3>` +
             `<p>${game.i18n.localize('ForienQuestLog.DeleteDialog.Body')}</p>`,
            buttons: {
               yes: {
                  icon: '<i class="fas fa-trash"></i>',
                  label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
                  callback: () =>
                  {
                     s_CONFIG_DELETE = void 0;
                     resolve(true);
                  }
               },
               no: {
                  icon: '<i class="fas fa-times"></i>',
                  label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel'),
                  callback: () =>
                  {
                     s_CONFIG_DELETE = void 0;
                     resolve(false);
                  }
               }
            },
            default: 'yes'
         }).render(true);
      });
   }
}