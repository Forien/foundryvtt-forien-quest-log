import QuestAPI      from '../control/public/QuestAPI.js';
import QuestDB       from '../control/QuestDB.js';
import Socket        from '../control/Socket.js';
import Utils         from '../control/Utils.js';

import { constants, jquery, questStatus, settings } from '../model/constants.js';

/**
 * Provides the quest tracker which provides an overview of active quests and objectives which can be opened / closed
 * to show all objectives for a given quest. The folder / open state is stored in {@link sessionStorage}.
 *
 * In the {@link QuestTracker.getData} method {@link QuestTracker.prepareQuests} is invoked which gets all sorted
 * {@link questStatus.active} via {@link QuestDB.sortCollect}. They are then mapped creating the specific data which is
 * used in the {@link Handlebars} template. In the future this may be cached in a similar way that {@link Quest} data
 * is cached for {@link QuestLog}.
 */
export default class QuestTracker extends Application
{
   /**
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html
    */
   constructor(options = {})
   {
      super(options);

      // TODO: This needs to be tested for proper defaults.
      this.position = game.settings.get(constants.moduleName, settings.questTrackerPosition);
   }

   /**
    * Default {@link Application} options
    *
    * @returns {object} options - Application options.
    * @see https://foundryvtt.com/api/Application.html#options
    */
   static get defaultOptions()
   {
      return foundry.utils.mergeObject(super.defaultOptions, {
         id: 'quest-tracker',
         template: 'modules/forien-quest-log/templates/quest-tracker.html',
         minimizable: false,
         resizable: true,
         popOut: false,
         width: 300,
         height: 480,
         title: game.i18n.localize('ForienQuestLog.QuestTracker.Title')
      });
   }

   /**
    * Defines all {@link JQuery} control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * @param {JQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      // Make the window draggable
      const header = html.find('header')[0];
      new Draggable(this, html, header, this.options.resizable);

      html.on(jquery.click, '.header-button.close', void 0, this.close);

      Utils.createJQueryDblClick({
         selector: '#quest-tracker .quest-tracker-header',
         singleCallback: this._handleQuestClick.bind(this),
         doubleCallback: this._handleQuestOpen,
      });

      html.on(jquery.click, '.quest-tracker-link', void 0, this._handleQuestOpen);
      html.on(jquery.click, '.quest-tracker-task', void 0, this._handleQuestTask.bind(this));

      /**
       * @type {JQuery} The QuestTracker app element.
       *
       * @private
       */
      this._elemQuestTracker = $('#quest-tracker.fql-app');

      /**
       * @type {JQuery} The window header element.
       *
       * @private
       */
      this._elemWindowHeader = $('#quest-tracker .fql-window-header');

      /**
       * @type {JQuery} The window content element.
       *
       * @private
       */
      this._elemWindowContent = $('#quest-tracker .fql-window-content');

      /**
       * @type {JQuery} The window resize handle.
       *
       * @private
       */
      this._elemResizeHandle = $('#quest-tracker .window-resizable-handle');

      /**
       * Stores the app / window extents from styles.
       *
       * @type {{minHeight: number, maxHeight: number, minWidth: number, maxWidth: number}}
       *
       * @private
       */
      this._appExtents = {
         minWidth: parseInt(this._elemQuestTracker.css('min-width')),
         maxWidth: parseInt(this._elemQuestTracker.css('max-width')),
         minHeight: parseInt(this._elemQuestTracker.css('min-height')),
         maxHeight: parseInt(this._elemQuestTracker.css('max-height'))
      };

      this._windowMode = game.settings.get(constants.moduleName, settings.windowModeQuestTracker);
      if (this._windowMode !== 'auto' && this._windowMode !== 'resize') { this._windowMode = 'auto'; }

      switch (this._windowMode)
      {
         case 'auto':
            this._elemResizeHandle.hide();
            this._elemQuestTracker.css('min-height', '50px');

            // A bit of a hack. We need to call the Application setPosition now to make sure the element parameters
            // are correctly set as the exact height for the element is calculated in this.setPosition which is called
            // by Application right after this method completes.
            // Must set popOut temporarily to true as there is a gate in `Application.setPosition`.
            this.options.popOut = true;
            super.setPosition(this.position);
            this.options.popOut = false;
            break;

         case 'resize':
            this._elemResizeHandle.show();
            this._elemQuestTracker.css('min-height', '150px');
            break;
      }

      /**
       * Stores whether the scroll bar is active.
       *
       * @type {boolean}
       *
       * @private
       */
      this._scrollbarActive = this._elemWindowContent[0].scrollHeight > this._elemWindowContent[0].clientHeight;

      // Set current scrollbar active state and potentially set 'point-events' to 'auto'.
      if (this._scrollbarActive) { this._elemQuestTracker.css('pointer-events', 'auto'); }
   }

   /**
    * Override default Application `bringToTop` to stop adjustment of z-index.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html#bringToTop
    */
   bringToTop() {}

   /**
    * Sets `enableQuestTracker` to false.
    *
    * @param {object}   [options] - Optional parameters.
    *
    * @param {boolean}  [options.updateSetting=true] - If true then {@link settings.enableQuestTracker} is set to false.
    *
    * @returns {Promise<void>}
    */
   async close({ updateSetting = true } = {})
   {
      await super.close();

      if (updateSetting)
      {
         await game.settings.set(constants.moduleName, settings.enableQuestTracker, false);
      }
   }

   /**
    * Parses quest data in {@link QuestTracker.prepareQuests}.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#getData
    */
   async getData(options = {})
   {
      return foundry.utils.mergeObject(super.getData(options), {
         title: this.options.title,
         headerButtons: this._getHeaderButtons(),
         quests: await this.prepareQuests()
      });
   }

   /**
    * Data for the quest folder open / close state is saved in {@link sessionStorage}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    */
   _handleQuestClick(event)
   {
      const questId = event.currentTarget.dataset.questId;

      const questEntry = QuestDB.getQuestEntry(questId);
      if (questEntry && questEntry.enrich.hasObjectives)
      {
         const folderState = sessionStorage.getItem(`${constants.folderState}${questId}`);
         const collapsed = folderState !== 'false';
         sessionStorage.setItem(`${constants.folderState}${questId}`, (!collapsed).toString());

         this.render();
      }
   }

   /**
    * Handles the quest open click via {@link QuestAPI.open}.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    */
   _handleQuestOpen(event)
   {
      const questId = event.currentTarget.dataset.questId;
      QuestAPI.open({ questId });
   }

   /**
    * Handles toggling {@link Quest} tasks when clicked on by a user that is the GM or owner of quest.
    *
    * @param {JQuery.ClickEvent} event - JQuery.ClickEvent
    */
   async _handleQuestTask(event)
   {
      // Don't handle any clicks of internal anchor elements such as entity content links.
      if ($(event.target).is('.quest-tracker-task a')) { return; }

      const questId = event.currentTarget.dataset.questId;
      const uuidv4 = event.currentTarget.dataset.uuidv4;

      const quest = QuestDB.getQuest(questId);

      if (quest)
      {
         const task = quest.getTask(uuidv4);
         if (task)
         {
            task.toggle();
            await quest.save();

            Socket.refreshQuestPreview({
               questId,
               focus: false
            });
         }
      }
   }

   /**
    * Prepares the quest data from sorted active quests.
    *
    * @returns {Promise<object[]>} Sorted active quests.
    */
   async prepareQuests()
   {
      return QuestDB.sortCollect({ status: questStatus.active }).map((entry) =>
      {
         const q = entry.enrich;
         const collapsed = sessionStorage.getItem(`${constants.folderState}${q.id}`) === 'false';

         const tasks = collapsed ? q.data_tasks : [];
         const subquests = collapsed ? q.data_subquest : [];

         return {
            id: q.id,
            canEdit: game.user.isGM || (entry.isOwner && Utils.isTrustedPlayerEdit()),
            playerEdit: entry.isOwner,
            source: q.giver,
            name: q.name,
            isGM: game.user.isGM,
            isHidden: q.isHidden,
            isInactive: q.isInactive,
            isPersonal: q.isPersonal,
            personalActors: q.personalActors,
            hasObjectives: q.hasObjectives,
            subquests,
            tasks
         };
      });
   }

   /**
    * Some game systems and custom UI theming modules provide hard overrides on overflow-x / overflow-y styles. Alas we
    * need to set these for '.window-content' to 'visible' which will cause an issue for very long tables. Thus we must
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
      // Pin width / height to min / max styles if defined.
      if (opts && opts.width && opts.height)
      {
         if (opts.width < this._appExtents.minWidth) { opts.width = this._appExtents.minWidth; }
         if (opts.width > this._appExtents.maxWidth) { opts.width = this._appExtents.maxWidth; }
         if (opts.height < this._appExtents.minHeight) { opts.height = this._appExtents.minHeight; }
         if (opts.height > this._appExtents.maxHeight) { opts.height = this._appExtents.maxHeight; }

         if (this._windowMode === 'auto')
         {
            // Add the extra `1` for small format (1080P and below screen size).
            opts.height = this._elemWindowHeader[0].scrollHeight + this._elemWindowContent[0].scrollHeight + 1;
         }
      }

      // Must set popOut temporarily to true as there is a gate in `Application.setPosition`.
      this.options.popOut = true;
      const currentPosition = super.setPosition(opts);
      this.options.popOut = false;

      const scrollbarActive = this._elemWindowContent[0].scrollHeight > this._elemWindowContent[0].clientHeight;

      if (scrollbarActive !== this._scrollbarActive)
      {
         this._scrollbarActive = scrollbarActive;
         this._elemQuestTracker.css('pointer-events', scrollbarActive ? 'auto' : 'none');
      }

      if (currentPosition && currentPosition.width && currentPosition.height)
      {
         if (_timeoutPosition)
         {
            clearTimeout(_timeoutPosition);
         }

         _timeoutPosition = setTimeout(() =>
         {
            game.settings.set(constants.moduleName, settings.questTrackerPosition, JSON.stringify(currentPosition));
         }, s_TIMEOUT_POSITION);
      }

      return currentPosition;
   }
}

/**
 * Defines the timeout length to gate saving position to settings.
 *
 * @type {number}
 */
const s_TIMEOUT_POSITION = 1000;

/**
 * Stores the last call to setTimeout for {@link QuestTracker.setPosition} changes, so that they can be cancelled as
 * new updates arrive gating the calls to saving position to settings.
 *
 * @type {number}
 * @private
 */
let _timeoutPosition = void 0;