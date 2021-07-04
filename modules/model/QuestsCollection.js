import QuestDB from '../control/QuestDB.js';

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class QuestsCollection
{
   static get contents()
   {
      return QuestDB.getAllQuests();
   }

   static get instance()
   {
      return this;
   }

   static get(questId)
   {
      return QuestDB.getQuest(questId);
   }

   static getName(name)
   {
      return QuestDB.getName(name);
   }
}
