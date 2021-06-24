import RepositionableApplication from './RepositionableApplication.js';
import Enrich                    from '../control/Enrich.js';
import Fetch                     from '../control/Fetch.js';
import QuestAPI                  from '../control/QuestAPI.js';
import { constants, settings }   from '../model/constants.js';

export default class QuestTracker extends RepositionableApplication
{
   constructor(options = {})
   {
      super(Object.assign({}, options, { positionSetting: settings.questTrackerPosition }));
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
   async getData(options = {})
   {
      options = super.getData(options);
      options.quests = await this.prepareQuests();
      if (game.settings.get(constants.moduleName, settings.questTrackerBackground))
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
   async prepareQuests()
   {
      const quests = await Enrich.sorted(Fetch.sorted());

      if (game.settings.get(constants.moduleName, settings.questTrackerTasks))
      {
         return quests.active.map((q) =>
         {
            // Map subquest status to task state.
            const subquests = q.data_subquest.map((subquest) =>
            {
               return { name: subquest.name, hidden: subquest.status === 'hidden', state: subquest.state };
            });

            return {
               id: q.id,
               source: q.giver,
               name: `${q.name} ${q.taskCountLabel}`,
               isGM: game.user.isGM,
               isHidden: q.isHidden,
               isPersonal: q.isPersonal,
               personalActors: q.personalActors,
               subquests: game.user.isGM ? subquests : subquests.filter((s) => !s.hidden),
               tasks: game.user.isGM ? q.data_tasks : q.data_tasks.filter((t) => !t.hidden)
            };
         });
      }
      else
      {
         return quests.active.map((q) =>
         {
            return {
               id: q.id,
               source: q.giver,
               name: `${q.name} ${q.taskCountLabel}`,
               isGM: game.user.isGM,
               isHidden: q.isHidden,
               isPersonal: q.isPersonal,
               personalActors: q.personalActors,
               subquests: [],
               tasks: []
            };
         });
      }
   }
}