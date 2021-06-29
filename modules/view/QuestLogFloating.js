import Enrich                                from '../control/Enrich.js';
import Fetch                                 from '../control/Fetch.js';
import QuestAPI                              from '../control/QuestAPI.js';
import Utils                                 from '../control/Utils.js';
import { constants, questTypes, settings }   from '../model/constants.js';

export default class QuestLogFloating extends Application
{
   constructor(options = {})
   {
      super(options);
   }

   /**
    * Default Application options
    *
    * @returns {Object}
    */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
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
    * Defines all event listeners like click, drag, drop etc.
    *
    * @param html
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.on('click', '.folder-toggle', (event) =>
      {
         const questId = $(event.target).closest('.folder-toggle').data('quest-id');
         const dirItem = $(`.directory-item[data-quest-id='${questId}']`);
         const dirItemIcon = $(`.folder-toggle[data-quest-id='${questId}'] i`);

         dirItem.toggleClass('collapsed');
         dirItemIcon.toggleClass('fas');
         dirItemIcon.toggleClass('far');

         const collapsed = dirItem.hasClass('collapsed');

         sessionStorage.setItem(`${constants.folderState}${questId}`, collapsed);

         const fqlPublicAPI = Utils.getFQLPublicAPI();
         if (fqlPublicAPI.questTracker.rendered) { fqlPublicAPI.questTracker.render(); }
      });

      html.on('click', '.questlog-floating .quest-open', (event) =>
      {
         const questId = $(event.target).closest('.quest-open').data('quest-id');
         QuestAPI.open({ questId });
      });

      // Open and close folders on rerender. Data is store in localstorage so
      // display is consistent after each render.
      for (const quest of Fetch.sorted({ type: 'active' }).active)
      {
         const collapsed = sessionStorage.getItem(`${constants.folderState}${quest.id}`);

         const dirItem = $(`.directory-item[data-quest-id='${quest.id}']`);
         const dirItemIcon = $(`.folder-toggle[data-quest-id='${quest.id}'] i`);

         dirItem.toggleClass('collapsed', collapsed !== 'false');
         dirItemIcon.toggleClass('fas', collapsed !== 'false');
         dirItemIcon.toggleClass('far', collapsed === 'false');
      }
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @param options
    *
    * @returns {Promise<Object>}
    */
   async getData(options = {})
   {
      return mergeObject(super.getData(), {
         options,
         isGM: game.user.isGM,
         showTasks: game.settings.get(constants.moduleName, settings.showTasks),
         style: game.settings.get(constants.moduleName, settings.navStyle),
         questTypes,
         quests: await Enrich.sorted(Fetch.sorted({ type: 'active' }))
      });
   }
}
