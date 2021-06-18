import Fetch from '../control/Fetch.js';

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class QuestsCollection
{
   static get entities()
   {
      if (this._entities === undefined)
      {
         const entities = Fetch.allQuests();
         this._entities = entities.map((e) =>
         {
            const data = e;

            return {
               id: e.id,
               name: e.title,
               data
            };
         });
      }

      return this._entities;
   }

   static get instance()
   {
      return this;
   }

   static get(questId)
   {
      return Fetch.quest(questId);
   }

   static getName(name)
   {
      return this.entities.find((e) => e.name === name);
   }
}
