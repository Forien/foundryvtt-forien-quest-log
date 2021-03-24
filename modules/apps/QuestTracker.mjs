import constants from "../constants.mjs";
import RepositionableApplication from "./RepositionableApplication.mjs";

export default class QuestTracker extends RepositionableApplication {
  static app;
  positionSetting = 'quest-tracker-position';

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "quest-tracker",
      template: 'modules/forien-quest-log/templates/quest-tracker.html',
      popOut: false
    });
  }

  /** @override */
  getData(options = {}) {
    options = super.getData(options);
    options.quests = this.prepareQuests();
    if (game.settings.get(constants.moduleName, 'questTrackerBackground'))
      options.background = 'background';

    return options;
  }

  prepareQuests() {
    const quests = Quest.getQuests();

    return quests.active.map(q => ({
      id: q.id,
      source: q.giver,
      title: q.title,
      image: q.image,
      description: this.truncate(q.description, 120),
      tasks: q.tasks.filter(t => t.hidden === false).map(t => {
        t.name = TextEditor.enrichHTML(t.name);
        t.state = t.completed ? 'completed' : (t.failed ? 'failed' : '');
        return t;
      })
    }))
  }

  static init() {
    if (ui.questTracker instanceof this){
       return;
    }
    const instance = new this();
    ui.questTracker = instance;
    instance.render(true);
  }

  truncate(str, n) {
    str = $(`<p>${str}</p>`).text();

    return (str.length > n) ? str.substr(0, n - 1) + '&hellip;' : str;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html.on('click', '.quest', this._handleClick);
    html.on('contextmenu', '.quest', this._handleClick);
  }

  _handleClick(event) {
    if ($(event.target).hasClass('entity-link')) return;
    event.preventDefault();
    event.stopPropagation();

    if (event.originalEvent.detail < 2) {
      switch (event.originalEvent.button) {
        case 2:
          QuestTracker._onRightClick(event);
          break;
        case 0:
        default:
          QuestTracker._onClick(event);
      }
    } else {
      QuestTracker._onDoubleClick(event);
    }
  }


  static _onClick(event) {
    const id = event.currentTarget.dataset.id;
    Quests.open(id);
  }

  static _onRightClick(event) {
  }

  static _onDoubleClick(event) {
  }
}