import FQLDialog        from './FQLDialog.js';
import QuestForm        from './QuestForm.js';
import Enrich           from '../control/Enrich.js';
import Fetch            from '../control/Fetch.js';
import QuestAPI         from '../control/QuestAPI.js';
import Socket           from '../control/Socket.js';
import Utils            from '../control/Utils.js';
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
         const name = $(event.target).data('quest-name');

         if (target === 'active' && canPlayerAccept)
         {
            Socket.acceptQuest(questId);
         }

         if (!game.user.isGM)
         {
            return;
         }

         const classList = $(event.target).attr('class');
         if (classList.includes('move'))
         {
            const quest = Fetch.quest(questId);
            if (quest)
            {
               await quest.move(target);

               Socket.refreshQuestPreview({ questId: quest.parent ? [quest.parent, quest.id] : quest.id });

               const dirname = game.i18n.localize(questTypes[target]);
               ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
                { target: dirname }), {});
            }
         }
         else if (classList.includes('delete'))
         {
            const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId });
            if (result)
            {
               const quest = Fetch.quest(result);
               if (quest) { Socket.deleteQuest(await quest.delete()); }
            }
         }
      });

      html.on('click', '.title', (event) =>
      {
         const questId = $(event.target).closest('.title').data('quest-id');
         QuestAPI.open({ questId });
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

      const quests = await Enrich.sorted(Fetch.sorted({ available }));

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
