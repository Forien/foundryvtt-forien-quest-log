import QuestDB       from '../../control/QuestDB.js';
import Utils         from '../../control/Utils.js';
import FQLDialog     from '../FQLDialog.js';

import HandlerLog    from './HandlerLog.js';

import { constants, questTypesI18n, settings } from '../../model/constants.js';

/**
 * Provides the main quest log app which shows the quests separated by status either with bookmark or classic tabs.
 */
export default class QuestLog extends Application
{
   /**
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html
    */
   constructor(options = {})
   {
      super(options);
   }

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions()
   {
      return foundry.utils.mergeObject(super.defaultOptions, {
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
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * @param {jQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
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

      html.on('click', '.new-quest-btn', HandlerLog.questAdd);

      html.on('click', '.actions.quest-status i.delete', HandlerLog.questDelete);

      html.on('dragstart', '.drag-quest', HandlerLog.questDragStart);

      html.on('click', '.title', HandlerLog.questOpen);

      html.on('click', '.actions.quest-status i.move', HandlerLog.questStatusSet);
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
    * Retrieves the sorted quest collection from the {@link QuestDB.sortCollect} and sets several state parameters for
    * GM / player / trusted player edit along with several module settings: {@link settings.allowPlayersAccept},
    * {@link settings.allowPlayersCreate}, {@link settings.showTasks} and {@link settings.navStyle}.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#getData
    */
   async getData(options = {})
   {
      return foundry.utils.mergeObject(super.getData(), {
         options,
         isGM: game.user.isGM,
         isPlayer: !game.user.isGM,
         isTrustedPlayerEdit: Utils.isTrustedPlayerEdit(),
         canAccept: game.settings.get(constants.moduleName, settings.allowPlayersAccept),
         canCreate: game.settings.get(constants.moduleName, settings.allowPlayersCreate),
         showTasks: game.settings.get(constants.moduleName, settings.showTasks),
         style: game.settings.get(constants.moduleName, settings.navStyle),
         questTypesI18n,
         quests: QuestDB.sortCollect()
      });
   }
}
