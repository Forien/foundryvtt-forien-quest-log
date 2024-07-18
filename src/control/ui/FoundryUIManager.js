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
    * Defines the left-hand UI control note buttons.
    *
    * @type {object[]}
    */
   static #noteControls = [
      {
         name: constants.moduleName,
         title: 'ForienQuestLog.QuestLog.Title',
         icon: 'fas fa-scroll',
         visible: true,
         onClick: () => ViewManager.questLog.render(true, { focus: true }),
         button: true
      },
      {
         name: 'forien-quest-log-floating-window',
         title: 'ForienQuestLog.QuestTracker.Title',
         icon: 'fas fa-tasks',
         visible: true,
         onClick: async () => { await game.settings.set(constants.moduleName, settings.questTrackerEnable, true); },
         button: true
      }
   ];

   /**
    * Stores the constraints and other state tracked from various Foundry UI elements.
    *
    * @type {object}
    */
   static #uiState = {
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
            height: -1,
            rectDock: new FQLRect(0, 0, 15, 30)
         },

         open: {
            gapX: -1,
            gapY: -1,
            top: -1,
            left: -1,
            width: -1,
            height: -1,
            rectDock: new FQLRect(0, 0, 15, 30)
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
    * Registers browser window resize event callback and Foundry render Hook for {@link SceneNavigation} and
    * {@link QuestTracker}.
    */
   static init()
   {
      window.addEventListener('resize', this.#handleWindowResize);
      Hooks.on('collapseSidebar', this.collapseSidebar);
      Hooks.on('renderSceneNavigation', this.updateTrackerPinned);
      Hooks.on('renderQuestTracker', this.#handleQuestTrackerRendered);

      FoundryUIManager.#uiState.sidebar.currentCollapsed = ui?.sidebar?._collapsed || false;
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
      const sidebarData = FoundryUIManager.#uiState.sidebar.currentCollapsed ?
       FoundryUIManager.#uiState.sidebar.collapsed : FoundryUIManager.#uiState.sidebar.open;

      const tracker = ViewManager.questTracker;

      // Detect if the new position overlaps with the sidebar.
      if (sidebarData.gapX >= 0 && position.left + tracker.position.width > sidebarData.left -
       FoundryUIManager.#bufferSpaceX)
      {
         // This is a resize width change, so limit the new position width to the sidebar left side.
         if (position.resizeWidth)
         {
            position.width = sidebarData.left - FoundryUIManager.#bufferSpaceX - position.left;
         }
         else // Otherwise move the new position to the left pinning the position to the sidebar left.
         {
            position.left = sidebarData.left - FoundryUIManager.#bufferSpaceX - tracker.position.width;
            if (position.left < 0) { position.left = 0; }
         }
      }

      // If not pinned adjust the position top based on the hotbar top.
      if (!tracker.pinned && FoundryUIManager.#uiState.hotbar.gapY >= 0 &&
       position.top + position.height > FoundryUIManager.#uiState.hotbar.top)
      {
         if (position.resizeHeight)
         {
            position.height = FoundryUIManager.#uiState.hotbar.top - FoundryUIManager.#bufferSpaceY - position.top;
            tracker.position.height = position.height;
         }
         else
         {
            position.top = FoundryUIManager.#uiState.hotbar.top - FoundryUIManager.#bufferSpaceY - position.height;
            if (position.top < 0) { position.top = 0; }
         }
      }

      // If pinned always make sure the position top is the sidebar top.
      if (tracker.pinned) { position.top = sidebarData.top; }

      return sidebarData.rectDock.contains(position.left + position.width, position.top);
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
      FoundryUIManager.#storeState();
      FoundryUIManager.updateTracker();
   }

   /**
    * Updates the tracker bounds based on pinned state and invokes {@link QuestTracker.setPosition} if changes occur.
    */
   static updateTracker()
   {
      const tracker = ViewManager.questTracker;

      // Make sure the tracker is rendered or rendering.
      if (!tracker.rendered && Application.RENDER_STATES.RENDERING !== tracker._state) { return; }

      const sidebarData = FoundryUIManager.#uiState.sidebar.currentCollapsed ?
       FoundryUIManager.#uiState.sidebar.collapsed : FoundryUIManager.#uiState.sidebar.open;

      // Store the current position before any modification.
      const position = {
         pinned: false,
         top: tracker.position.top,
         left: tracker.position.left,
         width: tracker.position.width,
         height: tracker.position.height
      };

      // If the tracker is pinned set the top / left based on the sidebar.
      if (tracker.pinned)
      {
         position.top = sidebarData.top;
         position.left = sidebarData.left - tracker.position.width - FoundryUIManager.#bufferSpaceX;
      }
      else // Make sure the tracker isn't overlapping the sidebar or hotbar.
      {
         const trackerRight = tracker.position.left + tracker.position.width;
         if (trackerRight > sidebarData.left - FoundryUIManager.#bufferSpaceX)
         {
            position.left = sidebarData.left - tracker.position.width - FoundryUIManager.#bufferSpaceX;

            if (position.left < 0) { position.left = 0; }
         }

         const trackerBottom = tracker.position.top + tracker.position.height;
         if (trackerBottom > FoundryUIManager.#uiState.hotbar.top - FoundryUIManager.#bufferSpaceY)
         {
            position.top = FoundryUIManager.#uiState.hotbar.top - tracker.position.height -
             FoundryUIManager.#bufferSpaceY;

            if (position.top < 0) { position.top = 0; }
         }
      }

      // Only post a position change if there are modifications.
      if (position.top !== tracker.position.top || position.left !== tracker.position.left ||
       position.width !== tracker.position.width || position.height !== tracker.position.height)
      {
         tracker.setPosition(position);
      }
   }

   /**
    * Updates state when the quest tracker is pinned / unpinned. Currently manipulates the Foundry
    * {@link SceneNavigation} component width so that it doesn't overlap the pinned quest tracker.
    */
   static updateTrackerPinned()
   {
      const tracker = ViewManager.questTracker;
      const pinned = tracker.pinned;
      const sidebarData = FoundryUIManager.#uiState.sidebar.open;

      let width = FoundryUIManager.#uiState.navigation.left + sidebarData.width + FoundryUIManager.#bufferSpaceNavX;
      width += pinned ? tracker.position.width : 0;
      ui?.nav?.element?.css('width', `calc(100% - ${width}px`);
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
      const sidebarElem = ui?.sidebar?.element[0];
      const sidebarRect = sidebarElem?.getBoundingClientRect();

      const navLeft = ui?.nav?.element?.css('left');
      if (typeof navLeft === 'string') { FoundryUIManager.#uiState.navigation.left = parseInt(navLeft, 10); }

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

         sidebarData.rectDock.x = sidebarData.left - sidebarData.rectDock.width;
      }

      const hotbarElem = ui?.hotbar?.element[0];
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
      }
   }
}