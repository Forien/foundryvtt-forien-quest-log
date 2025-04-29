import { ViewManager }  from './ViewManager.js';

import { QuestTracker } from '../../view/index.js';

import {
   constants,
   settings }           from '../../model/constants.js';

/**
 * Defines a rectangle with essential contains check. Used to define the pinning rectangle next to the
 * upper left of the sidebar.
 */
class FQLRect extends DOMRect
{
   /**
    * Tests if the point is contained by this FQLRect.
    *
    * @param {number}   x - Point X
    *
    * @param {number}   y - Point Y
    *
    * @returns {boolean} Is point contained in rectangle.
    */
   contains(x, y)
   {
      return this.x <= x && x <= this.x + this.width && this.y <= y && y <= this.y + this.height;
   }
}

/**
 * Manages the state of the Foundry UI elements including the {@link Hotbar}, {@link SceneNavigation} and
 * {@link Sidebar} providing management of the {@link QuestTracker}. Controls pinning the QuestTracker to the sidebar
 * and modifications to the SceneNavigation width when pinned.
 */
export class FoundryUIManager
{
   static DEBOUNCE_TIME = 250;

   /**
    * Buffer space between sidebar and right side of quest tracker.
    *
    * @type {number}
    */
   static #bufferSpaceX = 8;

   /**
    * Buffer space between hotbar and bottom side of quest tracker.
    *
    * @type {number}
    */
   static #bufferSpaceY = 8;

   /**
    * Buffer space for the navigation bar.
    *
    * @type {number}
    */
   static #bufferSpaceNavX = 22;

   /**
    * Debounce timeout for the update tracker callback.
    *
    * @type {null|number}
    */
   static #debounce = null;

   /**
    * Defines the left-hand UI control note buttons.
    *
    * @type {object[]}
    */
   static #noteControls = {
      quest_log: {
         name: 'quest_log',
         title: 'ForienQuestLog.QuestLog.Title',
         icon: 'fas fa-scroll',
         visible: true,
         onChange: () => ViewManager.questLog.render(true, { focus: true }),
         button: true
      },
      quest_tracker: {
         name: 'quest_tracker',
         title: 'ForienQuestLog.QuestTracker.Title',
         icon: 'fas fa-tasks',
         visible: true,
         onChange: async () => { await game.settings.set(constants.moduleName, settings.questTrackerEnable, true); },
         button: true
      }
   };


   /**
    * Defines the UI Manager callbacks. Please see {@link FoundryUIManager} for more documentation.
    *
    * @type {FoundryUIManagerHooks}
    */
   static #hooks = Object.freeze({
      preUpdateQuestTracker: 'preUpdateQuestTracker',
      updateQuestTracker: 'updateQuestTracker',
      questTrackerBoundaries: 'questTrackerBoundaries',
   });

   /**
    * Stores the constraints and other state tracked from various Foundry UI elements.
    *
    * @type {object}
    */
   static #uiState = {
      /**
       * Stores the bounds of the scene controls.
       */
      controls: {
         gapX: -1,
         gapY: -1,
         top: -1,
         right: -1,
         width: -1,
         height: -1
      },
      /**
       * Stores the bounds of the hotbar.
       */
      hotbar: {
         gapX: -1,
         gapY: -1,
         top: -1,
         left: -1,
         width: -1,
         height: -1
      },

      /**
       * Stores the navigation element parameters.
       */
      navigation: {
         left: ''
      },

      boundaries: Object.seal({
         top: -1,
         right: -1,
         bottom: -1,
         left: -1,
         rectDock: new FQLRect(0, 0, 15, 30),
      }),

      /**
       * Stores the state of the sidebar.
       */
      sidebar: {
         currentCollapsed: false,

         collapsed: {
            gapX: -1,
            gapY: -1,
            top: -1,
            left: -1,
            width: -1,
            height: -1
         },

         open: {
            gapX: -1,
            gapY: -1,
            top: -1,
            left: -1,
            width: -1,
            height: -1
         }
      }
   };

   /**
    * @returns {object[]} The left-hand UI note control button data.
    */
   static get noteControls()
   {
      return this.#noteControls;
   }

   /**
    * @returns {{top: number, right: number, bottom: number, left: number, rectDock: FQLRect}} Boundaries for the Tracker
    */
   static get boundaries()
   {
      return this.#uiState.boundaries;
   }


   /**
    *
    * @returns {FoundryUIManagerHooks} - the Foundry UI Manager Hooks
    */
   static get hooks() { return this.#hooks; }

   /**
    * Registers browser window resize event callback and Foundry render Hook for {@link SceneNavigation} and
    * {@link QuestTracker}.
    */
   static init()
   {
      window.addEventListener('resize', this.#handleWindowResize);
      Hooks.on('collapseSidebar', this.collapseSidebar);
      Hooks.on('renderSceneNavigation', this.updateTrackerPinned);
      Hooks.on('renderQuestTracker', this.#handleQuestTrackerRendered);
      Hooks.on('updateQuestTrackerState', this.#updateQuestTrackerState);

      // FoundryUIManager.#uiState.sidebar.currentCollapsed = !ui?.sidebar?.expanded || false;
      this.#storeState();

      FoundryUIManager.updateTrackerPinned();
   }

   /**
    * Check the position against the sidebar and hotbar.
    *
    * @param {object}   position - The complete position with top, left, width, height keys.
    *
    * @returns {boolean} True if the new position is within the sidebar pinned rectangle.
    */
   static checkPosition(position)
   {
      const controlsData = FoundryUIManager.#uiState.controls;
      const boundaries = FoundryUIManager.#uiState.boundaries;

      const tracker = ViewManager.questTracker;

      // Detect if the new position overlaps with the sidebar.
      if (boundaries.right >= 0 &&
       position.left + tracker.position.width > boundaries.right)
      {
         // This is a resize width change, so limit the new position width to the sidebar left side.
         if (position.resizeWidth)
         {
            position.width = boundaries.right - FoundryUIManager.#bufferSpaceX - position.left;
         }
         else // Otherwise move the new position to the left pinning the position to the sidebar left.
         {
            position.left = boundaries.right - FoundryUIManager.#bufferSpaceX - tracker.position.width;
         }
      }

      // If not pinned adjust the position top based on the hotbar top.
      if (!tracker.pinned && boundaries.bottom >= 0 &&
       position.top + position.height > boundaries.bottom + FoundryUIManager.#bufferSpaceY)
      {
         if (position.resizeHeight)
         {
            position.height = boundaries.bottom - FoundryUIManager.#bufferSpaceY - position.top;
            tracker.position.height = position.height;
         }
         else
         {
            position.top = boundaries.bottom - FoundryUIManager.#bufferSpaceY - position.height;
         }
      }

      if (boundaries.top >= 0 && position.top < boundaries.top)
      {
         position.top = boundaries.top;
      }

      if (boundaries.left >= 0 && controlsData.gapX >= 0 && position.left < boundaries.left + FoundryUIManager.#bufferSpaceX)
      {
         position.left = boundaries.left + FoundryUIManager.#bufferSpaceX;
      }

      if (position.top < 0) { position.top = 0; }
      if (position.left < 0) { position.left = 0; }

      // If pinned always make sure the position top is the sidebar top.
      if (tracker.pinned)
      {
         position.top = boundaries.top;
         position.left = boundaries.right - position.width - FoundryUIManager.#bufferSpaceX;
      }

      return boundaries.rectDock.contains(position.left + position.width, position.top);
   }

   /**
    * The `collapseSidebar` Hook callback. Store the new state and update the tracker.
    *
    * @param {Sidebar}  sidebarUI - The Foundry Sidebar.
    *
    * @param {boolean}  collapsed - The sidebar collapsed state.
    */
   static collapseSidebar(sidebarUI, collapsed)
   {
      FoundryUIManager.#uiState.sidebar.currentCollapsed = collapsed;
      FoundryUIManager.#updateQuestTrackerState();
   }

   /**
    * Updates the state of the quest tracker by storing the current state
    * and updating the tracker's position.
    *
    * @returns {void} Does not return a value.
    */
   static #updateQuestTrackerState()
   {
      // waiting for animation to ensure proper rect bounds
      clearTimeout(FoundryUIManager.#debounce);
      FoundryUIManager.#debounce = setTimeout(() =>
       {
          FoundryUIManager.#storeState();
          FoundryUIManager.updateTracker();
       },
       FoundryUIManager.DEBOUNCE_TIME
      );
   }

   /**
    * Updates the tracker bounds based on pinned state and invokes {@link QuestTracker.setPosition} if changes occur.
    */
   static updateTracker()
   {
      const tracker = ViewManager.questTracker;

      // Make sure the tracker is rendered or rendering.
      if (!tracker.rendered && Application.RENDER_STATES.RENDERING !== tracker._state) { return; }

      const boundaries = FoundryUIManager.#uiState.boundaries;

      // Store the current position before any modification.
      const position = {
         pinned: false,
         top: tracker.position.top,
         left: tracker.position.left,
         width: tracker.position.width,
         height: tracker.position.height
      };

      Hooks.callAll(FoundryUIManager.hooks.preUpdateQuestTracker, tracker, position, boundaries);

      // If the tracker is pinned set the top / left based on the sidebar.
      if (tracker.pinned)
      {
         position.top = boundaries.top;
         position.left = boundaries.right - tracker.position.width - FoundryUIManager.#bufferSpaceX;
      }
      else // Make sure the tracker isn't overlapping the sidebar or hotbar.
      {
         const trackerRight = tracker.position.left + tracker.position.width;
         if (boundaries.right >= 0 && trackerRight > boundaries.right - FoundryUIManager.#bufferSpaceX)
         {
            position.left = boundaries.right - tracker.position.width - FoundryUIManager.#bufferSpaceX;

            if (position.left < 0) { position.left = 0; }
         }

         const trackerBottom = tracker.position.top + tracker.position.height;
         if (boundaries.bottom >= 0 && trackerBottom > boundaries.bottom - FoundryUIManager.#bufferSpaceY)
         {
            position.top = boundaries.top - tracker.position.height - FoundryUIManager.#bufferSpaceY;

            if (position.top < 0) { position.top = 0; }
         }

         if (boundaries.left >= 0 && tracker.position.left < boundaries.left + FoundryUIManager.#bufferSpaceX)
         {
            position.left = boundaries.left + FoundryUIManager.#bufferSpaceX;

            if (position.left < 0) { position.left = 0; }
         }

         if (boundaries.top >= 0 && tracker.position.top < boundaries.top + FoundryUIManager.#bufferSpaceY)
         {
            position.top = boundaries.top + FoundryUIManager.#bufferSpaceY;

            if (position.top < 0) { position.top = 0; }
         }
      }

      // Only post a position change if there are modifications.
      if (position.top !== tracker.position.top || position.left !== tracker.position.left ||
       position.width !== tracker.position.width || position.height !== tracker.position.height)
      {
         tracker.setPosition(position);
      }

      Hooks.callAll(FoundryUIManager.hooks.updateQuestTracker, tracker, position, boundaries);
   }

   /**
    * Updates state when the quest tracker is pinned / unpinned. Currently manipulates the Foundry
    * {@link SceneNavigation} component width so that it doesn't overlap the pinned quest tracker.
    */
   static updateTrackerPinned()
   {
      /** Commented code for now, most likely not needed anymore with v13 */
      // const tracker = ViewManager.questTracker;
      // const pinned = tracker.pinned;
      // const sidebarData = FoundryUIManager.#uiState.sidebar.open;
      //
      // let width = FoundryUIManager.#uiState.navigation.left + sidebarData.width + FoundryUIManager.#bufferSpaceNavX;
      // width += pinned ? tracker.position.width : 0;
      // if (ui?.nav?.element)
      // {
      //    ui.nav.element.style.width = `calc(100% - ${width}px`;
      // }
   }

   /**
    * Unregisters browser window event callback and Foundry render hook for {@link QuestTracker}.
    */
   static unregister()
   {
      window.removeEventListener('resize', this.#handleWindowResize);
      Hooks.off('collapseSidebar', FoundryUIManager.collapseSidebar);
      Hooks.off('renderSceneNavigation', FoundryUIManager.updateTrackerPinned);
      Hooks.off('renderQuestTracker', this.#handleQuestTrackerRendered);
   }

   // Internal Implementation ----------------------------------------------------------------------------------------

   /**
    * Invokes `updateTracker` when the QuestTracker is rendered.
    *
    * @param {Application} app - The Application instance being rendered.
    */
   static #handleQuestTrackerRendered(app)
   {
      if (app instanceof QuestTracker) { FoundryUIManager.updateTracker(); }
   }

   /**
    * Callback for window resize events. Update tracker position.
    */
   static #handleWindowResize()
   {
      FoundryUIManager.#storeState();
      FoundryUIManager.updateTracker();
   }

   /**
    * Stores the current Foundry UI calculated bounds state.
    */
   static #storeState()
   {
      const sidebarElem = ui?.sidebar?.element;
      const sidebarRect = sidebarElem?.getBoundingClientRect();

      const navLeft = ui?.nav?.element?.style.left;
      if (typeof navLeft === 'string') { FoundryUIManager.#uiState.navigation.left = parseInt(navLeft, 10); }

      debugger;
      if (sidebarRect)
      {
         const sidebarData = FoundryUIManager.#uiState.sidebar.currentCollapsed ?
          FoundryUIManager.#uiState.sidebar.collapsed : FoundryUIManager.#uiState.sidebar.open;

         // Store gapX / gapY calculating including any ::before elements if it has not already been set.
         // This is only calculated one time on startup.
         if (sidebarData.gapX < 0)
         {
            let beforeWidth;
            let beforeHeight;
            try
            {
               const style = window.getComputedStyle(sidebarElem, 'before');

               const width = parseInt(style.getPropertyValue('width'), 10);
               if (!Number.isNaN(width)) { beforeWidth = width; }

               const height = parseInt(style.getPropertyValue('height'), 10);
               if (!Number.isNaN(height)) { beforeHeight = height; }
            }
            catch (err) { /**/ }

            sidebarData.gapX = beforeWidth && beforeWidth > sidebarRect.width ? beforeWidth - sidebarRect.width : 0;

            sidebarData.gapY = beforeHeight && beforeHeight > sidebarRect.height ?
             beforeHeight - sidebarRect.height : 0;
         }

         sidebarData.left = sidebarRect.left - sidebarData.gapX;
         sidebarData.top = sidebarRect.top - sidebarData.gapY;
         sidebarData.width = sidebarRect.width + sidebarData.gapX;
         sidebarData.height = sidebarRect.height + sidebarData.gapY;

         FoundryUIManager.#uiState.boundaries.rectDock.x = sidebarData.left - FoundryUIManager.#uiState.boundaries.rectDock.width;
         FoundryUIManager.#uiState.boundaries.right = sidebarData.left;
      }

      const hotbarElem = ui?.hotbar?.element;
      const hotbarRect = hotbarElem?.getBoundingClientRect();

      if (hotbarRect)
      {
         // Store gapX / gapY calculating including any ::before elements if it has not already been set.
         // This is only calculated one time on startup.
         if (FoundryUIManager.#uiState.hotbar.gapX < 0)
         {
            let beforeWidth;
            let beforeHeight;
            try
            {
               const style = window.getComputedStyle(hotbarElem, 'before');

               const width = parseInt(style.getPropertyValue('width'), 10);
               if (!Number.isNaN(width)) { beforeWidth = width; }

               const height = parseInt(style.getPropertyValue('height'), 10);
               if (!Number.isNaN(height)) { beforeHeight = height; }
            }
            catch (err) { /**/ }

            FoundryUIManager.#uiState.hotbar.gapX = beforeWidth && beforeWidth > hotbarRect.width ?
             beforeWidth - hotbarRect.width : 0;

            FoundryUIManager.#uiState.hotbar.gapY = beforeHeight && beforeHeight > hotbarRect.height ?
             beforeHeight - hotbarRect.height : 0;
         }

         FoundryUIManager.#uiState.hotbar.left = hotbarRect.left - FoundryUIManager.#uiState.hotbar.gapX;
         FoundryUIManager.#uiState.hotbar.top = hotbarRect.top - FoundryUIManager.#uiState.hotbar.gapY;
         FoundryUIManager.#uiState.hotbar.width = hotbarRect.width + FoundryUIManager.#uiState.hotbar.gapX;
         FoundryUIManager.#uiState.hotbar.height = hotbarRect.height + FoundryUIManager.#uiState.hotbar.gapY;

         FoundryUIManager.#uiState.boundaries.bottom = hotbarRect.top;
      }

      const controlsElem = ui?.controls?.element;
      const controlsRect = controlsElem?.getBoundingClientRect();

      if (controlsRect)
      {
         // Store gapX / gapY calculating including any ::before elements if it has not already been set.
         // This is only calculated one time on startup.
         if (FoundryUIManager.#uiState.controls.gapX < 0)
         {
            let beforeWidth;
            let beforeHeight;
            try
            {
               const style = window.getComputedStyle(controlsElem, 'before');

               const width = parseInt(style.getPropertyValue('width'), 10);
               if (!Number.isNaN(width)) { beforeWidth = width; }

               const height = parseInt(style.getPropertyValue('height'), 10);
               if (!Number.isNaN(height)) { beforeHeight = height; }
            }
            catch (err) { /**/ }

            FoundryUIManager.#uiState.controls.gapX = beforeWidth && beforeWidth > controlsRect.width ?
             beforeWidth - controlsRect.width : 0;

            FoundryUIManager.#uiState.controls.gapY = beforeHeight && beforeHeight > controlsRect.height ?
             beforeHeight - controlsRect.height : 0;
         }

         FoundryUIManager.#uiState.controls.right = controlsRect.left + controlsRect.width + FoundryUIManager.#uiState.controls.gapX;
         FoundryUIManager.#uiState.controls.top = controlsRect.top - FoundryUIManager.#uiState.controls.gapY;
         FoundryUIManager.#uiState.controls.width = controlsRect.width + FoundryUIManager.#uiState.controls.gapX;
         FoundryUIManager.#uiState.controls.height = controlsRect.height + FoundryUIManager.#uiState.controls.gapY;

         FoundryUIManager.#uiState.boundaries.left = FoundryUIManager.#uiState.controls.right;
      }

      Hooks.callAll(FoundryUIManager.hooks.questTrackerBoundaries, FoundryUIManager.#uiState.boundaries);

      FoundryUIManager.#uiState.boundaries.rectDock.x = FoundryUIManager.#uiState.boundaries.right - FoundryUIManager.#uiState.boundaries.rectDock.width;
      FoundryUIManager.#uiState.boundaries.rectDock.y = FoundryUIManager.#uiState.boundaries.top;
   }
}

/**
 * @typedef {object} FoundryUIManagerHooks
 *
 * @property {string}   preUpdateQuestTracker Invoked in {@link FoundryUIManager.updateTracker} before any position is calculated.
 *
 * @property {string}   updateQuestTracker Invoked in {@link FoundryUIManager.updateTracker} after all position is calculated and tracker position updated.
 *
 * @property {string}   questTrackerBoundaries Invoked in {@link FoundryUIManager.#storeState} when boundaries are calculated but before pinning rect is defined
 */
