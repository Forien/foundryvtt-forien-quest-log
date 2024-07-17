# FoundryVTT - Forien's Quest Log

![FQL Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/Forien/foundryvtt-forien-quest-log/master/module.json&label=Forien%27s+Quest+Log+version&query=version&style=flat-square&color=success")
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Ffoundryvtt-forien-quest-log%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibility.verified&colorB=orange)
![GitHub release](https://img.shields.io/github/release-date/Forien/foundryvtt-forien-quest-log)
[![GitHub commits](https://img.shields.io/github/commits-since/Forien/foundryvtt-forien-quest-log/latest)](https://github.com/Forien/foundryvtt-forien-quest-log/commits/)
![the latest version zip](https://img.shields.io/github/downloads/Forien/foundryvtt-forien-quest-log/latest/module.zip)
![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fforien-quest-log)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fforien-quest-log%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/forien-quest-log/)

[![Weblate Translations](https://weblate.foundryvtt-hub.com/widgets/forien-quest-log/-/287x66-grey.png)](https://weblate.foundryvtt-hub.com/engage/forien-quest-log/)

This module provides comprehensive Quest Log system for players and Game Masters to use with [Foundry VTT](https://foundryvtt.com/).

**[Compatibility]**: _FoundryVTT_ `v11` / `v12` as of FQL version `0.8.0`.

**[Game Systems]**: _any_

**[Language Translations]**: _Chinese (simplified / traditional), Dutch, English, Finnish, French, German, Italian, Japanese, Korean, Polish, 
Portuguese (Brazil), Russian, Spanish, Swedish_

## Installation

1. (Recommended) Install Forien's Quest Log from the Foundry package manager directly. 
   - _or_ manually using the manifest URL: `https://github.com/Forien/foundryvtt-forien-quest-log/releases/latest/download/module.json`


2. While loaded in your World, enable **_Forien's Quest Log_** in the `Module Management` configuration. 

## Recent Updates

The major `0.8.0` update to FQL:

- Foundry v11 / v12 dual support.
- Actors can now be set as rewards allowing [Item Piles](https://foundryvtt.com/packages/item-piles) and various game 
  system loot functionality to be utilized in rewards distribution for currency and items. 
- Custom rewards may use game system text enrichment where available to distribute XP. For example with the `dnd5e` 
  system use `[[/award 400xp]]`.
- Player Notes - players can now leave notes on quests in a separate section similar to `GM Notes`.
- Editors switched to ProseMirror.

## Usage

A button to access the Quest Log is situated on the bottom of Journal Directory or in the left hand scene controls icon 
toolbar under notes / journal entries where two new icons (scroll and list) opens the Quest Log and Quest Tracker. There
also are two `macro compendiums` available for FQL that provide ready to go macros to drop onto your hotbar that allow
convenient access to FQL for players and several GM related options.

There is a series of useful [in-depth video tutorials on YouTube](https://www.youtube.com/playlist?list=PLHslnNa8QKdD_M29g_Zs0f9zyAUVJ32Ne) 
that cover the `0.7 - 0.8` releases.

FQL is quite user-friendly with an intuitive UI, however you might want to [check out the Wiki](https://github.com/Forien/foundryvtt-forien-quest-log/wiki) for more detailed usage including macros and Quest API details for external developers integrations. 

## Features

- Quest Log windows that lists all quests divided into `In Progress`, `Completed` and `Failed` tabs.
- Quest creator with WYSIWYG editors for description and GM notes.
- Quest objectives.
- Draggable Item rewards.
- Fully editable Quest Details window.
- Personal Quests.
- Quest Branching in the form of Sub Quests.

## About

FQL is being updated for stability across core Foundry updates. This stability and long term maintenance of such is 
the _main feature_ of FQL presently. You can rest assured that the quest log experience you know and _love_ will 
continue to be available now and into the future.

Moving forward FQL is transitioning back to ownership and maintenance by Forien who is active again with Foundry 3rd 
party development. 

## Translations

FQL uses Weblate to coordinate language translation from community translators. Through this interface you are able to
provide language corrections and translations. I am more than willing to support even more language translations for
FQL, so if your language isn't represented yet please visit the [FQL Weblate Portal](https://weblate.foundryvtt-hub.com/engage/forien-quest-log/)
and get in contact.

## Future plans (current ideas)

Rock solid stability through future releases of Foundry VTT and even more language / internationalization support.
At this time a few quality of life features may be added in any given release as well.

_If you think you have found a bug or usability issue with FQL itself please file an issue in the 
[FQL Issue Tracker](https://github.com/Forien/foundryvtt-forien-quest-log/issues)_.

## Contact

TBD

## Acknowledgments

See [Authors](https://github.com/Forien/foundryvtt-forien-quest-log/blob/master/AUTHORS) and
[Contributors](https://github.com/Forien/foundryvtt-forien-quest-log/graphs/contributors)

## Support (Historical)

Between the summer of '21 and '24 FQL was developed and maintained by Michael Leahy aka [TyphonJS](https://github.com/typhonrt) / 
[TyphonJS Discord](https://typhonjs.io/discord/). Michael took FQL from MVP to the questing powerhouse that FQL became
and maintained the package through a challenging series of Foundry core update `v0.8` through `v12`. 

## License

Forien's Quest Log is a module for Foundry VTT by Forien and is licensed under a [MIT License](https://github.com/Forien/foundryvtt-forien-quest-log/blob/master/LICENSE). 

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development from February 17, 2021](https://foundryvtt.com/article/license/).
