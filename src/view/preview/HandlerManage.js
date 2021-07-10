import QuestDB                from '../../control/QuestDB.js';
import Socket                 from '../../control/Socket.js';
import ViewManager            from '../../control/ViewManager.js';
import FQLPermissionControl   from '../FQLPermissionControl.js';

/**
 * Provides all jQuery callbacks for the `management` tab.
 */
export default class HandlerManage
{
   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async addSubquest(quest, questPreview)
   {
      // If a permission control app / dialog is open close it.
      if (questPreview._permControl)
      {
         questPreview._permControl.close();
         questPreview._permControl = void 0;
      }

      if (ViewManager.verifyQuestCanAdd())
      {
         const subquest = await QuestDB.createQuest({ parentId: quest.id });
         ViewManager.questAdded({ quest: subquest });
      }
   }

   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async configurePermissions(quest, questPreview)
   {
      if (quest.entry)
      {
         if (!questPreview._permControl)
         {
            questPreview._permControl = new FQLPermissionControl(quest.entry, {
               top: Math.min(questPreview.position.top, window.innerHeight - 350),
               left: questPreview.position.left + 125
            });

            Hooks.once('closePermissionControl', async (app) =>
            {
               if (app.appId === questPreview._permControl.appId)
               {
                  questPreview._permControl = void 0;

                  // When the permissions change refresh the parent if any, this QuestPreview, and
                  // any subquests.
                  const questId = quest.parent ? [quest.parent, quest.id, ...quest.subquests] :
                   [quest.id, ...quest.subquests];

                  // We must check if the user intentionally or accidentally revoked their own permissions to
                  // at least observe this quest. If so then simply close the QuestPreview and send out a refresh
                  // notice to all clients to render again.
                  if (!quest.isObservable) { await questPreview.close(); }

                  Socket.refreshAll();
                  Socket.refreshQuestPreview({ questId });
               }
            });
         }

         questPreview._permControl.render(true, {
            top: Math.min(questPreview.position.top, window.innerHeight - 350),
            left: questPreview.position.left + 125,
            focus: true
         });
      }
   }

   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async deleteSplashImage(quest, questPreview)
   {
      quest.splash = '';
      return await questPreview.saveQuest();
   }

   /**
    * @param {Event}          event - HTML5 event.
    *
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async setSplashAsIcon(event, quest, questPreview)
   {
      quest.splashAsIcon = $(event.target).is(':checked');
      return await questPreview.saveQuest();
   }

   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async setSplashImage(quest, questPreview)
   {
      const currentPath = quest.splash;
      await new FilePicker({
         type: 'image',
         current: currentPath,
         callback: async (path) =>
         {
            quest.splash = path;
            await questPreview.saveQuest();
         },
      }).browse(currentPath);
   }

   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>} The promise from `saveQuest`.
    */
   static async setSplashPos(quest, questPreview)
   {
      if (quest.splashPos === 'center')
      {
         quest.splashPos = 'top';
      }
      else
      {
         quest.splashPos = quest.splashPos === 'top' ? 'bottom' : 'center';
      }

      return await questPreview.saveQuest();
   }
}