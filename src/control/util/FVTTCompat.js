import { constants } from '../../model/constants.js';

/**
 * Provides potential shimming for the Foundry core API and potential support for other 3rd party modules like Monk's
 * Enhanced Journal (MEJ). In the case for MEJ this module stores the image for a journal documents it owns in custom
 * flags.
 *
 * Previously `FVTTCompat` provided v9 / v10+ shims for accessing Foundry core API. This compatibility layer is
 * maintained in the codebase, but for the time being the latest FQL is released for v11+ and the shimming
 * below just returns the current core API call / data. See the below sample code for how the shim is supposed to work
 * if necessary to re-implement shims in the future.
 *
 * Example of how the shimming works:
 * ```js
 * let isV10 = false;
 *
 * Hooks.once('init', () =>
 * {
 *    isV10 = !foundry.utils.isNewerVersion(10, game.version ?? game?.data?.version);
 * });
 *
 * export class FVTTCompat
 * {
 *    static get isV10() { return isV10; }
 *
 *    static authorID(doc)
 *    {
 *       if (!doc) { return void 0; }
 *
 *       return isV10 ? doc?.author?.id : doc?.data?.author;
 *    }
 * }
 * ```
 */
export class FVTTCompat
{
   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

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

      return doc?.author?.id;
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
      return folder?.contents ?? [];
   }

   /**
    * @param {object} data - data transfer from macro hot bar drop.
    *
    * @returns {boolean} Data transfer object is an FQL macro.
    */
   static isFQLMacroDataTransfer(data)
   {
      if (data?.type !== 'Macro') { return false; }

      return typeof data?.uuid === 'string' && data.uuid.startsWith(`Compendium.${constants.moduleName}`);
   }

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
      return doc[property];
   }

   /**
    * Retrieves the content from either TinyMCE or ProseMirror based editors. This is important because the content is
    * being retrieved directly from the editor instance to store in flags. Additional 3rd party modules may override
    * the default editor (ProseMirror) and use TinyMCE. Treating the editors neutrally allows support for any editor.
    *
    * @param {object}   editor - Editor object from `FormApplication`.
    *
    * @returns {string | undefined} Editor HTML content.
    */
   static getEditorContent(editor)
   {
      let content;

      try
      {
         // Attempt to retrieve content from TinyMCE editor instance.
         content = editor?.mce?.getContent?.();

         if (typeof content === 'string') { return content; }

         // Attempt to retrieve content from ProseMirror editor instance.
         if (editor?.instance?.view)
         {
            content = globalThis.ProseMirror.dom.serializeString(editor.instance.view.state.doc.content);
         }
      }
      catch (err) { /**/ }

      return content;
   }

   /**
    * Returns any associated journal image. For v10 journal docs this is the first page that is an image.
    *
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string | undefined} Journal image.
    */
   static journalImage(doc)
   {
      if (!doc) { return void 0; }

      // Support Monk's Enhanced Journal which stores images in flags.
      if (typeof doc?.flags?.['monks-enhanced-journal']?.img === 'string')
      {
         return doc.flags['monks-enhanced-journal'].img;
      }
      else
      {
         // Treat as normal Foundry journal doc and search for the first JournalEntryPage embedded collection for an
         // image.
         try
         {
            const pages = doc.getEmbeddedCollection('JournalEntryPage');
            for (const page of pages)
            {
               if (page?.type === 'image') { return page?.src; }
            }
         }
         catch (err) { /**/ }
      }

      return void 0;
   }

   /**
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Foundry ownership / permission object.
    */
   static ownership(doc)
   {
      if (!doc) { return void 0; }
      return doc.ownership;
   }

   /**
    * @param {foundry.abstract.Document|Document}  doc -
    *
    * @returns {string} Token image path.
    */
   static tokenImg(doc)
   {
      if (!doc) { return void 0; }

      return doc?.prototypeToken?.texture?.src;
   }
}
