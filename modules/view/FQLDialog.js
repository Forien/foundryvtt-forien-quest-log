// let s_CONFIG_DELETE = void 0;

// A single module private reference to only one close dialog.
// let s_CLOSE_DIALOG;

/**
 * Dialogs for confirming quest deletion and closing the QuestForm during quest creation.
 *
 * Both of these really need to be modal and there are no default modal implementations in Foundry, so a
 * modal dialog in the style of Foundry GUI is a future addition. For the time being simple confirm prompts are being
 * used but this was the previous dialog code.
 */
export default class FQLDialog
{
   /**
    * Show a dialog to confirm deletion
    *
    * @param {Quest} quest - The quest to delete / using name of quest in dialog.
    *
    * @returns {Promise<boolean>} Result of the delete confirmation dialog.
    */
   static async confirmDelete(quest)
   {
      const content = `${game.i18n.format('ForienQuestLog.DeleteDialog.Title', quest)}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}\n` +
      `${game.i18n.localize('ForienQuestLog.DeleteDialog.Body')}`;

      return confirm(content);

      // if (s_CONFIG_DELETE)
      // {
      //    s_CONFIG_DELETE.bringToTop();
      //    return Promise.resolve(false);
      // }
      //
      // return new Promise((resolve) =>
      // {
      //    s_CONFIG_DELETE = new Dialog({
      //       title: game.i18n.format('ForienQuestLog.DeleteDialog.Title', quest.name),
      //       content: `<h3>${game.i18n.localize('ForienQuestLog.DeleteDialog.Header')}</h3>` +
      //        `<p>${game.i18n.localize('ForienQuestLog.DeleteDialog.Body')}</p>`,
      //       buttons: {
      //          yes: {
      //             icon: '<i class="fas fa-trash"></i>',
      //             label: game.i18n.localize('ForienQuestLog.DeleteDialog.Delete'),
      //             callback: () =>
      //             {
      //                s_CONFIG_DELETE = void 0;
      //                resolve(true);
      //             }
      //          },
      //          no: {
      //             icon: '<i class="fas fa-times"></i>',
      //             label: game.i18n.localize('ForienQuestLog.DeleteDialog.Cancel'),
      //             callback: () =>
      //             {
      //                s_CONFIG_DELETE = void 0;
      //                resolve(false);
      //             }
      //          }
      //       },
      //       default: 'yes'
      //    }).render(true);
      // });
   }

   /**
    * Used to show a modal dialog when potentially closing QuestForm early.
    *
    * @returns {Promise<boolean>}
    */
   static async confirmClose()
   {
      return confirm(game.i18n.localize('ForienQuestLog.CloseDialog.Body'));

//          s_CLOSE_DIALOG = new Dialog({
//             title: game.i18n.localize('ForienQuestLog.CloseDialog.Title'),
//             content: `<h3>${game.i18n.localize('ForienQuestLog.CloseDialog.Header')}</h3>
// <p>${game.i18n.localize('ForienQuestLog.CloseDialog.Body')}</p>`,
//             buttons: {
//                no: {
//                   icon: `<i class="fas fa-undo"></i>`,
//                   label: game.i18n.localize('ForienQuestLog.CloseDialog.Cancel'),
//                   callback: () =>
//                   {
//                      s_CLOSE_DIALOG = void 0;
//                   }
//                },
//                yes: {
//                   icon: `<i class="far fa-trash-alt"></i>`,
//                   label: game.i18n.localize('ForienQuestLog.CloseDialog.Discard'),
//                   callback: () =>
//                   {
//                      this._submitted = true;
//                      s_CLOSE_DIALOG = void 0;
//                      this.close();
//                   }
//                }
//             },
//             default: 'no'
//          }).render(true);
   }
}