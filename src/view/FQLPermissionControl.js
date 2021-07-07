/**
 * TODO DOCUMENT
 */
export default class FQLPermissionControl extends PermissionControl
{
   /** @override */
   async _updateObject(event, formData)
   {
      event.preventDefault();

      // Collect user permissions
      const perms = {};
      for (const [user, level] of Object.entries(formData))
      {
         if ((name !== 'default') && (level === -1))
         {
            delete perms[user];
            continue;
         }
         perms[user] = level;
      }

      // Update all entities in a Folder
      if (this.document instanceof Folder)
      {
         const cls = getDocumentClass(this.document.type);
         const updates = this.document.content.map((e) =>
         {
            const p = foundry.utils.deepClone(e.data.permission);
            for (const [k, v] of Object.entries(perms))
            {
               if (v === -2)
               {
                  delete p[k];
               }
               else
               {
                  p[k] = v;
               }
            }
            return { _id: e.id, permission: p };
         });
         return cls.updateDocuments(updates, { diff: false, recursive: false, noHook: true });
      }

      // Update a single Entity
      return this.document.update({ permission: perms }, { diff: false, recursive: false, noHook: true });
   }
}