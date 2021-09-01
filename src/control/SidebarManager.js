import ViewManager from './ViewManager.js';

/**
 * Buffer space between sidebar and right side of quest tracker.
 *
 * @type {number}
 */
const s_SPACE_X = 8;

/**
 * Manages the state of the Foundry sidebar providing
 */
export default class SidebarManager
{
   static init()
   {
      sidebar.currentCollapsed = ui.sidebar._collapsed;
      window.addEventListener('resize', () =>
      {
         s_STORE_STATE();
         s_UPDATE_TRACKER();
      });

      s_STORE_STATE();
      s_UPDATE_TRACKER();
   }

   static checkPosition(position)
   {
      const sidebarData = sidebar.currentCollapsed ? sidebar.collapsed : sidebar.open;
      const tracker = ViewManager.questTracker;
console.log(`SidebarManager - checkPosition - position: ${JSON.stringify(position)}`);
console.log(`SidebarManager - checkPosition - sidebarData: ${JSON.stringify(sidebarData, null, 3)}`);
      if (typeof position.left === 'number' && typeof position.top === 'number')
      {
         if (sidebarData.gapX >= 0 && position.left + tracker.position.width > sidebarData.left - s_SPACE_X)
         {
            position.left = sidebarData.left - s_SPACE_X - tracker.position.width;
         }
      }

      if (typeof position.width === 'number' && typeof position.height === 'number')
      {
         if (sidebarData.gapX >= 0 && tracker.position.left + position.width > sidebarData.left - s_SPACE_X)
         {
            position.width = sidebarData.left - s_SPACE_X - tracker.position.left;
         }
      }
   }

   static collapseSidebar(sidebarUI, collapsed)
   {
      sidebar.currentCollapsed = collapsed;
      s_STORE_STATE();
      s_UPDATE_TRACKER();

      console.log(`!! SidebarManager - sidebar: ${JSON.stringify(sidebar, null, 3)}`);
   }
}

class FQLRect
{
   constructor(x, y, width, height)
   {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
   }

   contains(x, y)
   {
      return this.x <= x && x <= this.x + this.width && this.y <= y && y <= this.y + this.height;
   }
}

const sidebar = {
   currentCollapsed: false,

   collapsed: {
      gapX: -1,
      gapY: -1,
      left: -1,
      top: -1,
      width: -1,
      height: -1,
      rectDock: new FQLRect(0, 0, 50, 50)
   },

   open: {
      gapX: -1,
      gapY: -1,
      left: -1,
      top: -1,
      width: -1,
      height: -1,
      rectDock: new FQLRect(0, 0, 50, 50)
   }
};

/**
 * Stores the current sidebar state.
 */
function s_STORE_STATE()
{
   const sidebarData = sidebar.currentCollapsed ? sidebar.collapsed : sidebar.open;

   const sidebarElem = ui?.sidebar?.element[0];
   const sidebarRect = sidebarElem?.getBoundingClientRect();

   if (!sidebarRect) { return; }

   // Store gapX / gapY calculating any ::before elements if it has not already been set.
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
      sidebarData.gapY = beforeHeight && beforeHeight > beforeHeight.height ? beforeHeight - sidebarRect.height : 0;
   }

   sidebarData.left = sidebarRect.left - sidebarData.gapX;
   sidebarData.top = sidebarRect.top - sidebarData.gapY;
   sidebarData.width = sidebarRect.width + sidebarData.gapX;
   sidebarData.height = sidebarRect.height + sidebarData.gapY;

   sidebarData.rectDock.x = sidebarData.left - sidebarData.rectDock.width;
}

/**
 * collapseSidebar -> Sidebar, boolean
 *
 * @private
 */
function s_UPDATE_TRACKER()
{
   const tracker = ViewManager.questTracker;
   const sidebarData = sidebar.currentCollapsed ? sidebar.collapsed : sidebar.open;

   const trackerRight = tracker.position.left + tracker.position.width;
   if (trackerRight > sidebarData.left - s_SPACE_X)
   {
      const left = sidebarData.left - tracker.position.width - s_SPACE_X;
      tracker.setPosition({ pinned: false, left, top: tracker.position.top });
   }
}

