import RepositionableApplication from './RepositionableApplication.js';
import QuestAPI                  from '../control/QuestAPI.js';
import QuestDB                   from '../control/QuestDB.js';
import Utils                     from '../control/Utils.js';

import { constants, questTypes, settings }   from '../model/constants.js';

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
      return QuestDB.sorted({ status: questTypes.active }).map((entry) =>
      {
         const q = entry.enrich;
         const collapsed = sessionStorage.getItem(`${constants.folderState}${q.id}`) === 'false';

         const tasks = collapsed ? q.data_tasks : [];
         const subquests = collapsed ? q.data_subquest : [];

         return {
            id: q.id,
            source: q.giver,
            name: `${q.name} ${q.taskCountLabel}`,
            isGM: game.user.isGM,
            isHidden: q.isHidden,
            isInactive: q.isInactive,
            isPersonal: q.isPersonal,
            personalActors: q.personalActors,
            subquests,
            tasks
         };
      });
   }
}