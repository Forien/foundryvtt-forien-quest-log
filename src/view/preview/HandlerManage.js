import QuestDB                from '../../control/QuestDB.js';
import ViewManager            from '../../control/ViewManager.js';
import FQLPermissionControl   from '../FQLPermissionControl.js';

/**
 * Provides all {@link JQuery} callbacks for the `management` tab.
 */
export default class HandlerManage
{
   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>}
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
    * @returns {Promise<void>}
    */
   static async configurePermissions(quest, questPreview)
   {
      if (quest.entry)
      {
         if (!questPreview._permControl)
         {
            questPreview._permControl = await FQLPermissionControl.create(quest.entry, {
               top: Math.min(questPreview.position.top, window.innerHeight - 350),
               left: questPreview.position.left + 125
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
    * @returns {Promise<void>}
    */
   static async deleteSplashImage(quest, questPreview)
   {
      quest.splash = '';
      await questPreview.saveQuest();
   }

   /**
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    *
    * @param {Quest}             quest - The current quest being manipulated.
    *
    * @param {QuestPreview}      questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>}
    */
   static async setSplashAsIcon(event, quest, questPreview)
   {
      quest.splashAsIcon = $(event.target).is(':checked');
      await questPreview.saveQuest();
   }

   /**
    * @param {Quest}          quest - The current quest being manipulated.
    *
    * @param {QuestPreview}   questPreview - The QuestPreview being manipulated.
    *
    * @returns {Promise<void>}
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
    * @returns {Promise<void>}
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

      await questPreview.saveQuest();
   }
}