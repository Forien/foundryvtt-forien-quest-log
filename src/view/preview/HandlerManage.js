import {
   QuestDB,
   ViewManager }                       from '../../control/index.js';

import { FQLDocumentOwnershipConfig }  from '../internal/index.js';

/**
 * Provides all {@link JQuery} callbacks for the `management` tab.
 */
export class HandlerManage
{
   /**
    * @private
    */
   constructor()
   {
      throw new Error('This is a static class that should not be instantiated.');
   }

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
      if (questPreview._ownershipControl)
      {
         questPreview._ownershipControl.close();
         questPreview._ownershipControl = void 0;
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
         if (!questPreview._ownershipControl)
         {
            questPreview._ownershipControl = new FQLDocumentOwnershipConfig(quest.entry, {
               top: Math.min(questPreview.position.top, window.innerHeight - 350),
               left: questPreview.position.left + 125
            }).render(true, { focus: true });
         }

         questPreview._ownershipControl.render(true, {
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