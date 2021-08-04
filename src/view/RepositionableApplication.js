import { constants, jquery } from '../model/constants.js';

/**
 * Provides a basic app that can be repositioned with this position stored as a module setting passed into the
 * constructor and stored in {@link RepositionableApplication._positionSetting}.
 */
export default class RepositionableApplication extends Application
{
   /**
    * @param {object}   [opts] - Optional parameters
    *
    * @param {string}   [opts.positionSetting] - The module setting to store position data to on move.
    *
    * @param {...*}     [opts.options] - Additional options passed to Application.
    */
   constructor({ positionSetting = void 0, ...options } = {})
   {
      super(options);

      /**
       * Stores the module setting to store the position of the app or generates a uniqueID.
       *
       * @type {string}
       * @private
       */
      this._positionSetting = positionSetting || getUniqueID();
   }

   /**
    * Defines all jQuery control callbacks with event listeners for click, drag, drop via various CSS selectors.
    *
    * @param {JQuery}  html - The jQuery instance for the window content of this Application.
    *
    * @see https://foundryvtt.com/api/FormApplication.html#activateListeners
    */
   activateListeners(html)
   {
      super.activateListeners(html);

      html.find('.move-handle').on(jquery.mousedown, this.reposition.bind(this));
   }

   /**
    * Gets the position from module settings and sets it to the Application position.
    *
    * @override
    * @inheritDoc
    * @see https://foundryvtt.com/api/Application.html#getData
    */
   getData(options = {})
   {
      return foundry.utils.mergeObject(super.getData(options), {
         pos: game.settings.get(constants.moduleName, this._positionSetting)
      });
   }

   /**
    * Repurposed code originally written by user ^ and stick for Token Action HUD.
    *
    * @param {JQuery.MouseDownEvent} ev - JQuery.MouseDownEvent
    *
    * @author ^ and stick#0520
    *
    * @see https://github.com/espositos/fvtt-tokenactionhud/blob/master/scripts/tokenactionhud.js#L199
    */
   reposition(ev)
   {
      ev.preventDefault();

      const _this = this;

      const hud = $(ev.currentTarget).parent();
      const marginLeft = parseInt(hud.css('marginLeft').replace('px', ''));
      const marginTop = parseInt(hud.css('marginTop').replace('px', ''));

      dragElement(document.getElementById(hud.attr('id')));
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;

      /**
       * @param {HTMLElement}  elmnt - The target drag element.
       */
      function dragElement(elmnt)
      {
         elmnt.onmousedown = dragMouseDown;

         /**
          * @param {JQuery.MouseDownEvent} e - JQuery.MouseDownEvent
          */
         function dragMouseDown(e)
         {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;

            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
         }

         /**
          * Invoked on mouse move.
          *
          * @param {JQuery.DragEvent} e - JQuery.DragEvent
          */
         function elementDrag(e)
         {
            e.preventDefault();

            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            elmnt.style.top = `${(elmnt.offsetTop - pos2) - marginTop}px`;
            elmnt.style.left = `${(elmnt.offsetLeft - pos1) - marginLeft}px`;
            elmnt.style.position = 'fixed';
            elmnt.style.zIndex = '100';
         }

         /**
          * Invoked on mouse up.
          */
         function closeDragElement()
         {
            // stop moving when mouse button is released:
            elmnt.onmousedown = null;
            document.onmouseup = null;
            document.onmousemove = null;

            let xPos = (elmnt.offsetLeft - pos1) > window.innerWidth ? window.innerWidth : (elmnt.offsetLeft - pos1);

            let yPos = (elmnt.offsetTop - pos2) > window.innerHeight - 20 ? window.innerHeight - 100 :
             (elmnt.offsetTop - pos2);

            xPos = xPos < 0 ? 0 : xPos;
            yPos = yPos < 0 ? 0 : yPos;

            if (xPos !== (elmnt.offsetLeft - pos1) || yPos !== (elmnt.offsetTop - pos2))
            {
               elmnt.style.top = `${yPos}px`;
               elmnt.style.left = `${xPos}px`;
            }

            _this.savePosition({ top: yPos, left: xPos });
         }
      }
   }

   /**
    * @param {{top: number, left: number}}   pos - Position of app.
    *
    * @returns {Promise<*>} The module set Promise.
    */
   async savePosition(pos = { top: 400, left: 120 })
   {
      if (pos.top && pos.left)
      {
         return game.settings.set(constants.moduleName, this._positionSetting, pos);
      }
   }
}

/**
 * Provides a unique ID counter incremented when the position setting is not provided.
 *
 * @type {number}
 */
let uniqueIDCntr = 0;

/**
 * @returns {string} A unique ID for this application if not provided.
 */
const getUniqueID = () => { return `unknown-${uniqueIDCntr++}`; };