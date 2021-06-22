import Fetch      from './Fetch.js';
import QuestAPI   from './QuestAPI.js';
import Utils      from './Utils.js';
import FQLDialog  from '../view/FQLDialog.js';

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

   static deleteQuest(deleteData)
   {
      if (typeof deleteData === 'object')
      {
         this.closeQuest(deleteData.deleteID);
         this.refreshQuestPreview({ questId: deleteData.savedIDs });
      }
   }

   static listen()
   {
      game.socket.on('module.forien-quest-log', async (data) =>
      {
         const fqlPublicAPI = Utils.getFQLPublicAPI();

         if (data.type === 'questLogRefresh')
         {
            Utils.getFQLPublicAPI().renderAll({ force: true });
            return;
         }

         if (data.type === 'questPreviewRefresh')
         {
            const questId = data.payload.questId;
            const options = typeof data.payload.options === 'object' ? data.payload.options : {};

            if (Array.isArray(questId))
            {
               for (const id of questId)
               {
                  const questPreview = fqlPublicAPI.questPreview[id];
                  if (questPreview !== undefined)
                  {
                     questPreview.socketRefresh(options);
                  }
               }
            }
            else
            {
               const questPreview = fqlPublicAPI.questPreview[questId];
               if (questPreview !== undefined)
               {
                  questPreview.socketRefresh(options);
               }
            }
            return;
         }

         if (data.type === 'showQuestPreview')
         {
            QuestAPI.open({ questId: data.payload.questId, notify: false });

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
               const quest = Fetch.quest(data.payload.questId);
               if (quest) { await quest.move('active'); }
               this.refreshQuestLog();
            }
         }

         if (data.type === 'closeQuest')
         {
            FQLDialog.closeDialogs(data.payload.questId);

            if (fqlPublicAPI.questPreview[data.payload.questId] !== undefined)
            {
               fqlPublicAPI.questPreview[data.payload.questId].close({ noSave: true });
            }
         }
      });
   }

   static refreshQuestLog()
   {
      Utils.getFQLPublicAPI().renderAll({ force: true });

      game.socket.emit('module.forien-quest-log', {
         type: 'questLogRefresh'
      });
   }

   /**
    * Sends a message indicating which quest preview windows need to be updated.
    *
    * @param {object}            options - Optional parameters.
    *
    * @param {string|string[]}   options.questId - A single quest ID or an array of IDs to update.
    *
    * @param {boolean}           [options.updateLog=true] - Updates the quest log and all other GUI apps if true.
    *
    * @param {object}            [options.options] - Any options to pass onto QuestPreview render method invocation.
    */
   static refreshQuestPreview({ questId, updateLog = true, ...options })
   {
      const fqlPublicAPI = Utils.getFQLPublicAPI();

      if (Array.isArray(questId))
      {
         for (const id of questId)
         {
            if (fqlPublicAPI.questPreview[id] !== undefined)
            {
               fqlPublicAPI.questPreview[id].render(true, options);
            }
         }
      }
      else
      {
         if (fqlPublicAPI.questPreview[questId] !== undefined)
         {
            fqlPublicAPI.questPreview[questId].render(true, options);
         }
      }


      game.socket.emit('module.forien-quest-log', {
         type: 'questPreviewRefresh',
         payload: {
            questId,
            options
         }
      });

      // Also update the quest log and other GUIs
      if (updateLog) { this.refreshQuestLog(); }
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
