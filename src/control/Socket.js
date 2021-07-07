import QuestAPI      from './QuestAPI.js';
import QuestDB       from './QuestDB.js';
import Utils         from './Utils.js';
import ViewManager   from './ViewManager.js';
import FQLDialog     from '../view/FQLDialog.js';

import { constants, questTypes, questTypesI18n, settings }  from '../model/constants.js';

/**
 * Defines the event name to send all messages to over  `game.socket`.
 *
 * @type {string}
 */
const s_EVENT_NAME = 'module.forien-quest-log';

/**
 * Defines the different message types that FQL sends over `game.socket`.
 */
const s_MESSAGE_TYPES = {
   deletedQuest: 'deletedQuest',
   moveQuest: 'moveQuest',
   questRewardDrop: 'questRewardDrop',
   refreshAll: 'refreshAll',
   refreshQuestPreview: 'refreshQuestPreview',
   showQuestPreview: 'showQuestPreview',
   userCantOpenQuest: 'userCantOpenQuest'
};

export default class Socket
{
   static async deletedQuest(deleteData)
   {
      if (typeof deleteData === 'object')
      {
         const questId = deleteData.deleteId;
         const questPreview = ViewManager.questPreview.get(questId);

         if (questPreview !== void 0)
         {
            // Must always use `noSave` as the quest has already been deleted; no auto-save of QuestPreview is allowed.
            await questPreview.close({ noSave: true });
         }

         game.socket.emit(s_EVENT_NAME, {
            type: s_MESSAGE_TYPES.deletedQuest,
            payload: {
               questId,
            }
         });

         Socket.refreshQuestPreview({ questId: deleteData.savedIds });
      }
   }

   static listen()
   {
      game.socket.on(s_EVENT_NAME, async (data) =>
      {
         if (typeof data !== 'object') { return; }

         try
         {
            switch (data.type)
            {
               case s_MESSAGE_TYPES.deletedQuest: await handleDeletedQuest(data); break;
               case s_MESSAGE_TYPES.moveQuest: await handleMoveQuest(data); break;
               case s_MESSAGE_TYPES.questRewardDrop: await handleQuestRewardDrop(data); break;
               case s_MESSAGE_TYPES.refreshAll: handleRefreshAll(data); break;
               case s_MESSAGE_TYPES.refreshQuestPreview: handleRefreshQuestPreview(data); break;
               case s_MESSAGE_TYPES.showQuestPreview: handleShowQuestPreview(data); break;
               case s_MESSAGE_TYPES.userCantOpenQuest: handleUserCantOpenQuest(data); break;
            }
         }
         catch (err)
         {
            console.error(err);
         }
      });
   }

   static async moveQuest({ quest, target })
   {
      let handled = false;

      if (game.user.isGM || (Utils.isTrustedPlayerEdit() && quest.isOwner))
      {
         await quest.move(target);
         handled = true;

         Socket.refreshQuestPreview({
            questId: quest.parent ? [quest.parent, quest.id, ...quest.subquests] : [quest.id, ...quest.subquests]
         });

         Socket.refreshAll();

         const dirname = game.i18n.localize(questTypesI18n[target]);
         ViewManager.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
          { name: quest.name, target: dirname }));
      }
      else
      {
         const canPlayerAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);
         if (target !== questTypes.active && !canPlayerAccept)
         {
            return;
         }
      }

      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.moveQuest,
         payload: {
            questId: quest.id,
            handled,
            target
         }
      });
   }

   static async questRewardDrop(data = {})
   {
      let handled = false;

      if (game.user.isGM)
      {
         /**
          * @type {FQLDropData}
          */
         const fqlData = data.data._fqlData;

         const quest = QuestDB.getQuest(fqlData.questId);
         if (quest)
         {
            quest.removeReward(fqlData.uuidv4);
            await quest.save();
            Socket.refreshQuestPreview({ questId: fqlData.questId });
         }
         handled = true;
      }

      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.questRewardDrop,
         payload: {
            ...data,
            handled
         }
      });
   }

   static refreshAll(options = {})
   {
      ViewManager.renderAll({ force: true, ...options });

      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.refreshAll,
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
      if (Array.isArray(questId))
      {
         for (const id of questId)
         {
            const questPreview = ViewManager.questPreview.get(id);
            if (questPreview !== void 0)
            {
               questPreview.render(true, options);
            }
         }
      }
      else
      {
         const questPreview = ViewManager.questPreview.get(questId);
         if (questPreview !== void 0)
         {
            questPreview.render(true, options);
         }
      }

      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.refreshQuestPreview,
         payload: {
            questId,
            options
         }
      });

      // Also update the quest log and other GUIs
      if (updateLog) { Socket.refreshAll(); }
   }

   static showQuestPreview(questId)
   {
      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.showQuestPreview,
         payload: {
            questId
         }
      });
   }

   static userCantOpenQuest()
   {
      game.socket.emit(s_EVENT_NAME, {
         type: s_MESSAGE_TYPES.userCantOpenQuest,
         payload: {
            user: game.user.name
         }
      });
   }
}

async function handleDeletedQuest(data)
{
   FQLDialog.closeDialogs({ questId: data.payload.questId });

   const questPreview = ViewManager.questPreview.get(data.payload.questId);
   if (questPreview !== void 0)
   {
      // Must always use `noSave` as the quest has already been deleted; no auto-save of QuestPreview is allowed.
      await questPreview.close({ noSave: true });
   }
}

async function handleMoveQuest(data)
{
   const target = data.payload.target;

   if (game.user.isGM && !data.payload.handled)
   {
      const quest = QuestDB.getQuest(data.payload.questId);
      if (quest)
      {
         await quest.move(target);
      }

      // Set handled to true so no other GM level users act upon the move.
      data.payload.handled = true;

      Socket.refreshQuestPreview({
         questId: quest.parent ? [quest.parent, quest.id, ...quest.subquests] : [quest.id, ...quest.subquests]
      });

      Socket.refreshAll();

      const dirname = game.i18n.localize(questTypesI18n[target]);
      ViewManager.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
       { name: quest.name, target: dirname }));
   }

   // For non-GM users close QuestPreview when made hidden / inactive.
   if (!game.user.isGM && target === questTypes.inactive)
   {
      const questPreview = ViewManager.questPreview.get(data.payload.questId);
      if (questPreview !== void 0)
      {
         // Use `noSave` just for sanity in this case as this is a remote close.
         await questPreview.close({ noSave: true });
      }
   }
}

async function handleQuestRewardDrop(data)
{
   if (game.user.isGM)
   {
      /**
       * @type {FQLDropData}
       */
      const fqlData = data.payload.data._fqlData;

      const notify = game.settings.get(constants.moduleName, settings.notifyRewardDrop);
      if (notify)
      {
         ViewManager.notifications.info(game.i18n.format('ForienQuestLog.QuestPreview.RewardDrop', {
            userName: fqlData.userName,
            itemName: fqlData.itemName,
            actorName: data.payload.actor.name
         }));
      }

      // The quest reward has already been removed by a GM user.
      if (data.payload.handled) { return; }

      // Set handled to true so no more GM level users act upon this event.
      data.payload.handled = true;

      const quest = QuestDB.getQuest(fqlData.questId);
      if (quest)
      {
         quest.removeReward(fqlData.uuidv4);
         await quest.save();
         Socket.refreshQuestPreview({ questId: fqlData.questId });
      }
   }
}

function handleRefreshAll(data)
{
   const options = typeof data.payload.options === 'object' ? data.payload.options : {};
   ViewManager.renderAll({ force: true, ...options });
}

function handleRefreshQuestPreview(data)
{
   const questId = data.payload.questId;
   const options = typeof data.payload.options === 'object' ? data.payload.options : {};

   if (Array.isArray(questId))
   {
      for (const id of questId)
      {
         const questPreview = ViewManager.questPreview.get(id);
         if (questPreview !== void 0)
         {
            const quest = QuestDB.getQuest(id);
            if (!quest)
            {
               questPreview.close();
               continue;
            }

            if (quest.isObservable) { questPreview.render(true, options); }
            else { questPreview.close(); }
         }
      }
   }
   else
   {
      const questPreview = ViewManager.questPreview.get(questId);
      if (questPreview !== void 0)
      {
         const quest = QuestDB.getQuest(questId);
         if (!quest)
         {
            questPreview.close();
            return;
         }

         if (quest.isObservable) { questPreview.render(true, options); }
         else { questPreview.close(); }
      }
   }
}

function handleShowQuestPreview(data)
{
   QuestAPI.open({ questId: data.payload.questId, notify: false });
}

function handleUserCantOpenQuest(data)
{
   if (game.user.isGM)
   {
      ui.notifications.warn(game.i18n.format('ForienQuestLog.Notifications.UserCantOpen',
       { user: data.payload.user }), {});
   }
}
