import Reward           from '../entities/Reward.js';
import Task             from '../entities/Task.js';
import Quest            from '../entities/Quest.js';

export default class ViewData
{
   /**
    *
    * @param {SortedQuests}   sortedQuests
    *
    * @returns {Promise<object>}
    */
   static async createSorted(sortedQuests)
   {
      const data = {};

      for (const key in sortedQuests)
      {
         data[key] = [];
         for (const quest of sortedQuests[key])
         {
            const questView = await ViewData.create(quest);
            data[key].push(questView);
         }
      }

      return data;
   }

   /**
    * Populates content with a lot of additional data, that doesn't necessarily have to be saved
    * with Quest itself, such as Actor's data.
    *
    * This method also performs content manipulation, for example enriching HTML or calculating amount
    * of done/total tasks etc.
    *
    * @param {Quest}  quest - Quest data to construct view data.
    *
    * @returns {Promise<object>} A single quest view or SortedQuests upgraded
    */
   static async create(quest)
   {
      const data = {};

      data.id = quest.id;
      data.giver = quest.giver || null;
      data.title = quest.title || game.i18n.localize('ForienQuestLog.NewQuest');
      data.status = quest.status || 'hidden';
      data.description = quest.description || '';
      data.gmnotes = quest.gmnotes || '';
      data.image = quest.image || 'actor';
      data.giverName = quest.giverName || 'actor';
      data.giverImgPos = quest.giverImgPos || 'center';
      data.splash = quest.splash || '';
      data.splashPos = quest.splashPos || 'center';
      data.personal = quest.personal || false;
      data.parent = quest.parent || null;
      data.permission = quest.permission || 0;
      data.subquests = quest.subquests || [];
      data.tasks = Array.isArray(quest.tasks) ? quest.tasks.map((task) => new Task(task)) : [];
      data.rewards = Array.isArray(quest.rewards) ? quest.rewards.map((reward) => new Reward(reward)) : [];

      const isGM = game.user.isGM;
      const canPlayerDrag = game.settings.get('forien-quest-log', 'allowPlayersDrag');
      const countHidden = game.settings.get('forien-quest-log', 'countHidden');

      if (data.giver)
      {
         if (data.giver === 'abstract')
         {
            data.data_giver = {
               name: data.giverName,
               img: data.image
            };
         }
         else if (typeof data.giver === 'string')
         {
            const document = await fromUuid(data.giver);
            data.data_giver = {};

            if (document !== null)
            {
               switch (document.documentName)
               {
                  case Actor.documentName:
                  {
                     const actorImage = document.img;
                     const tokenImage = document?.data?.token?.img;
                     const hasTokenImg = typeof tokenImage === 'string' && tokenImage !== actorImage;

                     data.data_giver = {
                        name: document.name,
                        img: quest.image !== 'actor' && hasTokenImg ? tokenImage : actorImage,
                        hasTokenImg
                     };
                     break;
                  }

                  case Item.documentName:
                     data.data_giver = {
                        name: document.name,
                        img: document.img,
                        hasTokenImg: false
                     };
                     break;

                  case JournalEntry.documentName:
                     data.data_giver = {
                        name: document.name,
                        img: document.data.img,
                        hasTokenImg: false
                     };
                     break;

                  default:
                     data.data_giver = {};
               }
            }
         }
      }

      data.isSubquest = false;
      if (data.parent !== null)
      {
         data.isSubquest = true;

         const parentData = Quest.get(data.parent);
         data.data_parent = {
            id: data.parent,
            giver: parentData.giver,
            title: parentData.title,
            status: parentData.status
         };
      }
      else
      {
         data.data_parent = {};
      }

      data.statusLabel = game.i18n.localize(`ForienQuestLog.QuestTypes.Labels.${data.status}`);

      if (countHidden)
      {
         data.checkedTasks = data.tasks.filter((t) => t.completed).length;
         data.totalTasks = data.tasks.length;
      }
      else
      {
         data.checkedTasks = data.tasks.filter((t) => t.hidden === false && t.completed).length;
         data.totalTasks = data.tasks.filter((t) => t.hidden === false).length;
      }

      data.data_tasks = data.tasks.map((t) =>
      {
         const task = new Task(t);
         task.name = TextEditor.enrichHTML(task.name);
         return task;
      });

      if (data.rewards === undefined)
      {
         data.data_rewards = [];
      }

      data.data_rewards = data.rewards.map((item) =>
      {
         return {
            id: item.id,
            name: item.data.name,
            img: item.data.img,
            type: item.type.toLowerCase(),
            hidden: item.hidden,
            draggable: ((isGM || canPlayerDrag) && item.type !== 'abstract'),
            transfer: JSON.stringify(item.data)
         };
      });

      data.data_subquest = [];

      if (data.subquests !== void 0)
      {
         for (const questId of data.subquests)
         {
            const subData = Quest.get(questId);
            if (subData)
            {
               data.data_subquest.push({
                  id: questId,
                  giver: subData.giver,
                  name: subData.title, title:
                  subData.title,
                  status: subData.status
               });
            }
         }
      }

      if (quest.entry)
      {
         data.playerEdit = Object.values(quest.entry.data.permission).some((p) => p === 3);
      }

      if (!(isGM || data.playerEdit))
      {
         data.description = TextEditor.enrichHTML(data.description);
         data.data_tasks = data.data_tasks.filter((t) => t.hidden === false);
         data.data_rewards = data.data_rewards.filter((r) => r.hidden === false);
      }

      if (quest.entry)
      {
         if (isGM && data.personal)
         {
            const users = [`${game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestVisibleFor')}:`];

            for (const perm in quest.entry.data.permission)
            {
               if (perm === 'default')
               {
                  continue;
               }
               if (quest.entry.data.permission[perm] >= 2)
               {
                  const user = game.users.get(perm);
                  if (!user)
                  {
                     console.log(`Forien Quest Log | Dropping user ${perm} from quest ${quest.entry?.name} as it no longer exists`);
                     return;
                  }
                  users.push(user.name);
               }
            }

            if (users.length > 1)
            {
               data.users = users.join('\r');
            }
            else
            {
               data.users = game.i18n.localize('ForienQuestLog.Tooltips.PersonalQuestButNoPlayers');
            }
         }
      }

      return data;
   }
}
