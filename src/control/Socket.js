import { QuestAPI }  from './public/index.js';

import {
   QuestDB,
   Utils,
   ViewManager }     from './index.js';

import {
   constants,
   questStatus,
   questStatusI18n,
   settings }        from '../model/constants.js';

/**
 * Provides a basic Socket.io implementation to send events between all connected clients. The various methods have
 * at as local and remote control mostly of GUI related actions. FQL appears to be a reactive application, but it really
 * is Socket doing a lot of the heavy lifting to notify clients that particular GUI apps need to be refreshed when the
 * underlying Quest data changes.
 *
 * There are also various actions that require a GM or trusted played with edit capability to act upon mostly moving
 * quests from one status to another. Reward item drops into actor sheets invokes {@link Socket.questRewardDrop} from
 * the {@link FQLHooks.dropActorSheetData} hook, but at least one GM level user must be logged in to receive this
 * message to perform the drop / removal of the reward from a Quest.
 *
 * Please see the following view control classes and the QuestDB for socket related usage:
 *
 * @see HandlerAny
 * @see HandlerDetails
 * @see HandlerLog
 * @see HandlerManage
 * @see QuestDB.deleteQuest
 */
export class Socket
{
   /**
    * Defines the event name to send all messages to over `game.socket`.
    *
    * @type {string}
    */
   static #eventName = 'module.forien-quest-log';

   /**
    * Defines the different message types that FQL sends over `game.socket`.
    */
   static #messageTypes = {
      deletedQuest: 'deletedQuest',
      questSetPrimary: 'questSetPrimary',
      questSetStatus: 'questSetStatus',
      questRewardDrop: 'questRewardDrop',
      refreshAll: 'refreshAll',
      refreshQuestPreview: 'refreshQuestPreview',
      savePlayerNotes: 'savePlayerNotes',
      showQuestLog: 'showQuestLog',
      showQuestPreview: 'showQuestPreview',
      showQuestTracker: 'showQuestTracker',
      userCantOpenQuest: 'userCantOpenQuest'
   };

   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

   /**
    * Refreshes the parent & subquest GUI apps as applicable and closes the associated QuestPreview for the quest that
    * was deleted. This method is invoked from the private module method `QuestDB.#handleJournalEntryDelete`.
    *
    * Handled on the receiving side by `#handleDeletedQuest`.
    *
    * @param {DeleteData}  deleteData - A data object containing the views that need to be updated and which quest was
    *                                   deleted by quest ID.
    *
    * @returns {Promise<void>}
    * @see QuestDB / QuestDB.#handleJournalEntryDelete
    */
   static async deletedQuest(deleteData)
   {
      if (typeof deleteData === 'object')
      {
         const questId = deleteData.deleteId;
         const questPreview = ViewManager.questPreview.get(questId);

         // Close the associated QuestPreview for the deleted Quest.
         if (questPreview !== void 0)
         {
            // Must always use `noSave` as the quest has already been deleted; no auto-save of QuestPreview is allowed.
            await questPreview.close({ noSave: true });
         }

         game.socket.emit(this.#eventName, {
            type: this.#messageTypes.deletedQuest,
            payload: {
               questId,
            }
         });

         // Send a refresh quest preview message for the views that need to be updated.
         Socket.refreshQuestPreview({ questId: deleteData.savedIds });
      }
   }

   /**
    * Provides the main incoming message registration and distribution of socket messages on the receiving side.
    */
   static listen()
   {
      game.socket.on(this.#eventName, this.#handleEvent.bind(this));
   }

   /**
    * Handles the reward drop in actor sheet action from the {@link FQLHooks.dropActorSheetData} hook. If the local user
    * is a GM handle this action right away otherwise send a message across the wire for the first GM user reached to
    * handle the action remotely. The reward is removed from the associated quest.
    *
    * Handled on the receiving side by `#handleQuestRewardDrop`.
    *
    * @param {RewardDropData} data - The reward drop data generated from the hook.
    *
    * @returns {Promise<void>}
    */
   static async questRewardDrop(data = {})
   {
      let handled = false;

      // Perform the immediate reward removal action if the current user is the GM and set `handled` to true.
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

      // Emit the reward drop event.
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.questRewardDrop,
         payload: {
            ...data,
            handled
         }
      });
   }

   /**
    * Renders all GUI apps via {@link ViewManager.renderAll}. With the option `questPreview` set to true all
    * QuestPreviews are also rendered. Remaining options are forwarded onto the Foundry Application render method.
    * Sends a socket message over the wire for all remote clients to do the same.
    *
    * Handled on the receiving side by `#handleRefreshAll`.
    *
    * @param {object}   options - Optional parameters
    *
    * @param {boolean}  [options.force] - Forces a data refresh.
    *
    * @param {boolean}  [options.questPreview] - Render all open QuestPreview apps.
    */
   static refreshAll(options = {})
   {
      // QuestDB Journal update hook is now async, so schedule on next microtask so local display is correct.
      setTimeout(() => ViewManager.renderAll({ force: true, ...options }), 10);

      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.refreshAll,
         payload: {
            options
         }
      });
   }

   /**
    * Refreshes local {@link QuestPreview} apps and sends a message indicating which QuestPreview apps need to be
    * rendered.
    *
    * Handled on the receiving side by `#handleRefreshQuestPreview`.
    *
    * @param {object}            opts - Optional parameters.
    *
    * @param {string|string[]}   opts.questId - A single quest ID or an array of IDs to update.
    *
    * @param {boolean}           [opts.updateLog=true] - Updates the quest log and all other GUI apps if true.
    *
    * @param {...RenderOptions}  [opts.options] - Any options to pass onto QuestPreview render method invocation.
    */
   static refreshQuestPreview({ questId, updateLog = true, ...options })
   {
      // QuestDB Journal update hook is now async, so schedule on next microtask so local display is correct.
      setTimeout(() => ViewManager.refreshQuestPreview(questId, options), 10);

      // Send a socket message for remote clients to render.
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.refreshQuestPreview,
         payload: {
            questId,
            options
         }
      });

      // Also update the quest log and other GUIs
      if (updateLog) { Socket.refreshAll(); }
   }

   /**
    * Saves player notes by delegating to an active GM.
    *
    * @param {object}   opts - Optional parameters.
    *
    * @param {Quest}    opts.quest - The current quest being manipulated. It
    *
    * @param {string}   opts.playernotes - The player notes to save.
    */
   static savePlayerNotes({ quest, playernotes })
   {
      // Send a socket message for any remote GMs logged in to handle request.
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.savePlayerNotes,
         payload: {
            questId: quest.id,
            playernotes,
            handled: false
         }
      });
   }

   /**
    * Sets a new primary quest if a GM user or sends a socket message if set by a trusted player w/ edit. If the
    * current user is not a GM a GM level user must be logged in for a successful completion of the set status
    * operation.
    *
    * @param {object}   opts - Optional parameters.
    *
    * @param {Quest}    opts.quest - The current quest being manipulated. It
    *
    * @returns {Promise<void>}
    */
   static async setQuestPrimary({ quest })
   {
      // If the current user is a GM immediately set the primary quest.
      if (game.user.isGM)
      {
         // Get any currently set primary quest.
         const currentQuestEntry = QuestDB.getQuestEntry(game.settings.get(
          constants.moduleName, settings.primaryQuest));

         // If the current set primary quest is different from provided quest then set new primary quest.
         if (currentQuestEntry !== void 0 && currentQuestEntry.id !== quest.id)
         {
            await game.settings.set(constants.moduleName, settings.primaryQuest, quest.id);
         }
         else
         {
            // There isn't a primary quest set or the same quest is potentially being unset.
            await game.settings.set(constants.moduleName, settings.primaryQuest, quest.isPrimary ? '' : quest.id);
         }
      }
      else
      {
         // Otherwise send a socket message for any remote GMs logged in to handle request.
         game.socket.emit(this.#eventName, {
            type: this.#messageTypes.questSetPrimary,
            payload: {
               questId: quest.id,
               handled: false
            }
         });
      }
   }

   /**
    * Handles setting a new quest status then refreshes the appropriate views including parent and
    * subquests as applicable. On the invocation side if the user is a GM or trusted player with edit and ownership of
    * the quest being updated then the action is immediately taken and `handled` set to true which is part of the
    * message sent across the wire. If this is a player who can accept quests the local action is skipped and a socket
    * message is sent out and the first GM level user to receive it will perform the status update for the associated
    * quest. If no GM level users are logged in this action is never handled and the user can not change the status of
    * a quest.
    *
    * Handled on the receiving side by `#handleQuestSetStatus`.
    *
    * @param {object}   options - Options.
    *
    * @param {Quest}    options.quest - The quest to move.
    *
    * @param {string}   options.target - The target status. One of five {@link questStatus}.
    *
    * @returns {Promise<void>}
    * @see HandlerAny.questStatusSet
    */
   static async setQuestStatus({ quest, target })
   {
      let handled = false;

      // If the current user is a GM or trusted player with edit capability and owner of the quest immediately perform
      // the status move.
      if (game.user.isGM || (Utils.isTrustedPlayerEdit() && quest.isOwner))
      {
         await quest.setStatus(target);
         handled = true;

         Socket.refreshQuestPreview({ questId: quest.getQuestIds() });
         Socket.refreshAll();

         const dirname = game.i18n.localize(questStatusI18n[target]);
         ViewManager.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
          { name: quest.name, target: dirname }));
      }
      else
      {
         // Provide a sanity check and early out if the player can't accept quests.
         const canPlayerAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);
         if (questStatus.active !== target && !canPlayerAccept) { return; }
      }

      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.questSetStatus,
         payload: {
            questId: quest.id,
            handled,
            target
         }
      });
   }

   /**
    * This handles the `show to players` title bar button found in {@link QuestLog._getHeaderButtons} to open the
    * QuestLog for all remote clients.
    *
    * Handled on the receiving side by `#handleShowQuestLog`.
    *
    * @param {string} tabId - A specific tab ID for the quest status to open.
    */
   static showQuestLog(tabId)
   {
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.showQuestLog,
         payload: {
            tabId
         }
      });
   }

   /**
    * This handles the `show to players` title bar button found in {@link QuestPreview._getHeaderButtons} to open the
    * associated QuestPreview for all remote clients.
    *
    * Handled on the receiving side by `#handleShowQuestPreview`.
    *
    * @param {string}   questId - The quest ID to a QuestPreview.
    */
   static showQuestPreview(questId)
   {
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.showQuestPreview,
         payload: {
            questId
         }
      });
   }

   /**
    * This handles the `show to players` title bar button found in {@link QuestTracker._getHeaderButtons} to open the
    * QuestTracker for all remote clients.
    *
    * Handled on the receiving side by `#handleShowQuestTracker`.
    */
   static showQuestTracker()
   {
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.showQuestTracker
      });
   }

   /**
    * A message emitted for GM users when a player can't open a particular quest in {@link QuestAPI.open}. This is
    * particularly useful if a GM tries to show a quest that the user doesn't have access to via the `show to players`
    * header button in {@link QuestPreview._getHeaderButtons}.
    *
    * Handled on the receiving side by `#handleUserCantOpenQuest`.
    */
   static userCantOpenQuest()
   {
      game.socket.emit(this.#eventName, {
         type: this.#messageTypes.userCantOpenQuest,
         payload: {
            user: game.user.name
         }
      });
   }

   // Internal implementation (receiving message handling) -----------------------------------------------------------

   /**
    * Provides the main incoming message registration and distribution of socket messages on the receiving side.
    *
    * @param {object} data - Incoming data object from `game.socket`.
    */
   static async #handleEvent(data)
   {
      if (typeof data !== 'object') { return; }

      try
      {
         // Dispatch the incoming message data by the message type.
         switch (data.type)
         {
            case this.#messageTypes.deletedQuest: await this.#handleDeletedQuest(data); break;
            case this.#messageTypes.questRewardDrop: await this.#handleQuestRewardDrop(data); break;
            case this.#messageTypes.questSetPrimary: await this.#handleQuestSetPrimary(data); break;
            case this.#messageTypes.questSetStatus: await this.#handleQuestSetStatus(data); break;
            case this.#messageTypes.refreshAll: this.#handleRefreshAll(data); break;
            case this.#messageTypes.refreshQuestPreview: this.#handleRefreshQuestPreview(data); break;
            case this.#messageTypes.savePlayerNotes: await this.#handleSavePlayerNotes(data); break;
            case this.#messageTypes.showQuestLog: this.#handleShowQuestLog(data); break;
            case this.#messageTypes.showQuestPreview: this.#handleShowQuestPreview(data); break;
            case this.#messageTypes.showQuestTracker: this.#handleShowQuestTracker(); break;
            case this.#messageTypes.userCantOpenQuest: this.#handleUserCantOpenQuest(data); break;
         }
      }
      catch (err)
      {
         console.error(err);
      }
   }

   /**
    * Closes the associated QuestPreview for the quest that was deleted on the remote client. The payload is a the
    * `questId` to close. QuestPreview by default saves the quest when a QuestPreview is closed. This quest has already
    * been deleted, so it is important to pass `noSave: true` to {@link QuestPreview.close}.
    *
    * This message is sent from {@link Socket.deletedQuest}.
    *
    * @param {object} data - The data payload.
    *
    * @returns {Promise<void>}
    */
   static async #handleDeletedQuest(data)
   {
      const questPreview = ViewManager.questPreview.get(data.payload.questId);
      if (questPreview !== void 0)
      {
         // Must always use `noSave` as the quest has already been deleted; no auto-save of QuestPreview is allowed.
         await questPreview.close({ noSave: true });
      }
   }

   /**
    * Handles the reward item drop into actor sheet by the first GM level user receiving this message setting the
    * handled state to `true`, so no further GM level users attempt to remove the item from the associated quest.
    *
    * This message is sent from {@link Socket.questRewardDrop}.
    *
    * @param {RewardDropData} data - The data payload is the reward drop data.
    *
    * @returns {Promise<void>}
    */
   static async #handleQuestRewardDrop(data)
   {
      if (game.user.isGM)
      {
         /**
          * @type {FQLDropData}
          */
         const fqlData = data.payload.data._fqlData;

         // Notify the GM that a user has dropped a reward item into an actor sheet.
         const notify = game.settings.get(constants.moduleName, settings.notifyRewardDrop);

         if (notify)
         {
            ViewManager.notifications.info(game.i18n.format('ForienQuestLog.API.Socket.Notifications.RewardDrop', {
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

   /**
    * Handles setting a primary quest by a remote GM user.
    *
    * This message is sent from {@link Socket.setQuestPrimary}.
    *
    * @param {object} data - The data payload contains `questId` along with `handled`.
    *
    * @returns {Promise<void>}
    */
   static async #handleQuestSetPrimary(data)
   {
      // If this message has not already been handled and this user is a GM then handle it now then set `handled` to true.
      if (game.user.isGM && !data.payload.handled)
      {
         const quest = QuestDB.getQuest(data.payload.questId);
         if (quest === void 0) { return; }

         // Get any currently set primary quest.
         const currentQuestEntry = QuestDB.getQuestEntry(game.settings.get(constants.moduleName, settings.primaryQuest));

         // If the current set primary quest is different from provided quest then set new primary quest.
         if (currentQuestEntry !== void 0 && currentQuestEntry.id !== quest.id)
         {
            await game.settings.set(constants.moduleName, settings.primaryQuest, quest.id);
         }
         else
         {
            // There isn't a primary quest set or the same quest is potentially being unset.
            await game.settings.set(constants.moduleName, settings.primaryQuest, quest.isPrimary ? '' : quest.id);
         }

         // Set handled to true so no other GM level users act upon the action.
         data.payload.handled = true;
      }
   }

   /**
    * Sets the associated quest status to the `target` by the first GM level user receiving this message setting the
    * handled state to `true`, so no further GM level users attempt to update the quest.
    *
    * This message is sent from {@link Socket.questSetStatus}.
    *
    * @param {object} data - The data payload contains `questId` and `target` along with `handled`.
    *
    * @returns {Promise<void>}
    */
   static async #handleQuestSetStatus(data)
   {
      const target = data.payload.target;

      // If this message has not already been handled and this user is a GM then handle it now then set `handled` to true.
      if (game.user.isGM && !data.payload.handled)
      {
         const quest = QuestDB.getQuest(data.payload.questId);
         if (quest)
         {
            await quest.setStatus(target);
         }

         // Set handled to true so no other GM level users act upon the move.
         data.payload.handled = true;

         Socket.refreshQuestPreview({
            questId: quest.parent ? [quest.parent, quest.id, ...quest.subquests] : [quest.id, ...quest.subquests]
         });

         Socket.refreshAll();

         const dirname = game.i18n.localize(questStatusI18n[target]);
         ViewManager.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestMoved',
          { name: quest.name, target: dirname }));
      }

      // For non-GM users close QuestPreview when made hidden / inactive.
      if (!game.user.isGM && target === questStatus.inactive)
      {
         const questPreview = ViewManager.questPreview.get(data.payload.questId);
         if (questPreview !== void 0)
         {
            // Use `noSave` just for sanity in this case as this is a remote close.
            await questPreview.close({ noSave: true });
         }
      }
   }

   /**
    * Handles refreshing all GUI apps via {@link ViewManager.renderAll} passing the `options` data payload onward.
    *
    * This message is sent from {@link Socket.refreshAll}.
    *
    * @param {object} data - Please see {@link ViewManager.renderAll} for options.
    */
   static #handleRefreshAll(data)
   {
      const options = typeof data.payload.options === 'object' ? data.payload.options : {};
      ViewManager.renderAll({ force: true, ...options });
   }

   /**
    * Handles refreshing / rendering all QuestPreview apps specified or closes them if the quests specified in the payload
    * are no longer available or observable to the current user.
    *
    * This message is sent from {@link Socket.refreshQuestPreview}.
    *
    * @param {object} data - Data payload contains `questId` which can be a string or array of strings.
    */
   static #handleRefreshQuestPreview(data)
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

   /**
    * Handles saving player notes via GM user.
    *
    * @param {object} data - Data payload contains a single `tabId` as a string.
    */
   static async #handleSavePlayerNotes(data)
   {
      // If this message has not already been handled and this user is a GM then handle it now then set `handled` to true.
      if (game.user.isGM && !data.payload.handled)
      {
         const quest = QuestDB.getQuest(data.payload.questId);
         if (quest && typeof data.payload.playernotes === 'string')
         {
            quest.playernotes = data.payload.playernotes;

            await quest.save();

            // Set handled to true so no other GM level users act upon the move.
            data.payload.handled = true;

            Socket.refreshQuestPreview({ questId: quest.id });
         }
      }
   }

   /**
    * Handles opening the QuestLog app.
    *
    * This message is sent from {@link Socket.showQuestLog}.
    *
    * @param {object} data - Data payload contains a single `tabId` as a string.
    */
   static #handleShowQuestLog(data)
   {
      ViewManager.questLog.render(true, { focus: true, tabId: data.payload.tabId });
   }

   /**
    * Handles opening a QuestPreview app specified by `questId` via {@link QuestAPI.open}.
    *
    * This message is sent from {@link Socket.showQuestPreview}.
    *
    * @param {object} data - Data payload contains a single `questId` as a string.
    */
   static #handleShowQuestPreview(data)
   {
      QuestAPI.open({ questId: data.payload.questId, notify: false });
   }

   /**
    * Handles opening the QuestTracker app.
    *
    * This message is sent from {@link Socket.showQuestTracker}.
    */
   static #handleShowQuestTracker()
   {
      game.settings.set(constants.moduleName, settings.questTrackerEnable, true);
   }

   /**
    * Handles displaying a UI notification for GM level users regarding an attempt to show a quest that the user doesn't
    * have the access to view. Uses {@link ViewManager.notification} to rate limit UI notification display.
    *
    * This message is sent from {@link Socket.userCantOpenQuest}.
    *
    * @param {object} data - Data payload contains a `user` as a string for the user name.
    */
   static #handleUserCantOpenQuest(data)
   {
      if (game.user.isGM)
      {
         ViewManager.notifications.warn(game.i18n.format('ForienQuestLog.Notifications.UserCantOpen',
          { user: data.payload.user }));
      }
   }
}