import RepositionableApplication from './RepositionableApplication.js';
import Fetch                     from '../control/Fetch.js';
import QuestAPI                  from '../control/QuestAPI.js';
import { constants }             from '../model/constants.js';

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
            case 0:
            default:
               QuestTracker._onClick(event);
         }
      }
   }

   static _onClick(event)
   {
      const id = event.currentTarget.dataset.id;
      QuestAPI.open(id);
   }

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

   prepareQuests()
   {
      const quests = Fetch.sorted();

      return quests.active.map((q) => ({
         id: q.id,
         source: q.giver,
         name: q.name,
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