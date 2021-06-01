# Changelog

## Release 0.6.0
* Set compatible with Foundry 0.8.6 (and removes compatibility with lower versions)
* Left sidebar buttons moved from it's own menu (the pen icon) to buttons under the Notes menu (the bookmark icon)

## Release 0.5.8
* Set compatible with Foundry 0.7.10
* Updated Chinese localization courtesy of FuyuEnnju
* Localization fix courtesy of FuyuEnnju

## Release 0.5.7
* Buttons to delete and change vertical alignment of quest giver and splash image added courtesy of @Dilomos

## Release 0.5.6
* Added the QuestTracker from the 'party-unit-frames' project courtesy of @p4535992
* Added support for Bug Reporter
* Hopefully fixed the broken release flow...

## Release 0.5.5
* Failed release, withdrawn

## Release 0.5.4
* A floating quest window, by Rughalt
* Translation to zh-tw, by zeteticl
* Set compatible Foundry version to 0.7.9 (as that is what I tested the above with)

## Release v0.5.3
* [BUG] Quest not loading when user removed from world (@xdy)
* Add Svenska (Swedish) translation (@xdy)
* Updated release to point to the League fork instead of the death-save one (@eclarke12)

## v0.5.2
* [BUG] Quest Preview not saving
* [BUG] Can't close new Quest Window
* Provide compatibility with Foundry VTT 0.7.7

## v0.5.1
* [BUG] "_fql_quests" folder not being created on fresh installs

## v0.5.0
* Quest Log UI Overhaul, big thanks to sdenec for designing new UI and for help implementing it!
* Quests can now have Quest Source that consists of custom image and name, without relying on any existing Entity
* Quest are now sortable in Quest Log
* Rewards and Tasks are now sortable in Quest Details
* You can now click on Item Rewards and preview item sheet.
* Removed old Welcome Screen
* Added prompt to install new Workshop's Welcome Screen
* Tested and bumped compatible core version to 0.7.1
* [BUG] Subquest inherits description and gm notes from parent
* [BUG] Error when invalid quest or non-quest journal entry is present in `_fql_quests` folder

### v0.4.4
* Added compatibility changes to work with D&D5E Dark Mode module by Stryxin
* Added Brazilian Portuguese translation thanks to Discord member Innocenti
* Updated French translation with help of original contributor (Naoki)

### v0.4.3
* Fixed error showing up and rejecting submitting Quest Form if Quest Giver is invalid string
* Fixed Quest Details to properly refresh parent when created subquest
* Fixed Quest Details to properly refresh parent when deleted subquest
* Updated translations with help of original contributors

### v0.4.2
* Fixed Players list overflowing on Managenemt tab for those crazy people with more than 12 players

### v0.4.1
* Fixed Players list overflowing on Managenemt tab for those crazy people with 8 or more players
* Fixed hidden subquests showing empty row to players
* Fixed deleting subquests not being removed from parents
* Fixed updating subquests not refreshing Parent's details

## v0.4.0
* Added Quest Branching in form of ability to create SubQuests
* Added support for Item and JournalEntry as quest giver entities.
    * localization string `ForienQuestLog.QuestForm.DragDropActor` needs updating for all languages
    * localization string `ForienQuestLog.QuestForm.QuestGiverPlaceholder` needs updating for all languages
    * localization string `ForienQuestLog.Quests` needs updating for all languages
* Added optional Setting to allow Players to create quests
    * Player also needs "Create Journal Entry" permission
* Added Splash Art / Featured Image for Quests
* Added optional Setting to allow Players to accept quests
* Added Quest Setting to allow Players to edit that quest
* Added "Copy Link" button on Quest Preview window
* Added Configuration setting to decide if hidden tasks should be counted
* Added Chinese translation provided by Discord member Ztt1996
* Added status edit buttons to Quest Details window
* Added Quest Status to Quest Details window
* Allowed to drag&drop Quests from Quest Log to create rich-text entity links
* Allowed for multiple Quest Detail windows to be displayed at once
* Migrated from quest folders to quest statuses. 
* Fixed linking Quests in Quest tasks causing stack overflow
* Fixed Secret disappearing from Description
* Fixed additional Macros being created for opening the Quests while dragging quest to Hotbar

## v0.3.X

### v0.3.4
* Added Spanish translation provided by GitHub member JJBocanegra

### v0.3.3
* Fixed editable inputs cutting off text after double quotation character
* Added popup when attempting to close the Quest Form window without submitting.
* Added option to link quests in rich text environments with `@Quest[id]` and `@Quest[quest name]`. Hacky way, might be unstable. 
* Added Configuration setting that allows GM turn off displaying Welcome Screen to players. Enabled by default
* Added "Help" button in Quest Log's header that allows to open Welcome Screen at any time. 

### v0.3.2
* Added French translation provided by Discord members rectulo and Naoki
* Abstract Rewards now are a little transparent (0.9 opacity) and their text is in italic

### v0.3.1
* Added Korean translation provided by Discord member KLO
* Show GM information if players can't see shared quest

## v0.3.0
* Added „Personal Quests”, a feature that allows GM to show any Quest to only specific player(s).
* Added Entity linking to Tasks (for example `@Actor[Vash]` or `@Item[Cursed Sword]`).
    * Fixed Entity linking in Description for players.
* Added „Available Tab” as an optional setting. Redone actions so they make more sense in their context.
* Added option allowing GM to hide any Task and Reward from players.
* Added "Abstract" type Rewards, which are not "Item" entities, are not draggable, but can have any name and image applied to them. 
* Added optional Settings option that when checked, allows Players to drag Rewards onto their Actor sheets. (disabled by default)
* Added "Show Players" button for Quest Details, that will force open Quests Details for all players that have permission to see it.
* Hidden journal folder for quest data even for GM. Can be turned on back in settings.
* Changed some module settings to be client-side (centering titles, way of rendering bookmarks).
* Styling adjustments, including:
    * Fixed floating checkmarks for tasks when tasks overflow box. 
    * Added visible indication of each Task to help players distinguish separate tasks.
    * Changed the way Quest Log is scrolling with many quests.
    * Added scrolling to Tasks and Rewards, because people are crazy.
* Created API at `game.quests` for use in Macros and Modules.
* Using API, allowed to drag&drop Quests from Quest Log onto Hotbar to create an "Open Quest" macro. 
* Provided code comment blocks for most Functions. Not yet a Documentation, but could help those who peek at my module to learn. 


## v0.2.X

### v0.2.4
* Added German translation provided by Discord member Acd-Jake

### v0.2.3
* Added Japanese translation provided by Discord member Brother Sharp
* Added option to sort Quest Log
* Hidden "add new task" from players
* Added option to change rendering style of tabs
* Added module setting for centering titles in Quest Log
* Added Actor's name as a tooltip in Quest Log

### v0.2.2
* Allowed to change quest giver to existing quest by draggin new actor onto preview
* Widened and squished Tasks and Rewards boxes respectively to allow better space management
* Added word wrapping for tasks
* Fixed distorted Quest Giver's images
* Moved window initialization to 'ready' hook to fix translation

### v0.2.1
* Fully prepared module for translation - all strings should be translatable
* Added scroll for overflowing quest's description
* Added toggle between Actor's/Token's image for Quest Giver's image
* Added failed state for tasks
* Translated to Polish

## v0.2.0
* Initial release
