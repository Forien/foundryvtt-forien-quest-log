import QuestDB       from '../../control/QuestDB.js';
import Utils         from '../../control/Utils.js';
import FQLDialog     from '../FQLDialog.js';

import HandlerLog    from './HandlerLog.js';

import { constants, questTypesI18n, settings } from '../../model/constants.js';

export default class QuestLog extends Application
{
   constructor(options = {})
   {
      super(options);
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
         isTrustedPlayerEdit: Utils.isTrustedPlayerEdit(),
         canAccept: game.settings.get(constants.moduleName, settings.allowPlayersAccept),
         canCreate: game.settings.get(constants.moduleName, settings.allowPlayersCreate),
         showTasks: game.settings.get(constants.moduleName, settings.showTasks),
         style: game.settings.get(constants.moduleName, settings.navStyle),
         questTypesI18n,
         quests
      });
   }
}
