/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
import Quest from "../quest.mjs";

export default class QuestsCollection {
  constructor() {
    let quests = Quest.getQuests();
    let entities = [...quests.active, ...quests.completed, ...quests.failed, ...quests.hidden];

    this.entities = entities.map(e => {
      let data = e;
      data.name = data.title;

      return {
        _id: e.id,
        id: e.id,
        name: e.title,
        data: data
      }
    })
  }

  get(questId) {
    return Quest.get(questId);
  }
}
