import FQLDialog        from './FQLDialog.js';
import QuestPreview     from './QuestPreview.js';
import QuestForm        from './QuestForm.js';
import Enrich           from '../control/Enrich.js';
import Fetch            from '../control/Fetch.js';
import Socket           from '../control/Socket.js';
import { questTypes }   from '../model/constants.js';

export default class QuestLog extends Application
{
   constructor(options = {})
   {
      super(options);
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
            if (quest)
            {
               await quest.move(target);

               Socket.refreshQuestPreview(quest.id);

               if (quest.parent)
               {
                  Socket.refreshQuestPreview(quest.parent, false);
               }

               const dirname = game.i18n.localize(questTypes[target]);
               ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
                { target: dirname }), {});
            }
         }
         else if (classList.includes('delete'))
         {
            const quest = Fetch.quest(questId);

            if (quest && await FQLDialog.confirmDelete(quest))
            {
               Socket.deleteQuest(await quest.delete());
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

      html.on('dragstart', '.drag-quest', (event) =>
      {
         const dataTransfer = {
            type: 'Quest',
            id: $(event.target).data('quest-id')
         };
         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));

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
         quests = await Enrich.sorted(Fetch.sorted({ available }));
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
         questTypes,
         quests
      });
   }
}
