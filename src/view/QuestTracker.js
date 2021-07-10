import RepositionableApplication from './RepositionableApplication.js';
import QuestAPI                  from '../control/public/QuestAPI.js';
import QuestDB                   from '../control/QuestDB.js';
import ViewManager               from '../control/ViewManager.js';

import { constants, questTypes, settings } from '../model/constants.js';

/**
 * Provides the quest tracker which provides an overview of active quests and objectives which can be opened / closed
 * to show all objectives for a given quest. The folder / open state is stored in {@link sessionStorage} and is shared
 * between the {@link QuestLogFloating}.
 */
export default class QuestTracker extends RepositionableApplication
{
   /**
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html
    */
   constructor(options = {})
   {
      super(Object.assign({}, options, { positionSetting: settings.questTrackerPosition }));
   }

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions()
   {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: 'quest-tracker',
         template: 'modules/forien-quest-log/templates/quest-tracker.html',
         popOut: false
      });
   }

   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * @param {jQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.quest-tracker-header', this._handleQuestClick.bind(this));
      html.on('click', '.quest-tracker-link', this._handleQuestOpen);
   }

   /**
    * Gets the background boolean value from module settings {@link FQLSettings.questTrackerBackground} and parses quest
    * data in {@link QuestTracker.prepareQuests}.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#getData
    */
   async getData(options = {})
   {
      return foundry.utils.mergeObject(super.getData(options), {
         background: game.settings.get(constants.moduleName, settings.questTrackerBackground),
         quests: await this.prepareQuests()
      });
   }

   /**
    * Data for the quest folder open / close state is saved in {@link sessionStorage}.
    *
    * @param {Event} event - HTML5 event.
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
    * Handles the quest open click via {@link QuestAPI.open}.
    *
    * @param {Event} event - HTML5 event.
    */
   _handleQuestOpen(event)
   {
      const questId = event.currentTarget.dataset.questId;
      QuestAPI.open({ questId });
   }

   /**
    * Prepares the quest data from sorted active quests.
    *
    * @returns {object[]} Sorted active quests.
    */
   async prepareQuests()
   {
      return QuestDB.sortCollect({ status: questTypes.active }).map((entry) =>
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
            hasObjectives: q.hasObjectives,
            subquests,
            tasks
         };
      });
   }
}