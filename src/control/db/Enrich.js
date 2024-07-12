import {
   QuestDB,
   Utils }           from '../index.js';

import { DOMPurify } from '../../../external/index.js';

import {
   constants,
   questStatus,
   questStatusI18n,
   settings }        from '../../model/constants.js';

/**
 * Enrich populates content with a lot of additional data that doesn't necessarily have to be saved
 * with the Quest itself such as Actor data and provides embellishment for the Handlebars templates for tasks, rewards,
 * subquests, status actions, and provides a UUID lookup for the quest giver image.
 *
 * All enrich methods should only be used in the {@link QuestDB} during the caching phase of the update / create
 * lifecycle.
 */
export class Enrich
{
   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

   /**
    * Builds the quest status / icons div to control quest status. There are many possible states to construct across
    * three different user states from GM, trusted player edit, to player accept, so it is easier to build and cache
    * this data as performing this setup in the Handlebars template itself is cumbersome and error-prone.
    *
    * @param {Quest} quest - The quest to build status action div / icons for based on current user state.
    *
    * @returns {string} The HTML to insert into a Handlebars template for quest status div / icons.
    */
   static statusActions(quest)
   {
      let result = '';

      const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();
      const canAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);
      const canEdit = game.user.isGM || (isTrustedPlayerEdit && quest.isOwner);

      let addedAction = false;

      result += `<div class="actions quest-status${!isTrustedPlayerEdit && !canEdit ? ' is-player' : ''}">`;

      if (canEdit || canAccept)
      {
         if (canEdit && questStatus.active === quest.status)
         {
            result += `<i class="move fas fa-check-circle" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetCompleted')}" data-target="completed" data-quest-id="${quest.id}"></i>\n`;

            result += `<i class="move fas fa-times-circle" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetFailed')}" data-target="failed" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         // If the quest status is completed add a failed button to be able to move it directly to failed.
         if (canEdit && questStatus.completed === quest.status)
         {
            result += `<i class="move fas fa-times-circle" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetFailed')}" data-target="failed" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         // If the quest status is failed add a completed button to be able to move it directly to completed.
         if (canEdit && questStatus.failed === quest.status)
         {
            result += `<i class="move fas fa-check-circle" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetCompleted')}" data-target="completed" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         if ((canEdit && questStatus.inactive === quest.status) || questStatus.available === quest.status)
         {
            result += `<i class="move fas fa-play" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetActive')}" data-target="active" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         if (canEdit && questStatus.inactive !== quest.status)
         {
            result += `<i class="move fas fa-stop-circle" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetInactive')}" data-target="inactive" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         if ((canEdit && questStatus.inactive === quest.status) || questStatus.active === quest.status)
         {
            result += `<i class="move fas fa-clipboard" title="${game.i18n.localize(
             'ForienQuestLog.QuestTypes.Tooltips.SetAvailable')}" data-target="available" data-quest-id="${quest.id}"></i>\n`;

            addedAction = true;
         }

         if (canEdit)
         {
            result += `<i class="delete fas fa-trash" title="${game.i18n.localize(
             'ForienQuestLog.Tooltips.Delete')}" data-quest-id="${quest.id}" data-quest-name="${quest.name}"></i>\n`;

            addedAction = true;
         }

         result += `</div>\n`;
      }

      return isTrustedPlayerEdit || addedAction ? result : '';
   }

   /**
    * This method performs content manipulation based on the current state of {@link Quest} preparing data to be
    * displayed in a {@link Handlebars} template. This data is cached in a {@link QuestEntry} in the {@link QuestDB}
    * and only updated when the underlying {@link Quest} changes.
    *
    * @param {Quest}  quest - Quest data to construct view data.
    *
    * @returns {Promise<EnrichData>} A single quest view or SortedQuests upgraded
    */
   static async quest(quest)
   {
      const data = JSON.parse(JSON.stringify(quest.toJSON()));
      data.id = quest.id;
      data.isActive = quest.isActive;
      data.isHidden = quest.isHidden;
      data.isInactive = quest.isInactive;

      const isOwner = quest.isOwner;
      const isPrimary = quest.isPrimary;
      const personalActors = quest.getPersonalActors();

      const isTrustedPlayerEdit = Utils.isTrustedPlayerEdit();
      const canEdit =  game.user.isGM || (isOwner && isTrustedPlayerEdit);
      const playerEdit = isOwner;

      const canPlayerAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);
      const canPlayerDrag = game.settings.get(constants.moduleName, settings.allowPlayersDrag);
      const countHidden = game.settings.get(constants.moduleName, settings.countHidden);

      data.canEdit = canEdit;

      data.wrapNameLengthCSS = 'player';
      if (canPlayerAccept || playerEdit) { data.wrapNameLengthCSS = 'player-edit'; }
      if (canEdit) { data.wrapNameLengthCSS = 'can-edit'; }

      data.isPersonal = personalActors.length > 0;
      data.personalActors = personalActors.map((a) => a.name).sort((a, b) => a.localeCompare(b)).join('&#013;');

      data.isPrimary = isPrimary;

      // Enrich w/ TextEditor, but first sanitize w/ DOMPurify, allowing only iframes with YouTube embed.
      data.description = await TextEditor.enrichHTML(DOMPurify.sanitize(data.description), {
         secrets: canEdit || playerEdit,
         async: true
      });

      data.gmnotes = await TextEditor.enrichHTML(DOMPurify.sanitize(data.gmnotes), { async: true });

      data.playernotes = await TextEditor.enrichHTML(DOMPurify.sanitize(data.playernotes), { async: true });

      data.questIconType = void 0;

      if (data.splashAsIcon && data.splash.length)
      {
         data.questIconType = 'splash-image';
      }
      else if (data.giverData && data.giverData.img)
      {
         data.questIconType = 'quest-giver';
      }

      const statusLabel = game.i18n.localize(`ForienQuestLog.QuestTypes.Labels.${data.status}`);

      // The quest status in the details section.
      data.statusLabel = game.i18n.format(`ForienQuestLog.QuestTypes.Labels.Status`, { statusLabel });

      data.statusActions = Enrich.statusActions(quest);

      data.isSubquest = false;

      data.data_parent = {};

      if (data.parent !== null)
      {
         const parentQuest = QuestDB.getQuest(data.parent);
         if (parentQuest)
         {
            data.isSubquest = parentQuest.isObservable;

            data.data_parent = {
               id: data.parent,
               giver: parentQuest.giver,
               name: parentQuest.name,
               status: parentQuest.status,
               isPrimary: parentQuest.isPrimary
            };
         }
      }

      data.data_subquest = [];

      if (data.subquests !== void 0)
      {
         for (const questId of data.subquests)
         {
            const subquest = QuestDB.getQuest(questId);

            // isObservable filters out non-owned hidden quests for trustedPlayerEdit.
            if (subquest && subquest.isObservable)
            {
               // Mirror Task data for state / button state
               let state = 'square';
               switch (subquest.status)
               {
                  case questStatus.completed:
                     state = 'check-square';
                     break;
                  case questStatus.failed:
                     state = 'minus-square';
                     break;
               }

               const subPersonalActors = subquest.getPersonalActors();

               const isInactive = subquest.isInactive;
               const subIsPrimary = subquest.isPrimary;

               const statusTooltipData = isInactive ?
                { statusI18n: game.i18n.localize(questStatusI18n[questStatus.inactive]) } :
                 { statusI18n: game.i18n.localize(questStatusI18n[subquest.status]) };

               const statusTooltip = game.i18n.format('ForienQuestLog.QuestTypes.Tooltips.Status', statusTooltipData);

               const canEditSubquest = game.user.isGM || (subquest.isOwner && isTrustedPlayerEdit);

               data.data_subquest.push({
                  id: questId,
                  giver: subquest.giver,
                  name: subquest.name,
                  status: subquest.status,
                  statusTooltip,
                  state,
                  statusActions: Enrich.statusActions(subquest),
                  canEdit: canEditSubquest,
                  isActive: subquest.isActive,
                  isHidden: subquest.isHidden,
                  isInactive,
                  isPersonal: subPersonalActors.length > 0,
                  personalActors: subPersonalActors.map((a) => a.name).sort((a, b) => a.localeCompare(b)).join('&#013;'),
                  isPrimary: subIsPrimary
               });
            }
         }
      }

      if (countHidden)
      {
         data.checkedTasks = data.tasks.filter((t) => t.completed).length;

         const finishedSubquests = data.data_subquest.filter((s) => questStatus.completed === s.status).length;

         data.checkedTasks += finishedSubquests;

         data.totalTasks = data.tasks.length + data.subquests.length;
      }
      else
      {
         data.checkedTasks = data.tasks.filter((t) => !t.hidden && t.completed).length;

         const finishedSubquests = data.data_subquest.filter(
          (s) => !s.isObservable && !s.isInactive && questStatus.completed === s.status).length;

         data.checkedTasks += finishedSubquests;

         data.totalTasks = data.tasks.filter((t) => !t.hidden).length +
          data.data_subquest.filter((s) => !s.isObservable && !s.isInactive).length;
      }

      switch (game.settings.get(constants.moduleName, settings.showTasks))
      {
         case 'default':
            data.taskCountLabel = `(${data.checkedTasks}/${data.totalTasks})`;
            break;

         case 'onlyCurrent':
            data.taskCountLabel = `(${data.checkedTasks})`;
            break;

         default:
            data.taskCountLabel = '';
            break;
      }

      data.data_tasks = await Promise.all(data.tasks.map(async (task) =>
      {
         return {
            ...task,
            name: await TextEditor.enrichHTML(DOMPurify.sanitize(task.name), { async: true })
         };
      }));

      data.data_rewards = await Promise.all(data.rewards.map(async (item) =>
      {
         const type = item.type.toLowerCase();

         // Only items are potentially draggable when `can player drag` is enabled or `can edit`.
         const draggable = type === 'item' && (canEdit || canPlayerDrag) && (canEdit || !item.locked);

         const lockedTooltip = canEdit ? game.i18n.localize('ForienQuestLog.QuestPreview.Tooltips.RewardLocked') :
          game.i18n.localize('ForienQuestLog.QuestPreview.Tooltips.RewardLockedPlayer');

         const unlockedTooltip = canEdit ? game.i18n.localize('ForienQuestLog.QuestPreview.Tooltips.RewardUnlocked') :
          game.i18n.localize('ForienQuestLog.QuestPreview.Tooltips.RewardUnlockedPlayer');

         // Defines if the pointer cursor is displayed. For abstract or actor reward it is always displayed for GM or
         // when unlocked for players.
         const isLink = (type === 'abstract' || type === 'actor') && (canEdit || !item.locked);

         // For item rewards make them links when `can player drag` is not enabled.
         const itemLink = type === 'item' && !canEdit && !canPlayerDrag && !item.locked;

         return {
            name: await TextEditor.enrichHTML(DOMPurify.sanitize(item.data.name), { async: true }),
            img: item.data.img,
            type,
            hidden: item.hidden,
            locked: item.locked,
            lockedTooltip,
            unlockedTooltip,
            isLink: isLink || itemLink,
            draggable,
            transfer: type !== 'abstract' ? JSON.stringify(
             { uuid: item.data.uuid, uuidv4: item.uuidv4, name: item.data.name }) : void 0,
            uuidv4: item.uuidv4
         };
      }));

      if (!canEdit)
      {
         data.data_tasks = data.data_tasks.filter((t) => t.hidden === false);
         data.data_rewards = data.data_rewards.filter((r) => r.hidden === false);
      }

      data.hasObjectives = data.data_tasks.length + data.data_subquest.length > 0;

      // Determine if all rewards are visible / unlocked
      data.allRewardsVisible = true;
      data.allRewardsUnlocked = true;
      for (const reward of data.data_rewards)
      {
         if (reward.hidden) { data.allRewardsVisible = false; }
         if (reward.locked) { data.allRewardsUnlocked = false; }
      }

      return data;
   }
}

/**
 * @typedef {QuestData}    EnrichData
 *
 * @property {boolean}     allRewardsVisible - Are all rewards visible. Controls show all / hide all button.
 *
 * @property {boolean}     allRewardsUnlocked - Are all rewards unlocked. Controls unlock all / lock all button.
 *
 * @property {boolean}     canEdit - Is full editing allowed. Either GM or trusted player w/ edit capability.
 *
 * @property {number}      checkedTasks - Number of completed tasks.
 *
 * @property {object}      data_parent - A data object with parent quest details.
 *
 * @property {string|null} data_parent.id - The parent quest ID / {@link Quest.id}
 *
 * @property {string|null} data_parent.giver - The parent quest giver / {@link Quest.giver}
 *
 * @property {string}      data_parent.name - The parent quest name / {@link Quest.name}
 *
 * @property {boolean}     data_parent.isPrimary - The parent quest is the primary quest / {@link Quest.isPrimary}
 *
 * @property {string}      data_parent.status - The parent quest status / {@link Quest.status}
 *
 * @property {object[]}    data_rewards - A list of reward item details.
 *
 * @property {boolean}     data_rewards.draggable - Can the player drag the reward to actor sheet.
 *
 * @property {boolean}     data_rewards.hidden - Is the reward hidden / only 'canEdit' users can see it.
 *
 * @property {string}      data_rewards.img - The image for the reward.
 *
 * @property {boolean}     data_rewards.isLink - Is the reward a link / pointer cursor.
 *
 * @property {boolean}     data_rewards.locked - Is the reward locked / only 'canEdit' manipulate it.
 *
 * @property {string}      data_rewards.lockedTooltip - The tooltip to display for the locked icon.
 *
 * @property {string}      data_rewards.name - The name of the reward.
 *
 * @property {string}      data_rewards.type - The type of reward / 'abstract' for abstract rewards.
 *
 * @property {object}      data_rewards.transfer - The data tranfer object.
 *
 * @property {string}      data_rewards.transfer.name - The reward name.
 *
 * @property {string}      data_rewards.transfer.uuid - The reward Foundry UUID.
 *
 * @property {string}      data_rewards.transfer.uuidv4 - The reward FQL UUIDv4.
 *
 * @property {string}      data_rewards.unlockedTooltip - The tooltip to display for the unlocked icon.
 *
 * @property {string}      data_rewards.uuidv4 - The reward FQL UUIDv4.
 *
 * @property {object[]}    data_subquest - A list of data objects with subquest details.
 *
 * @property {boolean}     data_subquest.canEdit - Is full editing allowed. Either GM or trusted player w/ edit.
 *
 * @property {string|null} data_subquest.giver - The parent quest giver / {@link Quest.giver}
 *
 * @property {string|null} data_subquest.id - The parent quest ID / {@link Quest.id}
 *
 * @property {boolean}     data_subquest.isActive - Is quest status 'active'
 *
 * @property {boolean}     data_subquest.isHidden - Is quest hidden by permissions / {@link Quest.isHidden}
 *
 * @property {boolean}     data_subquest.isInactive - Is quest status 'inactive'
 *
 * @property {boolean}     data_subquest.isPersonal - Is quest personal / {@link Quest.isPersonal}
 *
 * @property {string}      data_subquest.name - The parent quest name / {@link Quest.name}
 *
 * @property {string[]}    data_subquest.personalActors - A sorted list of names / {@link Quest.personalActors}
 *
 * @property {string}      data_subquest.state - The CSS class for quest toggle / task state
 *
 * @property {string}      data_subquest.status - The parent quest status / {@link Quest.status}
 *
 * @property {string}      data_subquest.statusActions - HTML for quest status actions / {@link Enrich.statusActions}
 *
 * @property {string}      data_subquest.statusTooltip - The localized quest status tooltip / {@link Quest.status}
 *
 * @property {QuestTaskData[]}  data_tasks - The task data.
 *
 * @property {string}      description - The enriched quest description via {@link TextEditor.enrichHTML}.
 *
 * @property {string}      gmnotes - The GM Notes.
 *
 * @property {boolean}     hasObjectives - Is there visible tasks & subjects.
 *
 * @property {string}      id - Quest ID / {@link Quest.id}
 *
 * @property {boolean}     isActive - Is quest status 'active'
 *
 * @property {boolean}     isHidden - Is quest hidden by permissions / {@link Quest.isHidden}
 *
 * @property {boolean}     isInactive - Is quest status 'inactive'
 *
 * @property {boolean}     isPersonal - Is quest personal / not all players can access it / {@link Quest.isPersonal}
 *
 * @property {boolean}     isSubquest - Is quest a subquest.
 *
 * @property {string}      playerNotes - The player notes.
 *
 * @property {string[]}    personalActors - A sorted list of names for HTML tooltip / {@link Quest.personalActors}
 *
 * @property {string}      questIconType - Indicates which icon to use 'splash-image' or 'quest-giver'.
 *
 * @property {string}      statusActions - HTML for quest status icon actions / {@link Enrich.statusActions}
 *
 * @property {string}      statusLabel - Localized label for {@link Quest.status}
 *
 * @property {string}      taskCountLabel - A label of completed / total tasks depending on module settings.
 *
 * @property {number}      totalTasks - Number of total tasks.
 *
 * @property {string}      wrapNameLengthCSS - The CSS class to add for content length wrapping based on user type.
 */

/**
 * @typedef QuestImgNameData
 *
 * @property {string}   name - Quest giver or item name
 *
 * @property {string}   img - Quest giver or item image
 *
 * @property {boolean}  hasTokenImg - boolean indicating the quest giver has a token prototype image.
 *
 * @property {string}   [uuid] - Any associated Foundry UUID for the quest giver / item.
 */