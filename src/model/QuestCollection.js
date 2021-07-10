import QuestDB from '../control/QuestDB.js';
import Quest   from '../model/Quest.js';

/**
 * Provides a shim to link QuestDB to a Foundry Collection. Instead of storing any data directly the appropriate methods
 * either defer to QuestDB or provide the necessary iterator to access the contents of the in-memory QuestDB.
 *
 * @see https://foundryvtt.com/api/Collection.html
 */
export default class QuestCollection extends foundry.utils.Collection
{
   /**
    * Returns the document name for this Collection.
    *
    * @returns {string} document name.
    */
   static get documentName()
   {
      return Quest.documentName;
   }

   /**
    * Returns the document name for this Collection.
    *
    * @returns {string} document name.
    */
   get documentName()
   {
      return Quest.documentName;
   }

   /**
    * Returns this collection.
    *
    * @returns {QuestCollection} This instance.
    */
   static get instance()
   {
      return game.collections.get(Quest.documentName);
   }

   /**
    * @returns {Quest[]} All quests.
    */
   contents()
   {
      return QuestDB.getAllQuests();
   }

   /**
    * Returns an iterator of entries for all Quests in the QuestDB.
    *
    * @yields {Array.<string, Quest>}
    */
   *entries()
   {
      for (const quest of QuestDB.iteratorQuests())
      {
         yield [quest.id, quest];
      }
   }

   /**
    * Get an element from the Collection by its key.
    *
    * @param {string} questId      The key of the entry to retrieve
    *
    * @param {object} [options]  Additional options that affect how entries are retrieved
    *
    * @param {boolean} [options.strict=false] Throw an Error if the requested key does not exist. Default false.
    *
    * @returns {Quest|void}    The retrieved entry value, if the key exists, otherwise undefined
    *
    * @example
    * let c = new Collection([["a", "Alfred"], ["b", "Bob"], ["c", "Cynthia"]]);
    * c.get("a"); // "Alfred"
    * c.get("d"); // undefined
    * c.get("d", {strict: true}); // throws Error
    */
   get(questId, { strict = false } = {})
   {
      const entry = QuestDB.getQuest(questId);

      if (strict && (entry === void 0))
      {
         throw new Error(`The key ${questId} does not exist in QuestCollection`);
      }

      return entry;
   }

   /**
    * Get an entry from the Collection by name.
    * Use of this method assumes that the objects stored in the collection have a "name" attribute.
    *
    * @param {string} name       The name of the entry to retrieve
    *
    * @param {object} [options]  Additional options that affect how entries are retrieved
    *
    * @param {boolean} [options.strict=false] Throw an Error if the requested name does not exist. Default false.
    *
    * @returns {Quest}                The retrieved entry value, if one was found, otherwise undefined
    *
    * @example
    * let c = new Collection([["a", "Alfred"], ["b", "Bob"], ["c", "Cynthia"]]);
    * c.getName("Alfred"); // "Alfred"
    * c.getName("D"); // undefined
    * c.getName("D", {strict: true}); // throws Error
    */
   getName(name, { strict = false } = {})
   {
      const entry = this.find((e) => e.name === name);

      if (strict && (entry === void 0))
      {
         throw new Error(`An entry with name ${name} does not exist in the collection`);
      }
      return entry ?? void 0;
   }

   /**
    * Overridden with noop implementation.
    *
    * @param {*}  key - A key
    *
    * @param {*}  value - A value
    */
   set(key, value) {} // eslint-disable-line

   /**
    * @returns {Generator<Quest, void, *>} The QuestDB iterator for all loaded in-memory quests.
    */
   values()
   {
      return QuestDB.iteratorQuests();
   }
}
