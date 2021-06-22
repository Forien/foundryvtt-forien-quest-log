import Fetch                     from './Fetch.js';
import QuestAPI                  from './QuestAPI.js';
import Utils                     from './Utils.js';
import FQLDialog                 from '../view/FQLDialog.js';
import { constants, settings }   from '../model/constants.js';

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
            const options = typeof data.payload.options === 'object' ? data.payload.options : {};
            Utils.getFQLPublicAPI().renderAll({ force: true, ...options });
            return;
         }

         if (data.type === 'questRewardDrop')
         {
            if (game.user.isGM)
            {
               const dropData = data.payload.data;
               const notify = game.settings.get(constants.moduleName, settings.notifyRewardDrop);
               if (notify)
               {
                  ui.notifications.info(game.i18n.format('ForienQuestLog.QuestPreview.RewardDrop', {
                     userName: dropData._fqlUserName,
                     itemName: dropData._fqlItemName,
                     actorName: data.payload.actor.name
                  }));
               }

               // The quest reward has already been removed by a GM user.
               if (data.payload.handled) { return; }

               const quest = QuestAPI.get(dropData._fqlQuestId);
               if (quest)
               {
                  quest.removeReward(dropData._fqlUuidv4);
                  await quest.save();
                  this.refreshQuestPreview({ questId: dropData._fqlQuestId });
               }
            }
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

   static async questRewardDrop(data = {})
   {
      let handled = false;

      if (game.user.isGM)
      {
         const dropData = data.data;
         const quest = QuestAPI.get(dropData._fqlQuestId);
         if (quest)
         {
            quest.removeReward(dropData._fqlUuidv4);
            await quest.save();
            this.refreshQuestPreview({ questId: dropData._fqlQuestId });
         }
         handled = true;
      }

      game.socket.emit('module.forien-quest-log', {
         type: 'questRewardDrop',
         payload: {
            ...data,
            handled
         }
      });
   }

   static refreshQuestLog(options = {})
   {
      Utils.getFQLPublicAPI().renderAll({ force: true, ...options });

      game.socket.emit('module.forien-quest-log', {
         type: 'questLogRefresh',
         payload: {
            options
         }
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
