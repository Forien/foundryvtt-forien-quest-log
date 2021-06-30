import Fetch   from './Fetch.js';

import { constants, questTypes, questTypesI18n, settings } from '../model/constants.js';

/**
 * Enrich populates content with a lot of additional data that doesn't necessarily have to be saved
 * with the Quest itself such as Actor data.
 *
 * All enrich methods should only be used in getData of various Foundry apps / views.
 */
export default class Enrich
{
   static async giverFromQuest(quest)
   {
      let data = null;

      if (quest.giver === 'abstract')
      {
         data = {
            name: quest.giverName,
            img: quest.image,
            hasTokenImg: false
         };
      }
      else if (typeof quest.giver === 'string')
      {
         data = Enrich.giverFromUUID(quest.giver, quest.image);
      }

      return data;
   }

   static async giverFromUUID(uuid, imageType = 'actor')
   {
      let data = null;

      if (typeof uuid === 'string')
      {
         const document = await fromUuid(uuid);

         if (document !== null)
         {
            switch (document.documentName)
            {
               case Actor.documentName:
               {
                  const actorImage = document.img;
                  const tokenImage = document?.data?.token?.img;
                  const hasTokenImg = typeof tokenImage === 'string' && tokenImage !== actorImage;

                  data = {
                     uuid,
                     name: document.name,
                     img: imageType === 'token' && hasTokenImg ? tokenImage : actorImage,
                     hasTokenImg
                  };
                  break;
               }

               case Item.documentName:
                  data = {
                     uuid,
                     name: document.name,
                     img: document.img,
                     hasTokenImg: false
                  };
                  break;

               case JournalEntry.documentName:
                  data = {
                     uuid,
                     name: document.name,
                     img: document.data.img,
                     hasTokenImg: false
                  };
                  break;
            }
         }
      }

      return data;
   }

   /**
    * @param {SortedQuests}   sortedQuests
    *
    * @returns {Promise<object>}
    */
   static async sorted(sortedQuests)
   {
      const data = {};

      for (const key in sortedQuests)
      {
         data[key] = [];
         for (const quest of sortedQuests[key])
         {
            const questView = await Enrich.quest(quest);
            data[key].push(questView);
         }
      }

      return data;
   }

   static statusActions(quest)
   {
      let result = '';

      const isGM = game.user.isGM;
      const availableTab = game.settings.get(constants.moduleName, settings.availableQuests);
      const canAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);

      if (isGM || canAccept)
      {
         result += `<div class="actions">`;

         if (isGM && questTypes.active === quest.status)
         {
            result += `<i class="move fas fa-check-circle" title="${game.i18n.localize('ForienQuestLog.Tooltips.SetCompleted')}" data-target="completed" data-id="${quest.id}"></i>\n`;
            result += `<i class="move fas fa-times-circle" title="${game.i18n.localize('ForienQuestLog.Tooltips.SetFailed')}" data-target="failed" data-id="${quest.id}"></i>\n`;
         }

         if ((isGM && questTypes.hidden === quest.status) || questTypes.available === quest.status)
         {
            result += `<i class="move fas fa-play" title="${game.i18n.localize('ForienQuestLog.Tooltips.SetActive')}" data-target="active" data-id="${quest.id}"></i>\n`;
         }

         if (isGM && questTypes.hidden !== quest.status)
         {
            result += `<i class="move fas fa-stop-circle" title="${game.i18n.localize('ForienQuestLog.Tooltips.Hide')}" data-target="hidden" data-id="${quest.id}"></i>\n`;
         }

         if (availableTab && ((isGM && questTypes.hidden === quest.status) || questTypes.active === quest.status))
         {
            result += `<i class="move fas fa-clipboard" title="${game.i18n.localize('ForienQuestLog.Tooltips.SetAvailable')}" data-target="available" data-id="${quest.id}"></i>\n`;
         }

         if (isGM)
         {
            result += `<i class="delete fas fa-trash" title="${game.i18n.localize('ForienQuestLog.Tooltips.Delete')}" data-id="${quest.id}" data-name="${quest.name}"></i>\n`;
         }

         result += `</div>\n`;
      }

      return result;
   }

   /**
    * This method also performs content manipulation, for example enriching HTML or calculating amount
    * of done/total tasks etc.
    *
    * @param {Quest}  quest - Quest data to construct view data.
    *
    * @returns {Promise<object>} A single quest view or SortedQuests upgraded
    */
   static async quest(quest)
   {
      const data = JSON.parse(JSON.stringify(quest.toJSON()));
      data.id = quest.id;
      data.isHidden = quest.isHidden;
      data.isInactive = questTypes.hidden === data.status;

      const personalActors = quest.getPersonalActors();

      const isGM = game.user.isGM;
      const isPlayer = !game.user.isGM;

      const canPlayerDrag = game.settings.get(constants.moduleName, settings.allowPlayersDrag);
      const countHidden = game.settings.get(constants.moduleName, settings.countHidden);

      data.isPersonal = personalActors.length > 0;
      data.personalActors = personalActors.map((a) => a.name).sort((a, b) => a.localeCompare(b)).join('&#013;');


      data.description = TextEditor.enrichHTML(data.description);

      data.data_giver = await Enrich.giverFromQuest(quest);

      data.questIconType = void 0;

      if (data.splashAsIcon && data.splash.length)
      {
         data.questIconType = 'splash-image';
      }
      else if (data.data_giver && data.data_giver.img)
      {
         data.questIconType = 'quest-giver';
      }

      data.statusLabel = game.i18n.localize(`ForienQuestLog.QuestTypes.Labels.${data.status}`);

      data.statusActions = Enrich.statusActions(quest);

      data.isSubquest = false;

      data.data_parent = {};

      if (data.parent !== null)
      {
         const parentQuest = Fetch.quest(data.parent);
         data.isSubquest = parentQuest.isObservable;
         if (parentQuest)
         {
            data.data_parent = {
               id: data.parent,
               giver: parentQuest.giver,
               name: parentQuest.name,
               status: parentQuest.status
            };
         }
      }

      data.data_subquest = [];

      if (data.subquests !== void 0)
      {
         for (const questId of data.subquests)
         {
            const subquest = Fetch.quest(questId);

            if (subquest && subquest.isObservable)
            {
               // Do not show hidden hidden / inactive subquests to players.
               if (isPlayer && subquest.status === questTypes.hidden) { continue; }

               // Mirror Task data for state / button state
               let state = 'square';
               switch (subquest.status)
               {
                  case questTypes.completed:
                     state = 'check-square';
                     break;
                  case questTypes.failed:
                     state = 'minus-square';
                     break;
               }

               const statusTooltip = game.i18n.format('ForienQuestLog.Tooltips.Status',
                { statusI18n: game.i18n.localize(questTypesI18n[subquest.status]) });

               const subPersonalActors = subquest.getPersonalActors();

               data.data_subquest.push({
                  id: questId,
                  giver: subquest.giver,
                  name: subquest.name,
                  status: subquest.status,
                  statusTooltip,
                  state,
                  statusActions: Enrich.statusActions(subquest),
                  isHidden: subquest.isHidden,
                  isInactive: subquest.status === questTypes.hidden,
                  isPersonal: subPersonalActors.length > 0,
                  personalActors: subPersonalActors.map((a) => a.name).sort((a, b) => a.localeCompare(b)).join('&#013;')
               });
            }
         }
      }

      if (countHidden)
      {
         data.checkedTasks = data.tasks.filter((t) => t.completed).length;

         const finishedSubquests = data.data_subquest.filter((s) => s.status === questTypes.completed).length;

         data.checkedTasks += finishedSubquests;

         data.totalTasks = data.tasks.length + data.data_subquest.length;
      }
      else
      {
         data.checkedTasks = data.tasks.filter((t) => t.hidden === false && t.completed).length;

         const finishedSubquests = data.data_subquest.filter(
          (s) => s.isObservable && s.status === questTypes.completed).length;

         data.checkedTasks += finishedSubquests;

         data.totalTasks = data.tasks.filter((t) => t.hidden === false).length +
          data.data_subquest.filter((s) => s.isObservable).length;
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

      data.data_tasks = data.tasks.map((task) =>
      {
         // Note: We no longer are allowing user data to be enriched / currently escaping in Handlebars template.
         // XSS vulnerability w/ script data entered by user. This may change in the future as it might be possible to
         // provide a regex to verify and only upgrade content links and avoid scripts though that is a hard task.
         // task.name = TextEditor.enrichHTML(task.name);

         return task;
      });

      data.data_rewards = data.rewards.map((item) =>
      {
         const type = item.type.toLowerCase();

         const draggable = (isGM || canPlayerDrag) && (isGM || !item.locked) && type !== 'abstract';

         return {
            name: item.data.name,
            img: item.data.img,
            type,
            hidden: item.hidden,
            locked: item.locked,
            isPlayerLink: !isGM && !canPlayerDrag && !item.locked && type !== 'abstract',
            draggable,
            transfer: type !== 'abstract' ? JSON.stringify(
             { uuid: item.data.uuid, uuidv4: item.uuidv4, name: item.data.name }) : void 0,
            uuidv4: item.uuidv4
         };
      });

      if (!isGM)
      {
         data.data_tasks = data.data_tasks.filter((t) => t.hidden === false);
         data.data_rewards = data.data_rewards.filter((r) => r.hidden === false);
      }

      return data;
   }
}
