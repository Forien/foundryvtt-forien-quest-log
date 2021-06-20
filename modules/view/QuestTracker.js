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
      const questId = event.currentTarget.dataset.id;
      QuestAPI.open({ questId });
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

   /**
    * Prepares the quest data. Take note that Fetch.quest() for subquests can return null if the journal entry is
    * not available, so you must handle that case.
    *
    * @returns {{name: *, id: *, source: Document.giver|null|*, tasks: *, subquests: *}[]} Template data
    */
   prepareQuests()
   {
      const quests = Fetch.sorted();

      return quests.active.map((q) =>
      {
         // Map subquest status to task state.
         const subquests = q.subquests.map((s) =>
         {
            const subquest = Fetch.quest(s);

            if (!subquest) { return null; }

            let state = 'square';
            switch (subquest.status)
            {
               case 'completed':
                  state = 'check-square';
                  break;
               case 'failed':
                  state = 'minus-square';
                  break;
            }
            return { name: subquest.name, hidden: subquest.status === 'hidden', state };
         });

         return {
            id: q.id,
            source: q.giver,
            name: q.name,
            subquests: game.user.isGM ? subquests : subquests.filter((s) => s !== null && !s.hidden),
            tasks: game.user.isGM ? q.tasks.map((t) => t.toJSON()) :
             q.tasks.filter((t) => !t.hidden).map((t) => t.toJSON())
         };
      });
   }
}