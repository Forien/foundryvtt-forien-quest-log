import { constants } from './model/constants.js';

let isV10 = false;

Hooks.once('init', () =>
{
   isV10 = !foundry.utils.isNewerVersion(10, game.version ?? game?.data?.version);
});

/**
 * Provides v10 Foundry core compatibility fixes providing a temporary shim for v9 to v10 changes.
 */
export class FVTTCompat
{
   /**
    * Returns the author ID of a document depending on v10.
    *
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Author ID
    */
   static authorID(doc)
   {
      if (!doc) { return void 0; }
      return isV10 ? doc?.author?.id : doc?.data?.author;
   }

   /**
    * Returns folder contents.
    *
    * @param {Folder}   folder -
    *
    * @returns {*[]} Folder contents;
    */
   static folderContents(folder)
   {
      if (!folder) { return void 0; }
      return folder?.contents ?? folder?.content ?? [];
   }

   /**
    * @param {object} data - data transfer from macro hot bar drop.
    *
    * @returns {boolean} Data transfer object is an FQL macro.
    */
   static isFQLMacroDataTransfer(data)
   {
      if (data?.type !== 'Macro') { return false; }

      return isV10 ? typeof data?.uuid === 'string' && data.uuid.startsWith(`Compendium.${constants.moduleName}`) :
       typeof data?.pack === 'string' && data.pack.startsWith(constants.moduleName);
   }

   /**
    * Returns true when Foundry is v10+
    *
    * @returns {boolean} Foundry v10+
    */
   static get isV10() { return isV10; }

   /**
    * Returns the data property depending on v10.
    *
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @param {string}   property - Property field.
    *
    * @returns {string} Data value.
    */
   static get(doc, property)
   {
      if (!doc || typeof property !== 'string') { return void 0; }
      return isV10 ? doc[property] : doc.data[property];
   }

   /**
    * Returns any associated journal image. For v10 journal docs this is the first page that is an image.
    *
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Journal image.
    */
   static journalImage(doc)
   {
      if (!doc) { return void 0; }

      if (isV10)
      {
         // Search for the first JournalEntryPage embedded collection for an image.
         try
         {
            const pages = doc.getEmbeddedCollection('JournalEntryPage');
            for (const page of pages)
            {
               if (page?.type === 'image') { return page?.src; }
            }
         }
         catch (err) { return void 0; }
      }
      else
      {
         return doc?.data?.img;
      }
   }

   /**
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Foundry ownership / permission object.
    */
   static ownership(doc)
   {
      if (!doc) { return void 0; }
      return isV10 ? doc.ownership : doc.data.permission;
   }

   /**
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Token image path.
    */
   static tokenImg(doc)
   {
      if (!doc) { return void 0; }

      return isV10 ? doc?.prototypeToken?.texture?.src : doc?.data?.token?.img;
   }
}
