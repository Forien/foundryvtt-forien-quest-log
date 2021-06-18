import Fetch      from '../control/Fetch.js';
import QuestAPI   from '../control/QuestAPI.js';
import Utils      from '../utils/Utils.js';

export default class Socket
{
   static acceptQuest(questId)
   {
      game.socket.emit('module.forien-quest-log', {
         type: 'acceptQuest',
         payload: {
            questId
         }
      });
   }

   static closeQuest(questId)
   {
      const publicAPI = Utils.getFQLPublicAPI();

      if (publicAPI.questPreview[questId] !== undefined)
      {
         publicAPI.questPreview[questId].close();
      }

      game.socket.emit('module.forien-quest-log', {
         type: 'closeQuest',
         payload: {
            questId
         }
      });
   }

   static listen()
   {
      game.socket.on('module.forien-quest-log', async (data) =>
      {
         const fqlPublicAPI = Utils.getFQLPublicAPI();

         if (data.type === 'questLogRefresh')
         {
            if (fqlPublicAPI.questLog.rendered)
            {
               fqlPublicAPI.questLog.render(true);
            }
            if (fqlPublicAPI.questLogFloating.rendered)
            {
               fqlPublicAPI.questLogFloating.render(true);
            }
            return;
         }

         if (data.type === 'questPreviewRefresh')
         {
            if (fqlPublicAPI.questPreview[data.payload.questId] !== undefined)
            {
               fqlPublicAPI.questPreview[data.payload.questId].render(true);
            }

            if (fqlPublicAPI.questLog.rendered)
            {
               fqlPublicAPI.questLog.render(true);
            }
            if (fqlPublicAPI.questLogFloating.rendered)
            {
               fqlPublicAPI.questLogFloating.render(true);
            }
            return;
         }

         if (data.type === 'showQuestPreview')
         {
            QuestAPI.open(data.payload.questId, false);

            return;
         }

         if (data.type === 'userCantOpenQuest')
         {
            if (game.user.isGM)
            {
               ui.notifications.warn(game.i18n.format('ForienQuestLog.Notifications.UserCantOpen',
                { user: data.payload.user }), {});
            }

            return;
         }

         // TODO: Can this be removed if we can subscribe to JournalEntry changes?
         if (data.type === 'acceptQuest')
         {
            if (game.user.isGM)
            {
               const quest = Fetch.quest(data.payload.questId);
               if (quest) { await quest.move('active'); }
            }
         }

         if (data.type === 'closeQuest')
         {
            if (fqlPublicAPI.questPreview[data.payload.questId] !== undefined)
            {
               await fqlPublicAPI.questPreview[data.payload.questId].close();
            }
         }
      });
   }

   // TODO: Can this be removed if we can subscribe to JournalEntry changes?
   static refreshQuestLog()
   {
      const fqlPublicAPI = Utils.getFQLPublicAPI();

      if (fqlPublicAPI.questLog.rendered)
      {
         fqlPublicAPI.questLog.render(true);
      }

      game.socket.emit('module.forien-quest-log', {
         type: 'questLogRefresh'
      });

      if (fqlPublicAPI.questLogFloating.rendered)
      {
         fqlPublicAPI.questLogFloating.render(true);
      }
   }

   // TODO: Can this be removed if we can subscribe to JournalEntry changes?
   static refreshQuestPreview(questId)
   {
      const fqlPublicAPI = Utils.getFQLPublicAPI();

      if (fqlPublicAPI.questPreview[questId] !== undefined)
      {
         fqlPublicAPI.questPreview[questId].render(true);
      }

      game.socket.emit('module.forien-quest-log', {
         type: 'questPreviewRefresh',
         payload: {
            questId
         }
      });
   }

   static showQuestPreview(questId)
   {
      game.socket.emit('module.forien-quest-log', {
         type: 'showQuestPreview',
         payload: {
            questId
         }
      });
   }

   static userCantOpenQuest()
   {
      game.socket.emit('module.forien-quest-log', {
         type: 'userCantOpenQuest',
         payload: {
            user: game.user.name
         }
      });
   }
}
