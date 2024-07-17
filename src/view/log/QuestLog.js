import {
   QuestDB,
   Socket,
   Utils }              from '../../control/index.js';

import {
   FQLContextMenu,
   FQLDialog }          from '../internal/index.js';

import { HandlerLog }   from './HandlerLog.js';

import {
   constants,
   jquery,
   questStatus,
   questStatusI18n,
   questTabIndex,
   settings }           from '../../model/constants.js';

/**
 * Provides the main quest log app which shows the quests separated by status either with bookmark or classic tabs.
 *
 * In {@link QuestLog.getData} the {@link QuestsCollect} data is retrieved from {@link QuestDB.sortCollect} which
 * provides automatic sorting of each quest status category by either {@link SortFunctions.ALPHA} or
 * {@link SortFunctions.DATE_END} for status categories {@link questStatus.completed} and {@link questStatus.failed}.
 * Several module settings and whether the current user is a GM is also passed back as data to be used in rendering the
 * {@link Handlebars} template.
 *
 * {@link JQuery} control callbacks are setup in {@link QuestLog.activateListeners} and are located in a separate static
 * control class {@link HandlerLog}.
 */
export class QuestLog extends Application
{
   /**
    * @inheritDoc
    * @see https://foundryvtt.com/api/classes/client.Application.html
    */
   constructor(options = {})
   {
      super(options);
   }

   /**
    * Default Application options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/classes/client.Application.html#options
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
         tabs: [{ navSelector: '.log-tabs', contentSelector: '.log-body', initial: 'active' }]
      });
   }

   /**
    * Specify the set of config buttons which should appear in the Application header. Buttons should be returned as an
    * Array of objects.
    *
    * Provides an explicit override of Application._getHeaderButtons to add one additional buttons for the app header
    * for showing the quest log to users via {@link Socket.showQuestLog}
    *
    * @returns {ApplicationHeaderButton[]} The app header buttons.
    * @override
    */
   _getHeaderButtons()
   {
      const buttons = super._getHeaderButtons();

      // Share QuestLog w/ remote clients.
      if (game.user.isGM)
      {
         buttons.unshift({
            label: game.i18n.localize('ForienQuestLog.Labels.AppHeader.ShowPlayers'),
            class: 'share-quest',
            icon: 'fas fa-eye',
            onclick: () =>
            {
               Socket.showQuestLog(this._tabs[0].active);
            }
         });
      }

      return buttons;
   }


   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * @param {JQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/classes/client.FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      // Here we use a bit of jQuery to retrieve the background image of .window-content to match the game system
      // background image for the bookmark tabs. This is only done if the module setting is checked which it is by
      // default and the background image actually exists. The fallback is the default parchment image set in the
      // FQL styles.
      const navStyle = game.settings.get(constants.moduleName, settings.navStyle);
      const dynamicBackground = game.settings.get(constants.moduleName, settings.dynamicBookmarkBackground);
      if ('bookmarks' === navStyle && dynamicBackground)
      {
         const windowContent = $('#forien-quest-log .window-content');
         const fqlBookmarkItem = $('#forien-quest-log .item');

         const backImage = windowContent.css('background-image');
         const backBlendMode = windowContent.css('background-blend-mode');
         const backColor = windowContent.css('background-color');

         fqlBookmarkItem.css('background-image', backImage);
         fqlBookmarkItem.css('background-color', backColor);
         fqlBookmarkItem.css('background-blend-mode', backBlendMode);
      }

      html.on(jquery.click, '.new-quest-btn', HandlerLog.questAdd);

      html.on(jquery.click, '.actions.quest-status i.delete', HandlerLog.questDelete);

      // This registers for any element and prevents the circle / slash icon displaying for not being a drag target.
      html.on(jquery.dragenter, (event) => event.preventDefault());

      html.on(jquery.dragstart, '.drag-quest', void 0, HandlerLog.questDragStart);

      html.on(jquery.click, '.open-quest', void 0, HandlerLog.questOpen);

      html.on(jquery.click, '.actions.quest-status i.move', HandlerLog.questStatusSet);

      this.#contextMenu(html);
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
    * Create the context menu. There are two separate context menus for the active / in progress tab and all other tabs.
    *
    * @param {JQuery}   html - JQuery element for this application.
    */
   #contextMenu(html)
   {
      const menuItemCopyLink = {
         name: 'ForienQuestLog.QuestLog.ContextMenu.CopyEntityLink',
         icon: '<i class="fas fa-link"></i>',
         callback: async (menu) =>
         {
            const questId = $(menu)?.closest('.drag-quest')?.data('quest-id');
            const quest = QuestDB.getQuest(questId);

            if (quest && await Utils.copyTextToClipboard(`@JournalEntry[${quest.id}]{${quest.name}}`))
            {
               ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.LinkCopied'));
            }
         }
      };

      /**
       * @type {object[]}
       */
      const menuItemsOther = [menuItemCopyLink];

      /**
       * @type {object[]}
       */
      const menuItemsActive = [menuItemCopyLink];

      if (game.user.isGM)
      {
         const menuItemQuestID = {
            name: 'ForienQuestLog.QuestLog.ContextMenu.CopyQuestID',
            icon: '<i class="fas fa-key"></i>',
            callback: async (menu) =>
            {
               const questId = $(menu)?.closest('.drag-quest')?.data('quest-id');
               const quest = QuestDB.getQuest(questId);

               if (quest && await Utils.copyTextToClipboard(quest.id))
               {
                  ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.QuestIDCopied'));
               }
            }
         };

         menuItemsActive.push(menuItemQuestID);
         menuItemsOther.push(menuItemQuestID);

         menuItemsActive.push({
            name: 'ForienQuestLog.QuestLog.ContextMenu.PrimaryQuest',
            icon: '<i class="fas fa-star"></i>',
            callback: (menu) =>
            {
               const questId = $(menu)?.closest('.drag-quest')?.data('quest-id');
               const quest = QuestDB.getQuest(questId);
               if (quest) { Socket.setQuestPrimary({ quest }); }
            }
         });
      }

      // Must show two different context menus as only the active / in progress tab potentially has the menu option to
      // allow the GM to set the primary quest.
      new FQLContextMenu(html, '.tab:not([data-tab="active"]) .drag-quest', menuItemsOther);
      new FQLContextMenu(html, '.tab[data-tab="active"] .drag-quest', menuItemsActive);
   }

   /**
    * Retrieves the sorted quest collection from the {@link QuestDB.sortCollect} and sets several state parameters for
    * GM / player / trusted player edit along with several module settings: {@link FQLSettings.allowPlayersAccept},
    * {@link FQLSettings.allowPlayersCreate}, {@link FQLSettings.showTasks} and {@link FQLSettings.navStyle}.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/classes/client.FormApplication.html#getData
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
         questStatusI18n,
         quests: QuestDB.sortCollect()
      });
   }

   /**
    * Overrides the internal Application._render method to select the tab if the quest log is rendered with optional:
    * `tabId` data that matches an entry in `constants.questStatus`. This comes into play as when a GM uses the
    * `show to players` button in the app header as not only will the quest log open for players, but the specific tab
    * selected by the GM will show. It is also possible to add `tabId` to the `ForienQuestLog.Open.QuestLog` hook to
    * open a specific tab.
    *
    * @inheritDoc
    */
   async _render(force = false, options = {})
   {
      await super._render(force, options);

      if (this._state === Application.RENDER_STATES.RENDERED && typeof options.tabId === 'string' &&
       options.tabId in questStatus)
      {
         if (options.tabId === questStatus.inactive)
         {
            // Only switch to inactive tab if GM or trusted player w/ edit.
            if (game.user.isGM || Utils.isTrustedPlayerEdit()) { this._tabs[0].activate(options.tabId); }
         }
         else
         {
            this._tabs[0].activate(options.tabId);
         }
      }
   }

   /**
    * Some game systems and custom UI theming modules provide hard overrides on overflow-x / overflow-y styles. Alas, we
    * need to set these for '.window-content' to 'visible' which will cause an issue for very long tables. Thus, we must
    * manually set the table max-heights based on the position / height of the {@link Application}.
    *
    * @param {object}               opts - Optional parameters.
    *
    * @param {number|null}          opts.left - The left offset position in pixels.
    *
    * @param {number|null}          opts.top - The top offset position in pixels.
    *
    * @param {number|null}          opts.width - The application width in pixels.
    *
    * @param {number|string|null}   opts.height - The application height in pixels.
    *
    * @param {number|null}          opts.scale - The application scale as a numeric factor where 1.0 is default.
    *
    * @returns {{left: number, top: number, width: number, height: number, scale:number}}
    * The updated position object for the application containing the new values.
    */
   setPosition(opts)
   {
      const currentPosition = super.setPosition(opts);

      // Retrieve all the table elements.
      const tableElements = $('#forien-quest-log .table');

      // Retrieve the active table.
      const tabIndex = questTabIndex[this?._tabs[0]?.active];
      const table = tableElements[tabIndex];

      if (table)
      {
         const fqlPosition = $('#forien-quest-log')[0].getBoundingClientRect();
         const tablePosition = table.getBoundingClientRect();

         // Manually calculate the max height for the table based on the position of the main window div and table.
         tableElements.css('max-height', `${currentPosition.height - (tablePosition.top - fqlPosition.top + 16)}px`);
      }

      return currentPosition;
   }
}
