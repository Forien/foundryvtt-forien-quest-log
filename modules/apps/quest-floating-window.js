import Quest         from '../entities/quest.js';
import QuestPreview  from './quest-preview.js';

export default class QuestFloatingWindow extends Application
{
   constructor(options = {})
   {
      super(options);

      this._sortBy = null;
      this._sortDirection = 'asc';
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
         $(`.directory-item[data-quest-id='${questId}']`).toggleClass('collapsed');
         $(`.folder-toggle[data-quest-id='${questId}'] i`).toggleClass('fas');
         $(`.folder-toggle[data-quest-id='${questId}'] i`).toggleClass('far');
         localStorage.setItem(`forien.questlog.folderstate-${questId}`,
          $(`.directory-item[data-quest-id='${questId}']`).hasClass('collapsed'));
      });

      html.on('click', '.quest-open', (event) =>
      {
         const questId = $(event.target).closest('.quest-open').data('quest-id');
         const questPreview = new QuestPreview(questId);
         questPreview.render(true);
      });

      html.on('click', '.sortable', (event) =>
      {
         const el = $(event.target);
         this.toggleSort(el.data('sort'));
      });

      // Open and close folders on rerender. Data is store in localstorage so
      // display is consistent after each render.
      for (const quest of Quest.getQuests(this._sortBy, this._sortDirection, false, true).active)
      {
         $(`.directory-item[data-quest-id='${quest.id}']`).toggleClass('collapsed',
          localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) === 'true');

         $(`.folder-toggle[data-quest-id='${quest.id}'] i`).toggleClass('fas',
          localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) === 'true');

         $(`.folder-toggle[data-quest-id='${quest.id}'] i`).toggleClass('far',
          localStorage.getItem(`forien.questlog.folderstate-${quest.id}`) !== 'true');
      }
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @param options
    * @returns {Promise<Object>}
    */
   getData(options = {})
   {
      return mergeObject(super.getData(), {
         options,
         isGM: game.user.isGM,
         showTasks: game.settings.get('forien-quest-log', 'showTasks'),
         style: game.settings.get('forien-quest-log', 'navStyle'),
         questTypes: Quest.getQuestTypes(),
         quests: Quest.getQuests(this._sortBy, this._sortDirection, false, true)
      });
   }

   /**
    * Set sort target and toggle direction. Refresh window
    *
    * @param target
    */
   toggleSort(target, direction = undefined)
   {
      if (this._sortBy === target)
      {
         this._sortDirection = (this._sortDirection === 'desc') ? 'asc' : 'desc';
      }
      else
      {
         this._sortBy = target;
         this._sortDirection = 'asc';
      }
      if (direction !== undefined && (direction === 'asc' || direction === 'desc'))
      {
         this._sortDirection = direction;
      }

      this.render(true);
   }
}
