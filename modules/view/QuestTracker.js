import RepositionableApplication from './RepositionableApplication.js';
import QuestAPI                  from '../control/QuestAPI.js';
import QuestDB                   from '../control/QuestDB.js';
import ViewManager               from '../control/ViewManager.js';

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

      html.on('click', '.quest-tracker-header', this._handleQuestClick.bind(this));
      html.on('click', '.quest-tracker-link', this._handleQuestOpen);
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
    * @param {Event} event - HTML5 / jQuery event.
    */
   _handleQuestClick(event)
   {
      const questId = event.currentTarget.dataset.questId;

      const folderState = sessionStorage.getItem(`${constants.folderState}${questId}`);
      const collapsed = folderState !== 'false';
      sessionStorage.setItem(`${constants.folderState}${questId}`, (!collapsed).toString());

      this.render();

      if (ViewManager.questLogFloating.rendered) { ViewManager.questLogFloating.render(); }
   }

   /**
    * @param {Event} event - HTML5 / jQuery event.
    */
   _handleQuestOpen(event)
   {
      const questId = event.currentTarget.dataset.questId;
      QuestAPI.open({ questId });
   }

   /**
    * Prepares the quest data.
    *
    * @returns {Promise<{isGM: *, isInactive: boolean|*, personalActors: *, name: string, id: *, source: Document.giver|null|*, isPersonal: boolean|*, tasks: *|*[], isHidden: boolean|*, subquests: []|*[]}[]>}
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