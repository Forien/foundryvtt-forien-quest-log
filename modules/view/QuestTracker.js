import RepositionableApplication from './RepositionableApplication.js';
import QuestAPI                  from '../control/QuestAPI.js';
import Quest                     from '../model/Quest.js';
import constants                 from '../constants.js';

export default class QuestTracker extends RepositionableApplication
{
   constructor(options = {})
   {
      super(Object.assign({}, options, { positionSetting: 'quest-tracker-position' }));
   }

   /** @override */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
         id: 'quest-tracker',
         template: 'modules/forien-quest-log/templates/quest-tracker.html',
         popOut: false
      });
   }

   _handleClick(event)
   {
      if ($(event.target).hasClass('entity-link'))
      {
         return;
      }
      event.preventDefault();
      event.stopPropagation();

      if (event.originalEvent.detail < 2)
      {
         switch (event.originalEvent.button)
         {
            case 2:
               QuestTracker._onRightClick(event);
               break;
            case 0:
            default:
               QuestTracker._onClick(event);
         }
      }
      else
      {
         QuestTracker._onDoubleClick(event);
      }
   }

   static _onClick(event)
   {
      const id = event.currentTarget.dataset.id;
      QuestAPI.open(id);
   }

   static _onDoubleClick(event) {}  // eslint-disable-line no-unused-vars

   static _onRightClick(event) {}   // eslint-disable-line no-unused-vars

   /** @override */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.quest', this._handleClick);
      html.on('contextmenu', '.quest', this._handleClick);
   }

   /** @override */
   getData(options = {})
   {
      options = super.getData(options);
      options.quests = this.prepareQuests();
      if (game.settings.get(constants.moduleName, 'questTrackerBackground'))
      {
         options.background = 'background';
      }

      return options;
   }

   static init()
   {
      if (ui.questTracker instanceof this)
      {
         return;
      }
      const instance = new this();
      ui.questTracker = instance;
      instance.render(true);
   }

   prepareQuests()
   {
      const quests = Quest.getQuests();

      return quests.active.map((q) => ({
         id: q.id,
         source: q.giver,
         title: q.title,
         description: this.truncate(q.description, 120),
         tasks: q.tasks.filter((t) => t.hidden === false).map((t) => t.toJSON())
      }));
   }

   truncate(str, n)
   {
      str = $(`<p>${str}</p>`).text();

      return (str.length > n) ? `${str.substr(0, n - 1)}&hellip;` : str;
   }
}