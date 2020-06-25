import Socket from "../utility/socket.mjs";
import Utils from "../utility/utils.mjs";
import QuestFolder from "./quest-folder.mjs";
import Reward from "./reward.mjs";
import Task from "./task.mjs";
import QuestsCollection from "./collection/quests-collection.mjs";

/**
 * Class that acts "kind of" like Entity, to help Manage everything Quest Related
 * in a more structured way, than to call JournalEntry every time.
 */
export default class Quest {
  constructor(data = {}) {
    this._id = data.id || null;
    this.initData(data);
    this._data = data;
  }

  /**
   * Normally would be in constructor(), but is extracted for usage in different methods as well
   *
   * @see refresh()
   * @param data
   */
  initData(data) {
    this._giver = data.giver || null;
    this._title = data.title || game.i18n.localize("ForienQuestLog.NewQuest");
    this._status = data.status || 'hidden';
    this._description = data.description || '';
    this._gmnotes = data.gmnotes || '';
    this._image = data.image || 'actor';
    this._personal = data.personal || false;
    this._tasks = [];
    this._rewards = [];
    this._populated = false;

    if (data.tasks !== undefined && Array.isArray(data.tasks))
      this._tasks = data.tasks.map((task) => {
        return new Task(task);
      });
    if (data.rewards !== undefined && Array.isArray(data.rewards))
      this._rewards = data.rewards.map((reward) => {
        return new Reward(reward);
      });
  }

  /**
   * Creates new and adds Task to task array of quest.
   *
   * @param data
   */
  addTask(data = {}) {
    let task = new Task(data);
    if (task.isValid)
      this._tasks.push(task);
  }

  /**
   * Creates new and adds Reward to reward array of quest.
   *
   * @param data
   */
  addReward(data = {}) {
    let reward = new Reward(data);
    if (reward.isValid)
      this._rewards.push(reward);
  }

  /**
   * Deletes Task from Quest
   *
   * @param index
   */
  removeTask(index) {
    if (this._tasks[index] !== undefined)
      this._tasks.splice(index, 1);
  }

  /**
   * Deletes Reward from Quest
   *
   * @param index
   */
  removeReward(index) {
    if (this._rewards[index] !== undefined)
      this._rewards.splice(index, 1);
  }

  /**
   * Toggles visibility of Reward
   *
   * @param index
   * @returns {Promise<void>}
   */
  async toggleReward(index) {
    if (this._rewards[index] !== undefined)
      return await this._rewards[index].toggleVisible();
  }

  /**
   * Toggles visibility of Task
   *
   * @param index
   * @returns {Promise<void>}
   */
  async toggleTask(index) {
    if (this._tasks[index] !== undefined)
      return await this._tasks[index].toggleVisible();
  }

  /**
   * Toggles Actor image between sheet's and token's images
   */
  async toggleImage() {
    if (this._image === 'actor') {
      this._image = 'token';
    } else {
      this._image = 'actor';
    }
  }

  /**
   * Refreshes data without need of destroying and reinstantiating Quest object
   */
  refresh() {
    let entry = game.journal.get(this._id);
    let content = Quest.getContent(entry);

    this.initData(content);
  }

  /**
   * Toggles quest between Public and Personal. In both cases, it hides the quest from everyone.
   * If new status is public, then hide it.
   *
   * @returns {Promise<void>}
   */
  async togglePersonal() {
    this._personal = !this._personal;
    this.permission = {default: 0};
    if (this._personal === false) {
      this.status = 'hidden';
    }
  }

  /**
   * Saves new permissions for users. Used by Personal Quests feature.
   *
   * @param userId
   * @param permission
   * @returns {Promise<void>}
   */
  async savePermission(userId, permission) {
    if (permission !== CONST.ENTITY_PERMISSIONS.OBSERVER)
      if (permission !== CONST.ENTITY_PERMISSIONS.NONE)
        return;

    let user = game.users.get(userId);
    if (user === null) return;

    let entryData = duplicate(game.journal.get(this._id));

    if (permission === CONST.ENTITY_PERMISSIONS.NONE) {
      delete entryData.permission[userId];
    } else {
      entryData.permission[userId] = permission;
    }

    this.permission = entryData.permission;
  }

  /**
   * Saves Quest to JournalEntry's content, and if needed, moves JournalEntry to different folder.
   * Can also update JournalEntry's permissions.
   *
   * @returns {Promise<void>}
   */
  async save() {
    if (this._populated) {
      throw new Error(`Can't save populated Quest (${this._id})`);
    }

    let update = {
      content: JSON.stringify(this)
    };
    if (this.permission !== undefined) {
      update.permission = this.permission;
    }

    let entry = game.journal.get(this._id);
    await entry.update(update, {diff: false});
  }

  static get(questId) {
    let entry = game.journal.get(questId);
    if (!entry) return undefined;
    let content = this.getContent(entry);

    if (entry.permission < 2) return undefined;

    return new Quest(content);
  }

  /**
   * Populates content with a lot of additional data, that doesn't necessarily have to be saved
   * with Quest itself, such as Actor's data.
   *
   * This method also performs content manipulation, for example enriching HTML or calculating amount
   * of done/total tasks etc.
   *
   * Be advised, that even if `content` parameter is Quest object, after populating it cannot be saved.
   * If you need to keep Quest instance to be edited and saved, duplicate() it and populate copy.
   *
   * @param content
   * @param entry
   * @returns {*}
   */
  static populate(content, entry = undefined) {
    // let actor = Utils.findActor(content.actor);
    let isGM = game.user.isGM;
    let canPlayerDrag = game.settings.get("forien-quest-log", "allowPlayersDrag");
    let countHidden = game.settings.get("forien-quest-log", "countHidden");

    if (content.giver) {
      fromUuid(content.giver).then((entity) => {
        content.giver = duplicate(entity);

        switch (entity.entity) {
          case Actor.entity:
            if (content.image === 'token')
              content.giver.img = entity.data.token.img;
            break;
          case Item.entity:
          case JournalEntry.entity:
            break;
          default:
            content.giver = false;
        }
      });
    }

    if (countHidden) {
      content.checkedTasks = content.tasks.filter(t => t.completed).length;
      content.totalTasks = content.tasks.length;
    } else {
      content.checkedTasks = content.tasks.filter(t => t.hidden === false && t.completed).length;
      content.totalTasks = content.tasks.filter(t => t.hidden === false).length;
    }

    if (content.rewards === undefined) {
      content.rewards = [];
    }

    content.tasks = content.tasks.map((t) => {
      let task = new Task(t);
      task.name = TextEditor.enrichHTML(task.name);
      return task;
    });

    content.noRewards = (content.rewards.length === 0);
    content.rewards.forEach((item) => {
      item.transfer = JSON.stringify(item.data);
      item.type = item.type.toLowerCase();
      item.draggable = ((isGM || canPlayerDrag) && item.type !== 'abstract');
    });

    if (!isGM) {
      content.description = TextEditor.enrichHTML(content.description);
      content.tasks = content.tasks.filter(t => t.hidden === false);
      content.rewards = content.rewards.filter(r => r.hidden === false);
    }

    if (entry) {
      if (isGM && content.personal) {
        let users = [`${game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestVisibleFor')}:`];

        for (let perm in entry.data.permission) {
          if (perm === 'default') continue;
          if (entry.data.permission[perm] === 2) {
            let user = game.users.get(perm);
            users.push(user.name);
          }
        }

        if (users.length > 1) {
          content.users = users.join('\r');
        } else {
          content.users = game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestButNoPlayers');
        }
      }
    }

    return content;
  }


  /**
   * Retrieves JournalEntry's content (which is Quest's data) and optionally populates it.
   *
   * @see populate()
   *
   * @param entry
   * @param populate
   * @returns {*}
   */
  static getContent(entry, populate = false) {
    let content = entry.data.content;

    content = JSON.parse(content);
    content.id = entry._id;

    if (populate)
      content = this.populate(content, entry);

    return content;
  }

  /**
   * Retrieves all Quests, grouped by folders.
   *
   * @param sortTarget      sort by
   * @param sortDirection   sort direction
   * @param availableTab    true if Available tab is visible
   * @param populate
   * @returns {{}}
   */
  static getQuests(sortTarget = undefined, sortDirection = 'asc', availableTab = false, populate = false) {
    let folder = QuestFolder.get();
    let entries = [];

    folder.content.forEach(entry => {
      let content = this.getContent(entry, populate);
      entries.push(content);
    });

    if (sortTarget !== undefined) {
      entries = this.sort(entries, sortTarget, sortDirection)
    }

    const quests = {
      available: entries.filter(e => e.status === 'available'),
      active: entries.filter(e => e.status === 'active'),
      completed: entries.filter(e => e.status === 'completed'),
      failed: entries.filter(e => e.status === 'failed'),
      hidden: entries.filter(e => e.status === 'hidden')
    };

    if (!availableTab) {
      quests.hidden = [...quests.available, ...quests.hidden];
      quests.hidden = this.sort(quests.hidden, sortTarget, sortDirection)
    }

    return quests;
  }

  /**
   * Returns localization strings for quest types (statuses)
   *
   * @returns {{hidden: string, available: string, active: string, completed: string, failed: string}}
   */
  static getQuestTypes() {
    return {
      active: "ForienQuestLog.QuestTypes.InProgress",
      completed: "ForienQuestLog.QuestTypes.Completed",
      failed: "ForienQuestLog.QuestTypes.Failed",
      hidden: "ForienQuestLog.QuestTypes.Hidden",
      available: "ForienQuestLog.QuestLog.Tabs.Available"
    }
  }

  /**
   * Sort function to sort quests.
   *
   * @see getQuests()
   *
   * @param entries
   * @param sortTarget
   * @param sortDirection
   * @returns -1 | 0 | 1
   */
  static sort(entries, sortTarget, sortDirection) {
    return entries.sort((a, b) => {
      let targetA;
      let targetB;

      if (sortTarget === 'actor') {
        targetA = (a.actor) ? (a.actor.name || 'ZZZZZ') : 'ZZZZZ';
        targetB = (b.actor) ? (b.actor.name || 'ZZZZZ') : 'ZZZZZ';
      } else {
        targetA = a[sortTarget];
        targetB = b[sortTarget];
      }

      if (sortDirection === 'asc')
        return (targetA < targetB) ? -1 : (targetA > targetB) ? 1 : 0;

      return (targetA > targetB) ? -1 : (targetA < targetB) ? 1 : 0;
    });
  }

  /**
   * Moves Quest (and Journal Entry) to different Folder and updates permissions if needed.
   *
   * @param questId
   * @param target
   * @param permission
   * @returns {Promise<void>}
   */
  static async move(questId, target, permission = undefined) {
    let journal = game.journal.get(questId);
    let quest = this.getContent(journal);
    if (permission === undefined) {
      permission = journal.data.permission;
    }

    if (!quest.personal) {
      permission = {default: CONST.ENTITY_PERMISSIONS.OBSERVER};
      if (target === 'hidden')
        permission = {default: CONST.ENTITY_PERMISSIONS.NONE};
    }

    let content = Quest.getContent(journal);
    content.status = target;
    content = JSON.stringify(content);

    journal.update({content: content, "permission": permission}).then(() => {
      QuestLog.render(true);
      Socket.refreshQuestLog();
      let dirname = game.i18n.localize(this.getQuestTypes()[target]);
      ui.notifications.info(game.i18n.format("ForienQuestLog.Notifications.QuestMoved", {target: dirname}), {});
    });
  }

  /**
   * Calls a delete quest dialog.
   *
   * @param questId
   * @returns {Promise<void>}
   */
  static async delete(questId) {
    let entry = this.get(questId);

    new Dialog({
      title: game.i18n.format("ForienQuestLog.DeleteDialog.Title", entry.name),
      content: `<h3>${game.i18n.localize("ForienQuestLog.DeleteDialog.Header")}</h3>` +
        `<p>${game.i18n.localize("ForienQuestLog.DeleteDialog.Body")}</p>`,
      buttons: {
        yes: {
          icon: '<i class="fas fa-trash"></i>',
          label: game.i18n.localize("ForienQuestLog.DeleteDialog.Delete"),
          callback: () => this.deleteConfirm(questId)
        },
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize("ForienQuestLog.DeleteDialog.Cancel")
        }
      },
      default: 'yes'
    }).render(true);
  }

  /**
   * Called when user confirms the delete.
   * Deletes the Quest by deleting related JournalEntry.
   *
   * @param questId
   * @returns {Promise<void>}
   */
  static async deleteConfirm(questId) {
    let entry = game.journal.get(questId);

    entry.delete().then(() => {
      if (QuestLog.rendered)
        QuestLog.render(true);
      Socket.refreshQuestLog();
    });
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  get giver() {
    return this._giver;
  }

  set giver(value) {
    this._giver = value;
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this._title = value;
  }

  get description() {
    return this._description;
  }

  set description(value) {
    this._description = value;
  }

  get gmnotes() {
    return this._gmnotes;
  }

  set gmnotes(value) {
    this._gmnotes = value;
  }

  get tasks() {
    return this._tasks;
  }

  set image(image) {
    if (image === 'actor' || image === 'token')
      this._image = image;
  }

  get image() {
    return this._image;
  }

  get rewards() {
    return this._rewards;
  }

  get personal() {
    return this._personal;
  }

  set personal(value) {
    this._personal = (value === true);
  }


  get status() {
    return this._status;
  }

  set status(value) {
    this._status = value;
  }

  static get collection() {
    return QuestsCollection;
  }

  get name() {
    return this._title;
  }

  toJSON() {
    return {
      giver: this._giver,
      title: this._title,
      status: this._status,
      description: this._description,
      gmnotes: this._gmnotes,
      personal: this._personal,
      image: this._image,
      tasks: this._tasks,
      rewards: this._rewards
    }
  }
}

window.Quest = Quest;