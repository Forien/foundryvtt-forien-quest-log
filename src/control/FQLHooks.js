import Socket           from './Socket.js';
import QuestAPI         from './QuestAPI.js';
import QuestDB          from './QuestDB.js';
import Utils            from './Utils.js';
import ViewManager      from './ViewManager.js';
import Quest            from '../model/Quest.js';
import QuestFolder      from '../model/QuestFolder.js';
import QuestCollection  from '../model/QuestCollection.js';
import QuestPreview     from '../view/preview/QuestPreview.js';

import ModuleSettings   from '../ModuleSettings.js';
import DBMigration      from '../../database/DBMigration.js';

import { constants, noteControls, settings } from '../model/constants.js';

/**
 * Provides implementations for all Foundry hooks that FQL responds to and registers under. Please view the
 * {@link QuestDB} documentation for hooks that it fires in the QuestDB lifecycle.
 *
 * Foundry lifecycle:
 * - `init` - {@link FQLHooks.foundryInit}
 * - `ready` - {@link FQLHooks.foundryReady} - A hook `ForienQuestLog.Lifecycle.ready` is fired after FQL is ready.
 * - `setup` - {@link FQLHooks.foundrySetup}
 *
 * Foundry game hooks:
 * - `dropActorSheetData` - {@link FQLHooks.dropActorSheetData} - Handle drop data for reward items in actor sheet.
 * - `getSceneControlButtons` - {@link FQLHooks.getSceneControlButtons} - Add FQL scene controls to 'note'.
 * - `hotbarDrop` - {@link FQLHooks.hotbarDrop} - Handle Quest drops to the macro hotbar.
 * - `renderJournalDirectory` - {@link FQLHooks.renderJournalDirectory} - Add 'open quest log' / show FQL folder.
 * - `renderJournalSheet` - {@link FQLHooks.renderJournalSheet} - Hide FQL directory from journal sheet option items.
 *
 * FQL hooks (response):
 * - `ForienQuestLog.Open.QuestLog` - {@link FQLHooks.openQuestLog} - Open the quest log.
 * - `ForienQuestLog.Open.QuestLogFloating` - {@link FQLHooks.openQuestLogFloating} - Open the floating quest log.
 * - `ForienQuestLog.Run.DBMigration` - {@link FQLHooks.runDBMigration} - Allow GMs to run the DBMigration manually.
 */
export default class FQLHooks
{
   /**
    * Initializes all hooks that FQL responds to in the Foundry lifecycle and in game hooks.
    */
   static init()
   {
      // Foundry startup hooks.
      Hooks.once('init', FQLHooks.foundryInit);
      Hooks.once('ready', FQLHooks.foundryReady);
      Hooks.once('setup', FQLHooks.foundrySetup);

      // Respond to Foundry in game hooks.
      Hooks.on('dropActorSheetData', FQLHooks.dropActorSheetData);
      Hooks.on('getSceneControlButtons', FQLHooks.getSceneControlButtons);
      Hooks.on('hotbarDrop', FQLHooks.hotbarDrop);
      Hooks.on('renderJournalDirectory', FQLHooks.renderJournalDirectory);
      Hooks.on('renderJournalSheet', FQLHooks.renderJournalSheet);

      // FQL specific hooks.
      Hooks.on('ForienQuestLog.Open.QuestLog', FQLHooks.openQuestLog);
      Hooks.on('ForienQuestLog.Open.QuestLogFloating', FQLHooks.openQuestLogFloating);
      Hooks.on('ForienQuestLog.Run.DBMigration', FQLHooks.runDBMigration);
   }

   /**
    * Responds to when a data drop occurs on an ActorSheet. If there is an {@link FQLDropData} instance attached by
    * checking the `_fqlData.type` set to `reward` then process the reward item drop via {@link Socket.questRewardDrop}
    * to remove the item from the associated quest.
    *
    * @param {Actor}          actor - The Actor which received the data drop.
    *
    * @param {ActorSheet}     sheet - The ActorSheet which received the data drop.
    *
    * @param {RewardDropData} data - Any data drop, but only handle RewardDropData.
    *
    * @returns {Promise<void>}
    * @see https://foundryvtt.com/api/Actor.html
    * @see https://foundryvtt.com/api/ActorSheet.html
    */
   static async dropActorSheetData(actor, sheet, data)
   {
      if (typeof data !== 'object' || data?._fqlData?.type !== 'reward') { return; }

      await Socket.questRewardDrop({
         actor: { id: actor.id, name: actor.data.name },
         sheet: { id: sheet.id },
         data
      });
   }

   /**
    * Provides FQL initialization during the `init` Foundry lifecycle hook.
    */
   static foundryInit()
   {
      // Set the sheet to render quests.
      Quest.setSheet(QuestPreview);

      // Register FQL module settings.
      ModuleSettings.register();

      // Preload Handlebars templates and register helpers.
      Utils.preloadTemplates();
      Utils.registerHandlebarsHelpers();
   }

   /**
    * Provides the remainder of FQL initialization during the `ready` Foundry lifecycle hook.
    *
    * @returns {Promise<void>}
    */
   static async foundryReady()
   {
      // Only attempt to run DB migration for GM.
      if (game.user.isGM) { await DBMigration.migrate(); }

      // Add the FQL unique Quest data type to the Foundry core data types.
      CONST.ENTITY_TYPES?.push(Quest.documentName);
      CONST.ENTITY_LINK_TYPES?.push(Quest.documentName);

      // Add the FQL Quest data type to CONFIG.
      CONFIG[Quest.documentName] = {
         entityClass: Quest,
         documentClass: Quest,
         collection: QuestCollection,
         sidebarIcon: 'fas fa-scroll',
         sheetClass: QuestPreview
      };

      // Add our QuestCollection to the game collections.
      game.collections.set(Quest.documentName, new QuestCollection());

      // Initialize the in-memory QuestDB. Loads all quests that the user can see at this point.
      await QuestDB.init();

      // Initialize all main GUI views.
      ViewManager.init();

      // Allow and process incoming socket data.
      Socket.listen();

      // Fire our own lifecycle event to inform any other modules that depend on FQL QuestDB.
      Hooks.callAll('ForienQuestLog.Lifecycle.ready');
   }

   /**
    * Provides the setup FQL initialization during the `setup` Foundry lifecycle hook. Make the public QuestAPI
    * accessible from `game.modules('forien-quest-log').public.QuestAPI`.
    */
   static foundrySetup()
   {
      const moduleData = Utils.getModuleData();

      /**
       * @type {FQLPublicAPI}
       */
      moduleData.public = {
         QuestAPI
      };

      // Freeze the public API so it can't be modified.
      Object.freeze(moduleData.public);
   }

   /**
    * Responds to the in game hook `getSceneControlButtons` to add the FQL quest log and floating quest log to the
    * journal / 'notes' tool as sub categories. These controls are always added for the GM, but if FQL is hidden from
    * players based on module setting {@link settings.hideFQLFromPlayers} the note controls do not display.
    *
    * @param {SceneControl[]} controls - The scene controls to add FQL controls.
    *
    * @see noteControls
    * @see https://foundryvtt.com/api/SceneControls.html
    */
   static getSceneControlButtons(controls)
   {
      if (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers))
      {
         const notes = controls.find((c) => c.name === 'notes');
         if (notes) { notes.tools.push(...noteControls); }
      }
   }

   /**
    * When a quest is dropped into the macro hotbar create a new Quest open macro. The macro command invokes
    * opening the {@link QuestPreview} via {@link QuestAPI.open} by quest ID.
    *
    * @param {Hotbar} hotbar - The Hotbar application instance.
    *
    * @param {object} data - The dropped data object.
    *
    * @param {number} slot - The target hotbar slot
    *
    * @returns {boolean} - Whether the callback was handled.
    * @see https://foundryvtt.com/api/Hotbar.html
    */
   static async hotbarDrop(hotbar, data, slot)
   {
      if (data.type === Quest.documentName)
      {
         const questId = data.id;

         const quest = QuestDB.getQuest(questId);

         // Early out if Quest isn't in the QuestDB.
         if (!quest)
         {
            throw new Error(game.i18n.localize('ForienQuestLog.Api.hooks.createOpenQuestMacro.error.noQuest'));
         }

         // The macro script data to open the quest via the public QuestAPI.
         const command = `game.modules.get('${constants.moduleName}').public.QuestAPI.open({ questId: '${questId}' });`;

         const macroData = {
            name: game.i18n.format('ForienQuestLog.Api.hooks.createOpenQuestMacro.name', { name: quest.name }),
            type: 'script',
            command
         };

         // Determine the image for the macro. Use the splash image if `splashAsIcon` is true otherwise the giver image.
         macroData.img = quest.splashAsIcon && quest.splash.length ? quest.splash : quest.giverData.img;

         // Search for an already existing macro with the same command.
         let macro = game.macros.contents.find((m) => (m.data.command === command));

         // If not found then create a new macro with the command.
         if (!macro)
         {
            macro = await Macro.create(macroData, { displaySheet: false });
         }

         // Assign the macro to the hotbar.
         game.user.assignHotbarMacro(macro, slot);

         // FQL did handle this callback.
         return true;
      }

      // FQL didn't handle this callback.
      return false;
   }

   /**
    * Opens the QuestLog if the game user is a GM or if FQL isn't hidden to players by module setting
    * {@link settings.hideFQLFromPlayers}.
    */
   static openQuestLog()
   {
      if (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers))
      {
         ViewManager.questLog.render(true, { focus: true });
      }
   }

   /**
    * Opens the QuestLogFloating if the game user is a GM or if FQL isn't hidden to players by module setting
    * {@link settings.hideFQLFromPlayers}.
    */
   static openQuestLogFloating()
   {
      if (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers))
      {
         ViewManager.questLogFloating.render(true, { focus: true });
      }
   }

   /**
    * Handles adding the 'open quest log' button at the bottom of the journal directory. Always displayed for the GM,
    * but only displayed to players if FQL isn't hidden via module setting {@link settings.hideFQLFromPlayers}.
    *
    * For GMs if module setting {@link settings.showFolder} is true then the hidden `_fql_quests` folder is shown.
    *
    * @param {JournalDirectory}  app - The JournalDirectory app.
    *
    * @param {jQuery}            html - The jQuery element for the window content of the app.
    *
    * @see https://foundryvtt.com/api/JournalDirectory.html
    */
   static renderJournalDirectory(app, html)
   {
      if (game.user.isGM || !game.settings.get(constants.moduleName, settings.hideFQLFromPlayers))
      {
         const button = $(`<button class="quest-log-btn">${game.i18n.localize(
          'ForienQuestLog.QuestLogButton')}</button>`);

         let footer = html.find('.directory-footer');
         if (footer.length === 0)
         {
            footer = $(`<footer class="directory-footer"></footer>`);
            html.append(footer);
         }
         footer.append(button);

         button.click(() =>
         {
            ViewManager.questLog.render(true);
         });
      }

      if (!(game.user.isGM && game.settings.get(constants.moduleName, settings.showFolder)))
      {
         const folder = QuestFolder.get();
         if (folder !== void 0)
         {
            const element = html.find(`.folder[data-folder-id="${folder.id}"]`);
            if (element !== void 0)
            {
               element.remove();
            }
         }
      }
   }

   /**
    * Remove option item for quest journal folder when any journal entry is rendered. This prevents users from placing
    * non-quest journals into the quest journal folder.
    *
    * @param {JournalSheet}   app - The JournalSheet app.
    *
    * @param {jQuery}         html - The jQuery element for the window content of the app.
    *
    * @see https://foundryvtt.com/api/JournalSheet.html
    */
   static renderJournalSheet(app, html)
   {
      const folderId = QuestFolder.get().id;

      const option = html.find(`option[value="${folderId}"]`);

      if (option) { option.remove(); }
   }

   /**
    * Provides a GM only hook to manually run DB Migration. When schemaVersion is not provided
    * {@link DBMigration.migrate} will perform migration loading this value from module settings. However, a specific
    * migration schema version can be supplied to force DB migration. To run all migration provide `0` otherwise a
    * specific schema version to start migration at which is below the max version.
    *
    * @param {number}   [schemaVersion] - A valid schema version from 0 to {@link DBMigration.version}
    *
    * @returns {Promise<void>}
    */
   static async runDBMigration(schemaVersion = void 0)
   {
      // Only GMs can run the migration.
      if (!game.user.isGM) { return; }

      await DBMigration.migrate(schemaVersion);
   }
}

/**
 * @typedef {object} FQLPublicAPI - Exposes a few FQL classes and instances publicly.
 *
 * @property {QuestAPI} QuestAPI - QuestAPI class - Exposes static methods to interact with the quest system.
 */
