/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
import Quest from "../quest.mjs";

export default class QuestsCollection {
  static _entities = undefined;
  static get entities() {
    if (this._entities === undefined) {
      let quests = Quest.getQuests();
      let entities = [...quests.active, ...quests.completed, ...quests.failed, ...quests.hidden];

      this._entities = entities.map(e => {
        let data = e;
        data.name = data.title;

        return {
          id: e.id,
          name: e.title,
          data: data
        }
      })
    }

    return this._entities;
  }

  static get(questId) {
    return Quest.get(questId);
  }

  static getName(name) {
    return this.entities.find(e => e.name === name);
  }

  static get instance() {
    return this;
  }
}
