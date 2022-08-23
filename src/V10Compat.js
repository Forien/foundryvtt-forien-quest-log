let isV10 = false;

Hooks.once('init', () =>
{
   isV10 = !foundry.utils.isNewerVersion(10, game.version ?? game.data.version);
});

/**
 * Provides v10 Foundry core compatibility fixes providing a temporary shim for v9 to v10 changes.
 */
export class V10Compat
{
   /**
    * Returns true when Foundry is v10+
    *
    * @returns {boolean} Foundry v10+
    */
   static get isV10() { return isV10; }

   /**
    * @param {foundry.abstract.Document}  doc -
    *
    * @returns {*} Foundry ownership / permission object.
    */
   static ownership(doc)
   {
      if (!doc) { return void 0; }
      return isV10 ? doc.ownership : doc.data.permission;
   }
}

//       {{{editor target="description" content=description button=true editable=true owner=true}}}
//   {{{editor target="gmnotes" content=gmnotes button=true editable=true owner=true}}}