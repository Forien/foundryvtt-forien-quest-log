import { DBMigration }  from '../DBMigration.js';

import {
   FVTTCompat,
   Utils }              from '../../src/control/index.js';

import { Quest }        from '../../src/model/index.js';

import { constants }    from '../../src/model/constants.js';

/**
 * Performs DB migration for v10 and all systems updating cached images / names of quest givers and reward items.
 *
 * The purpose of this update is that image paths for compendium items have changed for dnd5e system. World items will
 * have been migrated and compendium items updated. This update does UUID lookups for all quest givers and item rewards
 * changing the image path if it is found and differs from the cached value in the quest flag data.
 *
 * @returns {Promise<void>}
 */
export async function dbSchema_3()
{
   const folder = await Utils.initializeQuestFolder();
   if (!folder) { return; }

   let dnd5eIconMap = void 0;

   const removedData = [];

   // Retrieve DnD5e system icon migration map if applicable.
   if (typeof game?.dnd5e?.migrations?.getMigrationData === 'function')
   {
      const dndData = await game.dnd5e.migrations.getMigrationData();
      if (dndData && typeof dndData?.iconMap === 'object' && dndData?.iconMap !== null)
      {
         dnd5eIconMap = dndData.iconMap;
      }
   }

   for (const entry of FVTTCompat.folderContents(folder))
   {
      try
      {
         const content = entry.getFlag(constants.moduleName, constants.flagDB);

         if (content)
         {
            const quest = new Quest(content, entry);

            handleSplashImage(quest, dnd5eIconMap);
            const removedDataEntry = {};

            await handleQuestGiver(quest, removedDataEntry, dnd5eIconMap);
            await handleRewards(quest, removedDataEntry, dnd5eIconMap);

            await quest.save();

            if (Object.keys(removedDataEntry).length > 0)
            {
               removedDataEntry.questName = quest.name;
               removedDataEntry.questId = entry.id;
               removedData.push(removedDataEntry);
            }
         }
         else
         {
            console.log(game.i18n.format('ForienQuestLog.Migration.Notifications.CouldNotMigrate',
             { name: FVTTCompat.get(entry, 'name') }));
         }
      }
      catch (err)
      {
         console.log(game.i18n.format('ForienQuestLog.Migration.Notifications.CouldNotMigrate',
          { name: FVTTCompat.get(entry, 'name') }));
      }
   }

   // Post informational message to notifications and chat message if unlinked document data exists.
   if (removedData.length > 0)
   {
      ui.notifications.warn(game.i18n.localize('ForienQuestLog.Migration.ChatMessage.Notification'));

      let content = game.i18n.localize('ForienQuestLog.Migration.ChatMessage.Header');

      for (const entry of removedData)
      {
         // Shorten to fit in sidebar.
         const questName = entry.questName.length > 38 ? `${entry.questName.substring(0, 38)}...` : entry.questName;

         content += `@JournalEntry[${entry.questId}]{${questName}}<br>`;

         if (typeof entry.giverName === 'string')
         {
            // Shorten to fit in sidebar.
            const giverName = entry.giverName.length > 40 ? `${entry.giverName.substring(0, 40)}...` : entry.giverName;

            content += `<u>${game.i18n.localize('ForienQuestLog.Migration.ChatMessage.QuestGiver')}</u><br>- ${
             giverName}<br>`;
         }

         if (Array.isArray(entry.rewards))
         {
            content += `<u>${game.i18n.localize('ForienQuestLog.Migration.ChatMessage.QuestRewards')} (${
             entry.rewards.length})</u><br>`;

            for (const reward of entry.rewards)
            {
               // Shorten to fit in sidebar.
               const rewardName = reward.length > 40 ? `${reward.substring(0, 40)}...` : reward;
               content += `- ${rewardName}<br>`;
            }
         }
         content += `<br>`;
      }

      content += game.i18n.localize('ForienQuestLog.Migration.ChatMessage.Footer');

      ChatMessage.create({
         user: game.user.id,
         type: CONST.CHAT_MESSAGE_TYPES.OTHER,
         content
      });
   }

   // Set the DBMigration.setting to `3` indicating that migration to schema version `3` is complete.
   await game.settings.set(constants.moduleName, DBMigration.setting, 3);
}

/**
 * @param {string}   path -
 *
 * @param {object}   dnd5eIconMap -
 *
 * @returns {string} Converted path.
 */
function swap5eImage(path, dnd5eIconMap)
{
   if (typeof path !== 'string' || !dnd5eIconMap) { return void 0; }

   if (typeof dnd5eIconMap[path] === 'string')
   {
      return dnd5eIconMap[path];
   }
   else if (path.startsWith('systems/dnd5e'))
   {
      // Hope for the best and swap extensions to `webp`.
      return path.replace(/\.[^/.]+$/, '.webp');
   }

   return path;
}

/**
 * Update quest splash image specifically for remapping dnd5e system images.
 *
 * @param {Quest}    quest -
 *
 * @param {object}   dnd5eIconMap -
 */
function handleSplashImage(quest, dnd5eIconMap)
{
   if (typeof quest.splash === 'string' && dnd5eIconMap)
   {
      const newPath = swap5eImage(quest.splash, dnd5eIconMap);
      if (typeof newPath === 'string')
      {
         quest.splash = newPath;
      }
   }
}

/**
 * Update quest giver images w/ special handling for dnd5e system.
 *
 * @param {Quest}    quest -
 *
 * @param {object}   removedDataEntry -
 *
 * @param {object}   dnd5eIconMap -
 */
async function handleQuestGiver(quest, removedDataEntry, dnd5eIconMap)
{
   // Load quest giver assets and store as 'giverData'.
   if (typeof quest.giver === 'string')
   {
      // Handle remapping any dnd5e images used for abstract quest givers.
      if (quest.giver === 'abstract' && dnd5eIconMap)
      {
         const newPath = swap5eImage(quest.image, dnd5eIconMap);
         if (typeof newPath === 'string')
         {
            quest.image = newPath;
            if (quest.giverData && typeof quest.giverData?.img === 'string') { quest.giverData.img = newPath; }
         }
      }
      else
      {
         try
         {
            // Do a lookup and if it fails then reset giver / giverData below.
            const doc = await globalThis.fromUuid(quest.giver);

            if (doc)
            {
               const data = await Quest.giverFromQuest(quest);
               if (data && typeof data.img === 'string' && data.img.length) { quest.giverData = data; }
            }
            else
            {
               const giverName = quest?.giverData?.name ?? 'Unknown';
               console.warn(`Forien's Quest Log warning; removed quest giver "${giverName}" from quest: ${quest.name}`);

               // Document is not found, so remove quest giver and giverData.
               quest.giver = null;
               quest.giverData = null;

               removedDataEntry.giverName = giverName;
            }
         }
         catch (err)
         {
            const giverName = quest?.giverData?.name ?? 'Unknown';
            console.warn(`Forien's Quest Log warning; removed quest giver "${giverName}" from quest: ${quest.name}`);

            // An error occurred / remove quest giver.
            quest.giver = null;
            quest.giverData = null;
            removedDataEntry.giverName = giverName;
         }
      }
   }
}

/**
 * Update all abstract and item quest rewards. Verify that items still exist otherwise remove them. For dnd5e system
 * attempt to remap abstract reward images. For items with valid documents update the name and image otherwise remove
 * them.
 *
 * @param {Quest}    quest -
 *
 * @param {object}   removedDataEntry -
 *
 * @param {object}   dnd5eIconMap -
 */
async function handleRewards(quest, removedDataEntry, dnd5eIconMap)
{
   if (!Array.isArray(quest.rewards)) { return; }

   for (let cntr = quest.rewards.length; --cntr >= 0;)
   {
      const reward = quest.rewards[cntr];

      if (dnd5eIconMap && reward?.type === 'Abstract' && typeof reward?.data?.img === 'string')
      {
         const newPath = swap5eImage(reward.data.img, dnd5eIconMap);
         if (typeof newPath === 'string')
         {
            reward.data.img = newPath;
         }
      }
      else if (reward?.type === 'Item' && typeof reward?.data?.uuid === 'string')
      {
         try
         {
            const doc = await globalThis.fromUuid(reward.data.uuid);

            // Remove reward as no document found.
            if (!doc)
            {
               const rewardName = reward.data?.name ?? 'Unknown';
               console.warn(`ForienQuestLog warning; removed item reward "${rewardName}" from quest: ${quest.name}`);

               quest.rewards.splice(cntr, 1);

               if (!Array.isArray(removedDataEntry.rewards)) { removedDataEntry.rewards = []; }
               removedDataEntry.rewards.push(rewardName);
            }
            else
            {
               reward.data.img = doc.img;
               reward.data.name = doc.name;
            }
         }
         catch (err)
         {
            const rewardName = reward.data?.name ?? 'Unknown';
            console.warn(`ForienQuestLog warning; removed item reward "${rewardName}" from quest: ${quest.name}`);

            // Remove reward on any error.
            quest.rewards.splice(cntr, 1);

            if (!Array.isArray(removedDataEntry.rewards)) { removedDataEntry.rewards = []; }
            removedDataEntry.rewards.push(rewardName);
         }
      }
   }
}