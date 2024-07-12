/**
 * Provides a fixed / free placement context menu used in QuestLog. With a few modifications below the Foundry
 * ContextMenu is converted into a free placement context menu. This is useful to free the context menu from being bound
 * within the overflow constraints of a parent element and allow the context menu to display at the exact mouse point
 * clicked in a larger element. Note: be mindful that CSS style `position: fixed` is used to make the context menu
 * display relative to the main page viewport which defines the containing block, however if you use `filter`,
 * `perspective`, or `transform` in styles then that element becomes the containing block higher up than the main
 * window. FQLContextMenu does not reposition the inserted HTML which is relative to the element containing the context
 * menu.
 */
export class FQLContextMenu extends ContextMenu
{
   /**
    * Defines the default CSS styles for the context menu.
    *
    * @type {{"box-shadow": string, width: string, "font-size": string, "font-family": string, position: string}}
    */
   static #defaultStyle = {
      position: 'fixed',
      width: 'fit-content',
      'font-family': '"Signika", sans-serif',
      'font-size': '14px',
      'box-shadow': '0 0 10px #000'
   };

   /**
    * @type {{top: number, left: number}}
    */
   #position;

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

         this.#position = { left: event.pageX, top: event.pageY };
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
      html.css(foundry.utils.mergeObject(this.#position, FQLContextMenu.#defaultStyle));
   }
}