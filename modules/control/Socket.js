import QuestAPI   from '../api/QuestAPI.js';
import Quest      from '../model/Quest.js';

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
      if (game.questPreview[questId] !== undefined)
      {
         game.questPreview[questId].close();
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
      game.socket.on('module.forien-quest-log', (data) =>
      {
         if (data.type === 'questLogRefresh')
         {
            if (QuestLog.rendered)
            {
               QuestLog.render(true);
            }
            if (QuestFloatingWindow.rendered)
            {
               QuestFloatingWindow.render(true);
            }
            return;
         }

         if (data.type === 'questPreviewRefresh')
         {
            if (game.questPreview[data.payload.questId] !== undefined)
            {
               game.questPreview[data.payload.questId].render(true);
            }

            if (QuestLog.rendered)
            {
               QuestLog.render(true);
            }
            if (QuestFloatingWindow.rendered)
            {
               QuestFloatingWindow.render(true);
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

         if (data.type === 'acceptQuest')
         {
            if (game.user.isGM)
            {
               Quest.move(data.payload.questId, 'active');
            }
         }

         if (data.type === 'closeQuest')
         {
            if (game.questPreview[data.payload.questId] !== undefined)
            {
               game.questPreview[data.payload.questId].close();
            }
         }
      });
   }

   static refreshQuestLog()
   {
      if (QuestLog.rendered)
      {
         QuestLog.render(true);
      }

      game.socket.emit('module.forien-quest-log', {
         type: 'questLogRefresh'
      });

      if (QuestFloatingWindow.rendered)
      {
         QuestFloatingWindow.render(true);
      }
   }

   static refreshQuestPreview(questId)
   {
      if (game.questPreview[questId] !== undefined)
      {
         game.questPreview[questId].render(true);
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
