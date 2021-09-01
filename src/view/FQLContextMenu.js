/**
 * Provides a fixed / free placement context menu used in QuestLog. With a few modifications below and a small
 * bit of styles found in `quest-log.scss` / `quest-tracker.scss` (search for `#context-menu`) the Foundry ContextMenu
 * is converted into a fixed / free placement context menu. This is useful to free the context menu from being bound
 * within the overflow constraints of a parent element and allow the context menu to display at the exact mouse point
 * clicked in a larger element.
 */
export default class FQLContextMenu extends ContextMenu
{
   /**
    * @inheritDoc
    * @override
    */
   constructor(element, selector, menuItems, options = {})
   {
      super(element, selector, menuItems, options);
   }

   /**
    * Stores the pageX / pageY position from the the JQuery event to be applied in `_setPosition`.
    *
    * @inheritDoc
    * @override
    */
   bind()
   {
      this.element.on(this.eventName, this.selector, (event) =>
      {
         event.preventDefault();

         /**
          * @type {{top: number, left: number}}
          * @private
          */
         this._position = { left: event.pageX, top: event.pageY };
      });
      super.bind();
   }

   /**
    * Delegate to the parent `_setPosition` then apply the stored position from the callback in `bind`.
    *
    * @inheritDoc
    * @override
    */
   _setPosition(html, target)
   {
      super._setPosition(html, target);
      html.css(this._position);
   }
}