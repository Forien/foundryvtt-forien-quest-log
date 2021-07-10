import QuestAPI      from '../control/public/QuestAPI.js';
import QuestDB       from '../control/QuestDB.js';
import ViewManager   from '../control/ViewManager.js';

import { constants, questTypes, questTypesI18n, settings }  from '../model/constants.js';

/**
 * Provides the floating quest log which provides a set of folders for all active quests which can be opened / closed
 * to show all objectives for a given quest. The folder / open state is stored in {@link sessionStorage} and is shared
 * between the {@link QuestTracker}.
 */
export default class QuestLogFloating extends Application
{
   /**
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html
    */
   constructor(options = {})
   {
      super(options);
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
         id: 'forien-quest-log-floating-window',
         classes: ['sidebar-popout'],
         template: 'modules/forien-quest-log/templates/quest-floating-window.html',
         width: 300,
         height: 480,
         minimizable: false,
         resizable: false,
         title: game.i18n.localize('ForienQuestLog.QuestLog.Title'),
      });
   }

   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * Data for the quest folder open / close state is saved in {@link sessionStorage}.
    *
    * @param {jQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.folder-toggle', this._handleFolderToggle);
      html.on('click', '.questlog-floating .quest-open', this._handleQuestOpen);

      // Open and close folders on rerender. Data is store in sessionStorage so display is consistent after each render.
      for (const quest of QuestDB.sortCollect({ status: questTypes.active }))
      {
         // If there are no objectives then always render in a collapsed state regardless of the
         // value in sessionStorage..
         const collapsed = !quest.enrich.hasObjectives ? 'true' :
          sessionStorage.getItem(`${constants.folderState}${quest.id}`);

         const dirItem = $(`.directory-item[data-quest-id='${quest.id}']`);
         const dirItemIcon = $(`.folder-toggle[data-quest-id='${quest.id}'] i`);

         dirItem.toggleClass('collapsed', collapsed !== 'false');
         dirItemIcon.toggleClass('fas', collapsed !== 'false');
         dirItemIcon.toggleClass('far', collapsed === 'false');
      }
   }

   /**
    * Retrieves the sorted active quests from QuestDB to be used in the Handlebars template. Also sets a few variables
    * for if the user is a GM and module settings {@link settings.showTasks} / {@link settings.navStyle}.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#getData
    */
   async getData(options = {})
   {
      return foundry.utils.mergeObject(super.getData(options), {
         isGM: game.user.isGM,
         showTasks: game.settings.get(constants.moduleName, settings.showTasks),
         style: game.settings.get(constants.moduleName, settings.navStyle),
         questTypesI18n,
         quests: QuestDB.sortCollect({ status: questTypes.active })
      });
   }

   /**
    * Toggles the folder open / close state and saves value in {@link sessionStorage}.
    *
    * @param {Event} event - HTML5 event.
    */
   _handleFolderToggle(event)
   {
      const questId = $(event.target).closest('.folder-toggle').data('quest-id');
      const dirItem = $(`.directory-item[data-quest-id='${questId}']`);
      const dirItemIcon = $(`.folder-toggle[data-quest-id='${questId}'] i`);

      dirItem.toggleClass('collapsed');
      dirItemIcon.toggleClass('fas');
      dirItemIcon.toggleClass('far');

      const collapsed = dirItem.hasClass('collapsed');

      sessionStorage.setItem(`${constants.folderState}${questId}`, collapsed);

      if (ViewManager.questTracker.rendered) { ViewManager.questTracker.render(); }
   }

   /**
    * Handles the quest open click via {@link QuestAPI.open}.
    *
    * @param {Event} event - HTML5 event.
    */
   _handleQuestOpen(event)
   {
      const questId = $(event.target).closest('.quest-open').data('quest-id');
      QuestAPI.open({ questId });
   }
}
