import QuestAPI      from '../control/public/QuestAPI.js';
import QuestDB       from '../control/QuestDB.js';
import Socket        from '../control/Socket.js';
import ViewManager   from '../control/ViewManager.js';

import { constants, jquery, questStatus, settings }  from '../model/constants.js';

/**
 * Provides the floating quest log which provides a set of folders for all active quests which can be opened / closed
 * to show all objectives for a given quest. The folder / open state is stored in {@link sessionStorage} and is shared
 * between the {@link QuestTracker}.
 *
 * In the {@link QuestLogFloating.getData} method gets all sorted {@link questStatus.active} via
 * {@link QuestDB.sortCollect} which is used in the {@link Handlebars} template. Since there are only a couple of
 * {@link JQuery} control callbacks they are implemented as methods in this class.
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
         resizable: true,
         title: game.i18n.localize('ForienQuestLog.QuestLog.Title'),
      });
   }

   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * Data for the quest folder open / close state is saved in {@link sessionStorage}.
    *
    * @param {JQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on(jquery.click, '.folder-toggle', void 0, this._handleFolderToggle);
      html.on(jquery.click, '.questlog-floating .quest-open', void 0, this._handleQuestOpen);
      html.on(jquery.click, '.questlog-floating-task', void 0, this._handleQuestTask);

      // Open and close folders on rerender. Data is store in sessionStorage so display is consistent after each render.
      for (const quest of QuestDB.sortCollect({ status: questStatus.active }))
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
    * for if the user is a GM and module settings {@link FQLSettings.showTasks} / {@link FQLSettings.navStyle}.
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
         quests: QuestDB.sortCollect({ status: questStatus.active })
      });
   }

   /**
    * Toggles the folder open / close state and saves value in {@link sessionStorage}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
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

      sessionStorage.setItem(`${constants.folderState}${questId}`, collapsed.toString());

      if (ViewManager.questTracker.rendered) { ViewManager.questTracker.render(); }
   }

   /**
    * Handles the quest open click via {@link QuestAPI.open}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    */
   _handleQuestOpen(event)
   {
      const questId = $(event.target).closest('.quest-open').data('quest-id');
      QuestAPI.open({ questId });
   }

   /**
    * Handles toggling {@link Quest} tasks when clicked on by a user that is the GM or owner of quest.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    */
   async _handleQuestTask(event)
   {
      // Don't handle any clicks of internal anchor elements such as entity content links.
      if ($(event.target).is('.questlog-floating-task a')) { return; }

      const questId = event.currentTarget.dataset.questId;
      const uuidv4 = event.currentTarget.dataset.uuidv4;

      const quest = QuestDB.getQuest(questId);

      if (quest)
      {
         const task = quest.getTask(uuidv4);
         if (task)
         {
            task.toggle();
            await quest.save();

            Socket.refreshQuestPreview({
               questId,
               focus: false
            });
         }
      }
   }
}
