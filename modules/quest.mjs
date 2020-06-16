import Task from "./task.mjs";
import Reward from "./reward.mjs";
import QuestFolder from "./quest-folder.mjs";
import Utils from "./utils.mjs";
import Socket from "./socket.mjs";

export default class Quest {
  constructor(data = {}) {
    this._id = data.id || null;
    this.initData(data);
  }

  initData(data) {
    this._actor = data.actor || null;
    this._title = data.title || game.i18n.localize("ForienQuestLog.NewQuest");
    this._description = data.description || '';
    this._gmnotes = data.gmnotes || '';
    this._tasks = [];
    this._rewards = [];
    this._image = data.image || 'actor';
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

  addTask(data = {}) {
    let task = new Task(data);
    if (task.isValid)
      this._tasks.push(task);
  }

  addReward(data = {}) {
    let reward = new Reward(data);
    if (reward.isValid)
      this._rewards.push(reward);
  }

  removeTask(index) {
    if (this._tasks[index] !== undefined)
      this._tasks.splice(index, 1);
  }

  removeReward(index) {
    if (this._rewards[index] !== undefined)
      this._rewards.splice(index, 1);
  }

  toggleImage() {
    if (this._image === 'actor') {
      this._image = 'token';
    } else {
      this._image = 'actor';
    }
  }

  refresh() {
    let entry = game.journal.get(this._id);
    let content = Quest.getContent(entry);

    this.initData(content);
  }

  async save() {
    if (this._populated) {
      throw new Error(`Can't save populated Quest (${this._id})`);
    }
    let entry = game.journal.get(this._id);
    await entry.update({content: JSON.stringify(this)});
  }

  static get(questId) {
    let entry = game.journal.get(questId);
    let content = this.getContent(entry);

    return new Quest(content);
  }

  static populate(content) {
    let actor = Utils.findActor(content.actor);
    if (actor !== false)
      content.actor = duplicate(actor);
    if (content.image === 'token')
      content.actor.img = actor.data.token.img;

    content.checkedTasks = content.tasks.filter(t => t.completed).length;
    content.totalTasks = content.tasks.length;

    if (content.rewards === undefined) {
      content.rewards = [];
    }

    content.tasks = content.tasks.map((t) => {
      return new Task(t)
    });

    content.noRewards = (content.rewards.length === 0);
    content.rewards.forEach((item) => {
      item.transfer = JSON.stringify(item.data);
      item.type = item.type.toLowerCase();
    });

    return content;
  }

  static getContent(entry, populate = false) {
    let content = entry.data.content;

    content = JSON.parse(content);
    content.id = entry._id;

    if (populate)
      content = this.populate(content);

    return content;
  }

  static getQuests(sortTarget = undefined, sortDirection = 'asc') {
    let quests = {};
    for (let [key, value] of Object.entries(QuestFolder.questDirIds)) {
      if (key === 'root') continue;
      let folder = game.folders.get(value);
      let entries = [];

      folder.content.forEach(entry => {
        let content = this.getContent(entry, true);
        entries.push(content);
      });

      if (sortTarget !== undefined) {
        entries = this.sort(entries, sortTarget, sortDirection)
        console.log(entries);
      }
      quests[key] = entries;
    }

    return quests;
  }

  static getQuestTypes() {
    return {
      active: "ForienQuestLog.QuestTypes.InProgress",
      completed: "ForienQuestLog.QuestTypes.Completed",
      failed: "ForienQuestLog.QuestTypes.Failed",
      hidden: "ForienQuestLog.QuestTypes.Hidden"
    }
  }

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

  static async move(questId, target) {
    let journal = game.journal.get(questId);
    let folder = QuestFolder.get(target);
    let permission = 2;
    if (target === 'hidden')
      permission = 0;

    journal.update({folder: folder._id, "permission.default": permission}).then(() => {
      game.questlog.render(true);
      Socket.refreshQuestLog();
      let dirname = game.i18n.localize(this.getQuestTypes()[target]);
      ui.notifications.info(game.i18n.format("ForienQuestLog.Notifications.QuestMoved", {target: dirname}), {});
    });
  }

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

  static async deleteConfirm(questId) {
    let entry = game.journal.get(questId);

    entry.delete().then(() => {
      if (game.questlog.rendered)
        game.questlog.render(true);
      Socket.refreshQuestLog();
    });
  }

  get id() {
    return this._id;
  }

  set id(value) {
    this._id = value;
  }

  get actor() {
    return this._actor;
  }

  set actor(value) {
    this._actor = value;
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

  toJSON() {
    return {
      actor: this._actor,
      title: this._title,
      description: this._description,
      gmnotes: this._gmnotes,
      tasks: this._tasks,
      rewards: this._rewards,
      image: this._image
    }
  }
}
