import RepositionableApplication from './RepositionableApplication.js';
import Enrich                    from '../control/Enrich.js';
import Fetch                     from '../control/Fetch.js';
import QuestAPI                  from '../control/QuestAPI.js';
import Utils                     from '../control/Utils.js';
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

   /** @override */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.quest-tracker-header', (event) =>
      {
         const questId = event.currentTarget.dataset.questId;

         const folderState = sessionStorage.getItem(`${constants.folderState}${questId}`);
         const collapsed = folderState !== 'false';
         sessionStorage.setItem(`${constants.folderState}${questId}`, !collapsed);

         this.render();

         const fqlPublicAPI = Utils.getFQLPublicAPI();
         if (fqlPublicAPI.questLogFloating.rendered) { fqlPublicAPI.questLogFloating.render(); }
      });

      html.on('click', '.quest-tracker-link', (event) =>
      {
         const questId = event.currentTarget.dataset.questId;
         QuestAPI.open({ questId });
      });
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
      const quests = await Enrich.sorted(Fetch.sorted({ type: 'active' }));

      return quests.active.map((q) =>
      {
         // Map subquest status to task state.
         const mappedSubquests = q.data_subquest.map((subquest) =>
         {
            return {
               id: subquest.id,
               name: subquest.name,
               // isGM: game.user.isGM,
               isHidden: subquest.isHidden,
               isPersonal: subquest.isPersonal,
               personalActors: subquest.personalActors,
               isInactive: subquest.status === 'hidden',
               state: subquest.state
            };
         });

         const collapsed = sessionStorage.getItem(`${constants.folderState}${q.id}`);

         let tasks = [];
         let subquests = [];

         if (collapsed === 'false')
         {
            tasks = game.user.isGM ? q.data_tasks : q.data_tasks.filter((t) => !t.hidden);
            subquests = game.user.isGM ? mappedSubquests : mappedSubquests.filter((s) => !s.hidden);
         }

         return {
            id: q.id,
            source: q.giver,
            name: `${q.name} ${q.taskCountLabel}`,
            isGM: game.user.isGM,
            isHidden: q.isHidden,
            isPersonal: q.isPersonal,
            personalActors: q.personalActors,
            subquests,
            tasks
         };
      });
   }
}