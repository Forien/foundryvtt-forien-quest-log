/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
import Quest from '../Quest.js';

export default class QuestsCollection
{
   static get entities()
   {
      if (this._entities === undefined)
      {
         const quests = Quest.getQuests();
         const entities = [...quests.active, ...quests.completed, ...quests.failed, ...quests.hidden];

         this._entities = entities.map((e) =>
         {
            const data = e;
            data.name = data.title;

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
      return Quest.get(questId);
   }

   static getName(name)
   {
      return this.entities.find((e) => e.name === name);
   }
}
