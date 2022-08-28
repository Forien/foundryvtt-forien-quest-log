import { V10Compat } from "../V10Compat.js";

/**
 * A bit convoluted solution as to remove warning on v10 we have to use DocumentOwnershipConfig, but this class doesn't
 * exist in v9. Use dynamic import on v10 to load the FQL implementation.
 */
export default class FQLPermissionControl
{
   static async create(doc, options)
   {
      if (V10Compat.isV10)
      {
         // Must use dynamic import as DocumentOwnershipConfig does not exist in v9.
         const FQLDocumentOwnershipConfig = (await import('./FQLDocumentOwnershipConfig.js')).default;
         return new FQLDocumentOwnershipConfig(doc, options);
      }
      else
      {
         return new FQLPermissionControlImpl(doc, options);
      }
   }
}

/**
 * Provides a custom override to PermissionControl for v9 enabling GM & trusted player w/ edit capabilities to alter
 * quest permissions. The default PermissionControl only allows GM level users permission editing.
 *
 * When the underlying document / {@link JournalEntry} is updated the {@link QuestDB} will receive this update and
 * fire {@link QuestDBHooks} that other parts of FQL can respond to handle as necessary. In particular
 * {@link ViewManager} handles these hooks to update the GUI on local and remote clients when permissions change.
 */
class FQLPermissionControlImpl extends PermissionControl
{
   // /** @override */
   async _updateObject(event, formData)
   {
      event.preventDefault();

      // Collect user permissions
      const perms = {};
      for (const [user, level] of Object.entries(formData))
      {
         if (level === -1)
         {
            delete perms[user];
            continue;
         }
         perms[user] = level;
      }

      return this.document.update({ permission: perms }, { diff: false, recursive: false, noHook: true });
   }
}