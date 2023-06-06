import FQLDialog              from '../FQLDialog.js';
import QuestDB                from '../../control/QuestDB.js';
import Socket                 from '../../control/Socket.js';
import TinyMCE                from '../../control/TinyMCE.js';
import Utils                  from '../../control/Utils.js';

import HandlerAny             from './HandlerAny.js';
import HandlerDetails         from './HandlerDetails.js';
import HandlerManage          from './HandlerManage.js';

import { FVTTCompat }          from '../../FVTTCompat.js';

import { constants, jquery, settings }  from '../../model/constants.js';

/**
 * QuestPreview is the main app / window of FQL for modifying individual Quest data. It appears reactive, but every
 * single time a data value is manipulated in the quest it is saved and this app renders again. There are many cases
 * when parent and subquests of the current quest also requires those QuestPreviews if visible and the {@link QuestLog}
 * to be rendered again. Additionally, for remote clients socket events are broadcast to all users logged in to Foundry
 * in the same world. This is facilitated through {@link Socket} which controls local rendering and remote rendering.
 * In the future it will be possible to reduce reliance on {@link Socket} as the {@link QuestDB} has many lifecycle
 * hooks, {@link QuestDBHooks} which can replace manual control aspects found in {@link Socket}.
 *
 * QuestPreview is the {@link Quest} sheet in Foundry parlance. In {@link FQLHooks.foundryInit} QuestPreview is set as
 * the Quest sheet. All Quests are opened through this reference in Quest which is accessible by {@link Quest.sheet}
 *
 * The main source of QuestPreview creation is through {@link QuestAPI.open}. Both Socket, QuestLog and external
 * API usage invokes `QuestAPI.open`. The constructor of QuestPreview requires a Quest and passes on options to t
 * the FormApplication.
 *
 * The {@link JQuery} control handling of callbacks is facilitated through three separate static control classes and
 * are setup in {@link QuestPreview.activateListeners}. Two of the control classes {@link HandlerDetails} and
 * {@link HandlerManage} contain {@link JQuery} callbacks specific to the `details` and `management` tabs visible for GM
 * users and trusted players with ownership permissions when the module setting {@link FQLSettings.trustedPlayerEdit} is
 * enabled. {@link HandlerAny} contains callbacks utilized across both `details` and `management` tabs particularly
 * around handling the action icons for manipulating the quest tasks.
 *
 * In {@link QuestPreview.getData} the cached {@link EnrichData} from {@link QuestDB} of the associated {@link Quest}
 * is used in rendering the {@link Handlebars} template.
 *
 * It is worth noting that all internal array data such as tasks and rewards from {@link Quest} a separate
 * `UUIDv4` identifier which provides a unique ID for each {@link Task} and {@link Reward}. Tasks and Rewards that are
 * manipulated in Quest use this UUIDv4 value passed through the template via the enriched data of a quest. As part of
 * the caching process of {@link QuestDB} {@link QuestEntry} instances are stored with both the Quest and enriched data
 * from {@link Enrich.quest}.
 *
 * In {@link QuestPreview.getData} several local variables are set that are utilized both in the Handlebars template
 * rendering process and in {@link QuestPreview.activateListeners} to assign certain capabilities that are accessible
 * to the user. The GM and trusted players with edit capabilities have full access to editing all parameters of a quest
 * except no players have access to the GM notes tab which is for private notes for the GM only.
 *
 * The general control of Foundry when {@link https://foundryvtt.com/api/Application.html#render} is invoked goes as
 * follows:
 * - {@link QuestPreview.getData} prepares all data for the Handlebars template and sets the local user tracking
 * variables.
 *
 * - {@link QuestPreview.activateListeners} Receives a jQuery element for the window content of the app and is where
 * all the control callbacks are registered.
 *
 * In the handler callbacks for the delete action for quests, tasks, & rewards a special semi-modal dialog is invoked
 * via {@link FQLDialog}. A single instance of it is rendered and reused across all delete actions. Please refer to the
 * documentation.
 *
 * {@link ViewManager} responds to `closeQuestPreview` and `renderQuestPreview` tracking the opened QuestPreview
 * instances.
 *
 * @see {@link HandlerAny}
 * @see {@link HandlerDetails}
 * @see {@link HandlerManage}
 */
export default class QuestPreview extends FormApplication
{
   /**
    * Constructs a QuestPreview instance with a Quest and passes on options to FormApplication.
    *
    * @param {Quest}   quest - The quest to preview / edit.
    *
    * @param {object}   options - The FormApplication options.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#options
    */
   constructor(quest, options = {})
   {
      super(void 0, options);

      /**
       * Stores the quest being displayed / edited.
       *
       * @type {Quest}
       * @private
       */
      this._quest = quest;

      // Set the title of the FormApplication with the quest name.
      this.options.title = game.i18n.format('ForienQuestLog.QuestPreview.Title', this._quest);

      /**
       * Set in `getData`. Determines if the player can accept quests which for non-GM / trusted players w/ edit allows
       * a minimal set of options to set quests as `available` or `active`.
       *
       * @type {boolean}
       * @package
       *
       * @see {@link QuestPreview.getData}
       */
      this.canAccept = false;

      /**
       * Set in `getData`. Determines if the current user can fully edit the Quest; a GM or trusted player w/ edit.
       *
       * @type {boolean}
       * @package
       *
       * @see {@link QuestPreview.getData}
       */
      this.canEdit = false;

      /**
       * Set in `getData`. Determines if the player has ownership of the quest and thereby limited editing capabilities.
       *
       * @type {boolean}
       * @package
       *
       * @see {@link QuestPreview.getData}
       */
      this.playerEdit = false;

      /**
       * Store the input focus callback in the associated QuestPreview instance so that it can be invoked if the app is
       * closed in {@link QuestPreview.close} while the input field is focused / being edited allowing any edits to be
       * saved. Otherwise the callback is invoked as part of the input focus out event in the jQuery handler. Please
       * see the associated jQuery callback methods in {@link HandlerDetails} linked below.
       *
       * @param {JQuery.FocusOutEvent|void}  event - JQuery.FocusOutEvent
       *
       * @param {object}      [saveOptions] - Options to pass to `saveQuest`; used in {@link QuestPreview.close}.
       *
       * @returns {Promise<void>}
       *
       * @type {Function}
       * @package
       *
       * @see {@link HandlerDetails.questEditName}
       * @see {@link HandlerDetails.questGiverCustomEditName}
       * @see {@link HandlerDetails.rewardAbstractEditName}
       * @see {@link HandlerDetails.taskEditName}
       */
      this._activeFocusOutFunction = void 0;

      /**
       * Tracks all opened sheets whether quest giver actor sheet or reward items. Close all sheets when QuestPreview
       * closes.
       *
       * @type {number[]}
       * @package
       */
      this._openedAppIds = [];

      /**
       * Tracks any open FQLPermissionControl dialog that can be opened from the management tab, so that it can be
       * closed if this QuestPreview is closed or the tab is changed.
       *
       * @type {FQLDocumentOwnershipConfig}
       * @package
       *
       * @see {@link HandlerManage.configurePermissions}
       * @see {@link QuestPreview.close}
       */
      this._ownershipControl = void 0;

      /**
       * Stores a single instance of the ImagePopup for the abstract reward image opened in
       * {@link HandlerDetails.rewardShowImagePopout} preventing multiple copies of reward images from being opened
       * at the same time. If open this ImagePopup is also closed when this QuestPreview closes in
       * {@link QuestPreview.close}.
       *
       * @type {ImagePopout}
       * @package
       *
       * @see {@link https://foundryvtt.com/api/ImagePopout.html}
       */
      this._rewardImagePopup = void 0;

      /**
       * Stores a single instance of the ImagePopup for the splash image opened in
       * {@link HandlerDetails.splashImagePopupShow} preventing multiple copies of the splash image from being opened
       * at the same time. If open this ImagePopup is also closed when this QuestPreview closes in
       * {@link QuestPreview.close}.
       *
       * @type {ImagePopout}
       * @package
       *
       * @see {@link https://foundryvtt.com/api/ImagePopout.html}
       */
      this._splashImagePopup = void 0;
   }

   /**
    * Default Application options
    *
    * @returns {object} options - FormApplication options.
    * @see https://foundryvtt.com/api/FormApplication.html#options
    */
   static get defaultOptions()
   {
      // TinyMCE editor Handlebars helper has changed. Load different templates for v10 or v9
      const template = FVTTCompat.isV10 ? 'modules/forien-quest-log/templates/quest-preview-v10.html' :
       'modules/forien-quest-log/templates/quest-preview-v9.html';

      return foundry.utils.mergeObject(super.defaultOptions, {
         classes: ['forien-quest-preview'],
         template,
         width: 1000,
         height: 640,
         minimizable: true,
         resizable: true,
         submitOnChange: false,
         submitOnClose: false,
         title: game.i18n.localize('ForienQuestLog.QuestPreview.Title'),
         tabs: [{ navSelector: '.quest-tabs', contentSelector: '.quest-body', initial: 'details' }]
      });
   }

   /**
    * Returns the CSS application ID which uniquely references this UI element.
    *
    * @returns {string} The CSS app ID.
    * @override
    */
   get id()
   {
      return `quest-${this._quest.id}`;
   }

   /**
    * Returns the associated Quest as the FormApplication target object.
    *
    * @returns {Quest} The FormApplication target object.
    * @override
    */
   get object()
   {
      return this._quest;
   }

   /**
    * Prevent setting of the FormApplication target object.
    *
    * @param {object}   value - Ignored
    *
    * @override
    */
   set object(value) {}

   /**
    * Specify the set of config buttons which should appear in the Application header. Buttons should be returned as an
    * Array of objects.
    *
    * Provides an explicit override of Application._getHeaderButtons to add three additional buttons for the app header
    * including copying the content link for the Quest, showing the quest to users via {@link Socket.showQuestPreview}
    * and showing the splash image popup.
    *
    * @returns {ApplicationHeaderButton[]} The app header buttons.
    * @override
    */
   _getHeaderButtons()
   {
      const buttons = super._getHeaderButtons();

      // Share QuestPreview w/ remote clients.
      if (game.user.isGM)
      {
         buttons.unshift({
            label: game.i18n.localize('ForienQuestLog.Labels.AppHeader.ShowPlayers'),
            class: 'share-quest',
            icon: 'fas fa-eye',
            onclick: () => Socket.showQuestPreview(this._quest.id)
         });
      }

      // Show splash image popup if splash image is defined.
      if (this._quest.splash.length)
      {
         buttons.unshift({
            label: '',
            class: 'splash-image',
            icon: 'far fa-image',
            onclick: async () =>
            {
               // Only show popup if a splash image is defined.
               if (this._quest.splash.length)
               {
                  await HandlerDetails.splashImagePopupShow(this._quest, this);
               }
            }
         });
      }

      // Copy quest content link.
      buttons.unshift({
         label: '',
         class: 'copy-link',
         icon: 'fas fa-link',
         onclick: async () =>
         {
            if (await Utils.copyTextToClipboard(`@JournalEntry[${this._quest.id}]{${this._quest.name}}`))
            {
               ui.notifications.info(game.i18n.format('ForienQuestLog.Notifications.LinkCopied'));
            }
         }
      });

      return buttons;
   }

   /**
    * Close any tracked permission control app / dialog when tabs change.
    *
    * @private
    * @inheritDoc
    */
   _onChangeTab(event, tabs, active)
   {
      if (this._ownershipControl)
      {
         this._ownershipControl.close();
         this._ownershipControl = void 0;
      }

      super._onChangeTab(event, tabs, active);
   }

   /**
    * This might be a FormApplication, but we don't want the submit event to fire.
    *
    * @private
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#_onSubmit
    */
   async _onSubmit(event, options) // eslint-disable-line
   {
      event.preventDefault();
      return false;
   }

   /**
    * This method is called upon form submission after form data is validated. The default _updateObject workflow
    * is prevented.
    *
    * @override
    * @private
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#_updateObject
    */
   async _updateObject(event, formData) // eslint-disable-line no-unused-vars
   {
      event.preventDefault();
   }

   /**
    * Returns the associated {@link Quest}
    *
    * @returns {Quest} Associated Quest.
    */
   get quest() { return this._quest; }

   /**
    * Provide TinyMCE overrides when an editor is activated. The overrides are important to provide custom options to
    * configure TinyMCE. There are various other content plugins enabled in the custom options and the ability to
    * respond to the `esc` key to quit editing.
    *
    * @override
    * @see {@link Utils.tinyMCEOptions}
    * @see https://foundryvtt.com/api/FormApplication.html#activateEditor
    */
   activateEditor(name, options = {}, initialContent = '')
   {
      const tinyMCEOptions = TinyMCE.options({
         editorName: name,
         initialContent,
         questId: this._quest.id
      });

      super.activateEditor(name, Object.assign({}, options, tinyMCEOptions), initialContent);

      // Remove the activate editor button as FQL has a transparent toolbar background. If pressed twice it will create
      // an error.
      if (this.editors[name].button) { this.editors[name].button.remove(); }
   }

   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    * The callbacks are gated by several local variables defined in {@link QuestPreview.getData}.
    *
    * @param {JQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see {@link HandlerAny}
    * @see {@link HandlerDetails}
    * @see {@link HandlerManage}
    * @see {@link QuestPreview.canAccept}
    * @see {@link QuestPreview.canEdit}
    * @see {@link QuestPreview.playerEdit}
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      // Callbacks for any user.

      html.on(jquery.click, '.quest-giver-name .open-actor-sheet', async (event) =>
       await HandlerDetails.questGiverShowActorSheet(event, this));

      // This CSS selector responds to any subquest attached to the details section or subquests listed in objectives.
      html.on(jquery.click, '.quest-name-link', (event) => HandlerAny.questOpen(event));

      // This registers for any element and prevents the circle / slash icon displaying for not being a drag target.
      html.on(jquery.dragenter, (event) => event.preventDefault());

      html.on(jquery.dragstart, '.item-reward .editable-container', async (event) =>
       await HandlerDetails.rewardDragStartItem(event, this._quest));

      html.on(jquery.dragstart, '.quest-rewards .fa-sort', (event) => HandlerDetails.rewardDragStartSort(event));

      html.on(jquery.click, '.abstract-reward .editable-container', async (event) =>
       await HandlerDetails.rewardShowImagePopout(event, this._quest, this));

      html.on(jquery.click, '.item-reward .editable-container', async (event) =>
       await HandlerDetails.rewardShowItemSheet(event, this._quest, this));

      html.on(jquery.click, '.splash-image-link', () => HandlerDetails.splashImagePopupShow(this._quest, this));

      html.on(jquery.dragstart, '.quest-tasks .fa-sort', (event) => HandlerDetails.taskDragStartSort(event));

      // Callbacks for GM, trusted player edit, and players with ownership
      if (this.canEdit || this.playerEdit)
      {
         html.on(jquery.click, '.actions-single.quest-name .editable', (event) =>
          HandlerDetails.questEditName(event, this._quest, this));

         html.on(jquery.drop, '.quest-giver-gc', async (event) =>
          await HandlerDetails.questGiverDropDocument(event, this._quest, this));

         html.on(jquery.click, '.quest-giver-gc .toggleImage', async () =>
          await HandlerDetails.questGiverToggleImage(this._quest, this));

         html.on(jquery.click, '.quest-giver-gc .deleteQuestGiver', async () =>
          await HandlerDetails.questGiverDelete(this._quest, this));

         html.on(jquery.click, '.quest-tasks .add-new-task',
          (event) => HandlerDetails.taskAdd(event, this._quest, this));

         html.on(jquery.click, '.actions.tasks .delete', async (event) =>
          await HandlerDetails.taskDelete(event, this._quest, this));

         html.on(jquery.drop, '.tasks-box', async (event) => await HandlerDetails.taskDropItem(event, this._quest));

         html.on(jquery.click, '.actions.tasks .editable',
          (event) => HandlerDetails.taskEditName(event, this._quest, this));

         html.on(jquery.click, 'li.task .toggleState', async (event) =>
          await HandlerDetails.taskToggleState(event, this._quest, this));
      }

      // Callbacks for GM, trusted player edit, or players who can accept quests.
      if (this.canEdit || this.canAccept)
      {
         html.on(jquery.click, '.actions.quest-status i.delete', async (event) =>
          await HandlerAny.questDelete(event, this._quest));

         html.on(jquery.click, '.actions.quest-status i.move', async (event) =>
         {
            await this.saveQuest({ refresh: false });
            await HandlerAny.questStatusSet(event);
         });
      }

      // Callbacks only for the GM and trusted player edit.
      if (this.canEdit)
      {
         html.on(jquery.click, '.quest-giver-name .actions-single .editable', (event) =>
          HandlerDetails.questGiverCustomEditName(event, this._quest, this));

         html.on(jquery.click, '.quest-giver-gc .drop-info', () =>
          HandlerDetails.questGiverCustomSelectImage(this._quest, this));

         html.on(jquery.click, '.quest-tabs .is-primary', () => Socket.setQuestPrimary({ quest: this._quest }));

         html.on(jquery.click, '.quest-rewards .add-abstract', (event) =>
          HandlerDetails.rewardAddAbstract(event, this._quest, this));

         html.on(jquery.click, '.actions.rewards .editable', (event) =>
          HandlerDetails.rewardAbstractEditName(event, this._quest, this));

         html.on(jquery.click, '.actions.rewards .delete', async (event) =>
          await HandlerDetails.rewardDelete(event, this._quest, this));

         html.on(jquery.drop, '.rewards-box',
          async (event) => await HandlerDetails.rewardDropItem(event, this._quest, this));

         html.on(jquery.click, '.quest-rewards .hide-all-rewards', async () =>
          await HandlerDetails.rewardsHideAll(this._quest, this));

         html.on(jquery.click, '.quest-rewards .lock-all-rewards', async () =>
          await HandlerDetails.rewardsLockAll(this._quest, this));

         html.on(jquery.click, '.abstract-reward .reward-image', async (event) =>
          await HandlerDetails.rewardSelectAbstractImage(event, this._quest, this));

         html.on(jquery.click, '.quest-rewards .show-all-rewards', async () =>
          await HandlerDetails.rewardsShowAll(this._quest, this));

         html.on(jquery.click, '.actions.rewards .toggleHidden', async (event) =>
          await HandlerDetails.rewardToggleHidden(event, this._quest, this));

         html.on(jquery.click, '.actions.rewards .toggleLocked', async (event) =>
          await HandlerDetails.rewardToggleLocked(event, this._quest, this));

         html.on(jquery.click, '.quest-rewards .unlock-all-rewards', async () =>
          await HandlerDetails.rewardsUnlockAll(this._quest, this));

         html.on(jquery.click, '.actions.tasks .toggleHidden', async (event) =>
          await HandlerDetails.taskToggleHidden(event, this._quest, this));

         // Management view callbacks -------------------------------------------------------------------------------

         html.on(jquery.click, '.add-subquest-btn', async () => await HandlerManage.addSubquest(this._quest, this));

         html.on(jquery.click, '.configure-perm-btn', () => HandlerManage.configurePermissions(this._quest, this));

         html.on(jquery.click, '.delete-splash', async () => await HandlerManage.deleteSplashImage(this._quest, this));

         html.on(jquery.click, `.quest-splash #splash-as-icon-${this._quest.id}`, async (event) =>
          await HandlerManage.setSplashAsIcon(event, this._quest, this));

         html.on(jquery.click, '.quest-splash .drop-info',
          async () => await HandlerManage.setSplashImage(this._quest, this));

         html.on(jquery.click, '.change-splash-pos', async () => await HandlerManage.setSplashPos(this._quest, this));
      }
   }

   /**
    * When closing this Foundry app:
    * - Close any associated dialogs via {@link FQLDialog.closeDialogs}
    * - Close any associated {@link QuestPreview._ownershipControl}
    * - Close any associated {@link QuestPreview._rewardImagePopup}
    * - Close any associated {@link QuestPreview._splashImagePopup}
    * - If set invoke {@link QuestPreview._activeFocusOutFunction} or {@link QuestPreview.saveQuest} if the current
    * user is the owner of the quest and options `noSave` is false.
    *
    * Save the quest on close with no refresh of data.
    *
    * @param {object}   opts - Optional params
    *
    * @param {boolean}  [opts.noSave] - When true the quest is not saved on close otherwise save quest.
    *
    * @param {...*}     [opts.options] - Options which are passed through to {@link FormApplication.close}
    *
    * @returns {Promise<void>}
    * @inheritDoc
    * @see {@link FormApplication.close}
    * @see https://foundryvtt.com/api/FormApplication.html#close
    */
   async close({ noSave = false, ...options } = {})
   {
      FQLDialog.closeDialogs({ questId: this._quest.id });

      // If a permission control app / dialog is open close it.
      if (this._ownershipControl)
      {
         this._ownershipControl.close();
         this._ownershipControl = void 0;
      }

      // Close any opened actor or reward item sheets.
      for (const appId of this._openedAppIds)
      {
         const app = ui.windows[appId];
         if (app && app.rendered) { app.close(); }
      }

      // If a reward ImagePopup is open close it.
      if (this._rewardImagePopup)
      {
         this._rewardImagePopup.close();
         this._rewardImagePopup = void 0;
      }

      // If a splash ImagePopup is open close it.
      if (this._splashImagePopup)
      {
         this._splashImagePopup.close();
         this._splashImagePopup = void 0;
      }

      // Only potentially save the quest if the user is the owner and noSave is false.
      if (!noSave && this._quest.isOwner)
      {
         // If there is an active input focus function set then invoke it so that the input field is saved.
         if (typeof this._activeFocusOutFunction === 'function')
         {
            await this._activeFocusOutFunction(void 0, { refresh: false });

            // Send a socket refresh event to all clients. This will also render all local apps as applicable.
            // Must update parent and any subquests / children.
            Socket.refreshQuestPreview({
               questId: this._quest.parent ? [this._quest.parent, this._quest.id, ...this._quest.subquests] :
                [this._quest.id, ...this._quest.subquests],
               focus: false,
            });
         }
         else
         {
            // Otherwise save the quest as normal.
            await this.saveQuest({ refresh: false });
         }
      }

      return super.close(options);
   }

   /**
    * Retrieves the cached enriched data from QuestDB to be used in the Handlebars template. Also sets the local
    * variables used in {@link QuestPreview.activateListeners} to enable various control handling based on user
    * permissions and module settings.
    *
    * @override
    * @inheritDoc
    * @see {@link QuestPreview.canAccept}
    * @see {@link QuestPreview.canEdit}
    * @see {@link QuestPreview.playerEdit}
    * @see https://foundryvtt.com/api/FormApplication.html#getData
    */
   async getData(options = {}) // eslint-disable-line no-unused-vars
   {
      const content = QuestDB.getQuestEntry(this._quest.id).enrich;

      this.canAccept = game.settings.get(constants.moduleName, settings.allowPlayersAccept);
      this.canEdit = game.user.isGM || (this._quest.isOwner && Utils.isTrustedPlayerEdit());
      this.playerEdit = this._quest.isOwner;

      // By default all normal players and trusted players without ownership of a quest are always on the the default
      // tab 'details'. In the case of a trusted player who has permissions revoked to access the quest and is on the
      // 'management' the details tab needs to be activated. This is possible in 'getData' as it is fairly early in the
      // render process. At this time the internal state of the application is '1' for 'RENDERING'.
      if (!this.canEdit && this._tabs[0] && this._tabs[0].active !== 'details')
      {
         this._tabs[0].activate('details');
      }

      const data = {
         isGM: game.user.isGM,
         isPlayer: !game.user.isGM,
         canAccept: this.canAccept,
         canEdit: this.canEdit,
         playerEdit: this.playerEdit
      };

      return foundry.utils.mergeObject(data, content);
   }

   /**
    * Refreshes the QuestPreview window and emits {@link Socket.refreshQuestPreview} so remote clients view of data is
    * updated as well. Any rendered / visible parent and subquests of this quest are also refreshed.
    *
    * @returns {Promise<void>}
    */
   async refresh()
   {
      Socket.refreshQuestPreview({
         questId: this._quest.parent ? [this._quest.parent, this._quest.id, ...this._quest.subquests] :
          [this._quest.id, ...this._quest.subquests],
         focus: false,
      });

      this.render(true, { focus: true });
   }

   /**
    * When the editor is saved we simply save the quest. The editor content if any is available is saved inside
    * 'saveQuest'.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/FormApplication.html#saveEditor
    */
   async saveEditor()
   {
      return this.saveQuest();
   }

   /**
    * Save the associated quest and refresh this app.
    *
    * @param {object} options - Optional parameters
    *
    * @param {boolean} options.refresh - Execute `QuestPreview.refresh`
    *
    * @returns {Promise<void>}
    * @see {@link QuestPreview.refresh}
    */
   async saveQuest({ refresh = true } = {})
   {
      // Save any altered content from the TinyMCE editors.
      for (const key of Object.keys(this.editors))
      {
         const editor = this.editors[key];

         if (editor.mce)
         {
            this._quest[key] = editor.mce.getContent();
            await super.saveEditor(key);
         }
      }

      await this._quest.save();

      return refresh ? this.refresh() : void 0;
   }
}
