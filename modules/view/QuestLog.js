import FQLDialog        from './FQLDialog.js';
import ViewData         from './ViewData.js';
import QuestPreview     from './QuestPreview.js';
import QuestForm        from './QuestForm.js';
import Fetch            from '../control/Fetch.js';
import Socket           from '../control/Socket.js';
import { questTypes }   from '../model/constants.js';

export default class QuestLog extends Application
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
    * @returns {object}
    */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
         id: 'forien-quest-log',
         classes: ['forien-quest-log'],
         template: 'modules/forien-quest-log/templates/quest-log.html',
         width: 700,
         height: 480,
         minimizable: true,
         resizable: true,
         title: game.i18n.localize('ForienQuestLog.QuestLog.Title'),
         tabs: [{ navSelector: '.log-tabs', contentSelector: '.log-body', initial: 'progress' }]
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

      html.on('click', '.new-quest-btn', () =>
      {
         new QuestForm().render(true);
      });

      html.on('click', '.actions i', async (event) =>
      {
         const canPlayerAccept = game.settings.get('forien-quest-log', 'allowPlayersAccept');
         const target = $(event.target).data('target');
         const questId = $(event.target).data('quest-id');

         if (target === 'active' && canPlayerAccept)
         {
            Socket.acceptQuest(questId);
         }

         if (!game.user.isGM) { return; }

         const classList = $(event.target).attr('class');
         if (classList.includes('move'))
         {
            const quest = Fetch.quest(questId);
            if (quest) { await quest.move(target); }
         }
         else if (classList.includes('delete'))
         {
            const quest = Fetch.quest(questId);

            if (quest && await FQLDialog.confirmDelete(quest))
            {
               await quest.delete();
            }
         }
      });

      html.on('click', '.title', (event) =>
      {
         const questId = $(event.target).closest('.title').data('quest-id');
         const quest = Fetch.quest(questId);
         const questPreview = new QuestPreview(quest);
         questPreview.render(true, { focus: true });
      });

      html.on('click', '.sortable', (event) =>
      {
         const el = $(event.target);
         this.toggleSort(el.data('sort'));
      });

      html.on('dragstart', '.drag-quest', (event) =>
      {
         const dataTransfer = {
            type: 'Quest',
            id: $(event.target).data('quest-id')
         };
         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));

      });

      // TODO: EVALUATE SEEMS LIKE NOTHING IS HAPPENING IN THIS DROP CALLBACK
      html.on('drop', '.tab', async (event) =>
      {
         const dt = event.target.closest('.drag-quest') || null;
         if (!dt) { return; }

         const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
         const id = data.id;

         const journal = game.journal.get(id);
         if (!journal) { return; }

         const quest = Fetch.quest(id);
         if (!quest) { return; }

         const sortData = { sortKey: 'sort', sortBefore: true };
         const targetId = dt.dataset.questId;
         sortData.target = game.journal.get(targetId);

         const ids = Fetch.sorted()[quest.status].map((q) => q.id);

         sortData.siblings = game.journal.filter((e) => (e.id !== data.id && ids.includes(e.id)));

         await journal.sortRelative(sortData);

         this.render();
      });
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
      const available = game.settings.get('forien-quest-log', 'availableQuests');

      let quests;

      try
      {
         quests = await ViewData.createSorted(Fetch.sorted({
            target: this.sortBy,
            direction: this.sortDirection,
            available
         }));
console.log(`!!!!!!!!! QuestLog - getData - quests: ${JSON.stringify(quests)}`);
      }
      catch (err)
      {
console.log(`!!!!! QuestLog - getData - quests getQuests failed`);
console.error(err);
      }

      return mergeObject(super.getData(), {
         options,
         isGM: game.user.isGM,
         availableTab: available,
         canAccept: game.settings.get('forien-quest-log', 'allowPlayersAccept'),
         canCreate: game.settings.get('forien-quest-log', 'allowPlayersCreate'),
         showTasks: game.settings.get('forien-quest-log', 'showTasks'),
         style: game.settings.get('forien-quest-log', 'navStyle'),
         // titleAlign: game.settings.get('forien-quest-log', 'titleAlign'),
         questTypes,
         quests
      });
   }

   /**
    * Set sort target and toggle direction. Refresh window
    *
    * @param target
    *
    * @param direction
    */
   toggleSort(target, direction = undefined)
   {
      if (this.sortBy === target)
      {
         this.sortDirection = (this.sortDirection === 'desc') ? 'asc' : 'desc';
      }
      else
      {
         this.sortBy = target;
         this.sortDirection = 'asc';
      }
      if (direction !== undefined && (direction === 'asc' || direction === 'desc'))
      {
         this.sortDirection = direction;
      }

      this.render(true);
   }
}
