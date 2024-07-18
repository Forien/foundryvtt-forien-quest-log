/**
 * Provides a helper class to gate UI notifications that may come in from various players in a rapid fashion
 * through Socket. By default, a 4-second delay is applied between each notification, but the last notification
 * received will always be displayed.
 */
export class UINotifications
{
   /**
    * Stores the last notify warn time epoch in MS.
    *
    * @type {number}
    */
   #lastNotifyWarn = Date.now();

   /**
    * Stores the last notify info time epoch in MS.
    *
    * @type {number}
    */
   #lastNotifyInfo = Date.now();


   /**
    * Stores the last call to setTimeout for info messages, so that they can be cancelled as new notifications
    * arrive.
    *
    * @type {number}
    */
   #timeoutInfo = void 0;

   /**
    * Stores the last call to setTimeout for warn messages, so that they can be cancelled as new notifications
    * arrive.
    *
    * @type {number}
    */
   #timeoutWarn = void 0;

   /**
    * Potentially gates `warn` UI notifications to prevent overloading the UI notification system.
    *
    * @param {string}   message - Message to post.
    *
    * @param {number}   delay - The delay in MS between UI notifications posted.
    */
   warn(message, delay = 4000)
   {
      if (Date.now() - this.#lastNotifyWarn > delay)
      {
         ui.notifications.warn(message);
         this.#lastNotifyWarn = Date.now();
      }
      else
      {
         if (this.#timeoutWarn)
         {
            clearTimeout(this.#timeoutWarn);
            this.#timeoutWarn = void 0;
         }

         this.#timeoutWarn = setTimeout(() =>
         {
            ui.notifications.warn(message);
         }, delay);
      }
   }

   /**
    * Potentially gates `info` UI notifications to prevent overloading the UI notification system.
    *
    * @param {string}   message - Message to post.
    *
    * @param {number}   delay - The delay in MS between UI notifications posted.
    */
   info(message, delay = 4000)
   {
      if (Date.now() - this.#lastNotifyInfo > delay)
      {
         ui.notifications.info(message);
         this.#lastNotifyInfo = Date.now();
      }
      else
      {
         if (this.#timeoutInfo)
         {
            clearTimeout(this.#timeoutInfo);
            this.#timeoutInfo = void 0;
         }

         this.#timeoutInfo = setTimeout(() =>
         {
            ui.notifications.info(message);
         }, delay);
      }
   }

   /**
    * Post all error messages with no gating.
    *
    * @param {string}   message - Message to post.
    */
   error(message)
   {
      ui.notifications.error(message);
   }
}
