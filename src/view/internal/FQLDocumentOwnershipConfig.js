/**
 * Provides a custom override to DocumentOwnershipConfig enabling GM & trusted player w/ edit capabilities to alter
 * quest ownership. The default DocumentOwnershipConfig only allows GM level users permission editing.
 *
 * When the underlying document / {@link JournalEntry} is updated the {@link QuestDB} will receive this update and
 * fire {@link QuestDBHooks} that other parts of FQL can respond to handle as necessary. In particular
 * {@link ViewManager} handles these hooks to update the GUI on local and remote clients when ownership change.
 */
export class FQLDocumentOwnershipConfig extends DocumentOwnershipConfig // eslint-disable-line no-undef
{
   /** @override */
   async _updateObject(event, formData)
   {
      event.preventDefault();

      // Collect new ownership levels from the form data
      const omit = CONST.DOCUMENT_META_OWNERSHIP_LEVELS.DEFAULT;
      const ownershipLevels = {};

      for (const [user, level] of Object.entries(formData))
      {
         if (level === omit)
         {
            delete ownershipLevels[user];
            continue;
         }
         ownershipLevels[user] = level;
      }

      // Update a single Document
      return this.document.update({ ownership: ownershipLevels }, { diff: false, recursive: false, noHook: true });
   }
}
