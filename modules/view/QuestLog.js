import FQLDialog     from './FQLDialog.js';
import QuestAPI      from '../control/QuestAPI.js';
import QuestDB       from '../control/QuestDB.js';
import Socket        from '../control/Socket.js';
import Utils         from '../control/Utils.js';
import ViewManager   from '../control/ViewManager.js';

import { constants, questTypesI18n, settings } from '../model/constants.js';

export default class QuestLog extends Application
{
   constructor(options = {})
   {
      super(options);

      this._addQuestPreviewId = void 0;
   }

   /**
    * Default Application options
    *
    * @returns {object}
    */
   static get defaultOptions()
   {
      return mergeObject(super.defaultOptions, {
         id: constants.moduleName,
         classes: [constants.moduleName],
         template: 'modules/forien-quest-log/templates/quest-log.html',
         width: 700,
         height: 480,
         minimizable: true,
         resizable: true,
         title: game.i18n.localize('ForienQuestLog.QuestLog.Title'),
         tabs: [{ navSelector: '.log-tabs', contentSelector: '.log-body', initial: 'progress' }]
      });
   }

   /**
    * Defines all event listeners like click, drag, drop etc.
    *
    * @param html
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      // Here we use a bit of jQuery to retrieve the background image of .window-content to match the game system
      // background image for the bookmark tabs. This is only done if the module setting is checked which it is by
      // default and the background image actually exists. The fallback is the default parchment image set in the
      // FQL styles.
      const dynamicBackground = game.settings.get(constants.moduleName, settings.dynamicBookmarkBackground);
      if (dynamicBackground)
      {
         const backImage = $('.window-app .window-content').css('background-image');
         const actualBackImage = backImage.split(/"/)[1];

         if (backImage !== 'none' && actualBackImage !== void 0)
         {
            $('#forien-quest-log .item').css('background-image', `url(${actualBackImage})`);
         }
      }

      html.on('click', '.new-quest-btn', async () =>
      {
         if (this._addQuestPreviewId !== void 0)
         {
            const qPreview = ViewManager.questPreview[this._addQuestPreviewId];
            if (qPreview && qPreview.rendered) { qPreview.bringToTop(); }
            return;
         }

         const quest = await Utils.createQuest({ notify: true });
         if (quest.isObservable)
         {
            this._addQuestPreviewId = quest.id;

            const questSheet = quest.sheet;
            questSheet.render(true, { focus: true });
            Hooks.once('closeQuestPreview', (questPreview) =>
            {
               if (this._addQuestPreviewId === questPreview.quest.id)
               {
                  this._addQuestPreviewId = void 0;
               }
            });
         }

         // if (this._questForm && this._questForm.rendered)
         // {
         //    this._questForm.bringToTop();
         // }
         // else
         // {
         //    this._questForm = new QuestForm().render(true);
         // }
      });

      html.on('click', '.actions.quest-status i', async (event) =>
      {
         const target = $(event.target).data('target');
         const questId = $(event.target).data('quest-id');
         const name = $(event.target).data('quest-name');

         const classList = $(event.target).attr('class');
         if (classList.includes('move'))
         {
            const quest = QuestDB.getQuest(questId);
            if (quest)
            {
               await Socket.moveQuest({ quest, target });
            }
         }
         else if (classList.includes('delete'))
         {
            const result = await FQLDialog.confirmDeleteQuest({ name, result: questId, questId, isQuestLog: true });
            if (result)
            {
               const quest = QuestDB.getQuest(result);
               if (quest) { await Socket.deletedQuest(await quest.delete()); }
            }
         }
      });

      html.on('click', '.title', (event) =>
      {
         const questId = $(event.target).closest('.title').data('quest-id');
         QuestAPI.open({ questId });
      });

      html.on('dragstart', '.drag-quest', (event) =>
      {
         const dataTransfer = {
            type: 'Quest',
            id: $(event.target).data('quest-id')
         };
         event.originalEvent.dataTransfer.setData('text/plain', JSON.stringify(dataTransfer));

      });
   }

   /**
    * Handle closing any confirm delete quest dialog attached to QuestLog.
    *
    * @override
    * @inheritDoc
    */
   async close(options)
   {
      FQLDialog.closeDialogs({ isQuestLog: true });
      return super.close(options);
   }

   /**
    * Retrieves Data to be used in rendering template.
    *
    * @param options
    *
    * @returns {Promise<Object>}
    */
   async getData(options = {})
   {
      const quests = QuestDB.sorted();

      return mergeObject(super.getData(), {
         options,
         isGM: game.user.isGM,
         isPlayer: !game.user.isGM,
         isTrustedPlayer: Utils.isTrustedPlayer(),
         canAccept: game.settings.get(constants.moduleName, settings.allowPlayersAccept),
         canCreate: game.settings.get(constants.moduleName, settings.allowPlayersCreate),
         showTasks: game.settings.get(constants.moduleName, settings.showTasks),
         style: game.settings.get(constants.moduleName, settings.navStyle),
         questTypesI18n,
         quests
      });
   }
}
