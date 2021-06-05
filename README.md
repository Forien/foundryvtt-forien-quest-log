# FoundryVTT - Forien's Quest Log
<img title="Forien's Quest Log version" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/master/module.json&label=Forien%27s+Quest+Log+version&query=version&style=flat-square&color=success"> ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Ffoundryvtt-forien-quest-log%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)
![GitHub release](https://img.shields.io/github/release-date/League-of-Foundry-Developers/foundryvtt-forien-quest-log)
[![GitHub commits](https://img.shields.io/github/commits-since/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest)](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/commits/)
![the latest version zip](https://img.shields.io/github/downloads/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest/module.zip)
![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Ftwodsix)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com) 
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fforien-quest-log%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/forien-quest-log/)

**NOTE** This is an unofficial forked version of the module maintained by the [League of Foundry Developers](https://discord.gg/gzemMfHURH) to provide module continuity while Forien is unavailable.

**[Compatibility]**: *FoundryVTT* 0.8.6 (as of version 0.6.0)

**[Systems]**: *any*  

**[Languages]**: *Chinese, English, French, German, Japanese, Korean, Polish, Portuguese (Brazil), Spanish, Swedish*  

This module provides comprehensive Quest Log system for players and Game Masters to use with Foundry Virtual Table Top

## Installation

1. Install Forien's Quest Log from the Foundry Module browser directly, or manually using manifest URL: https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/releases/latest/download/module.json
2. While loaded in World, enable **_Forien's Quest Log_** module.

## Usage
Button to access Quest Log is situated on the bottom of Journal Directory or in the scene controls menu under notes/journal entries. There are two controls related to Quest Log- Pen opens the Quest Log proper, and bookmark icon opens Floating Window that displays quests in fashion similar to MMORPG games.

I think module is quite user-friendly with intuitive UI, however if you are confused and lost, you might want to [check out Wiki](https://github.com/Forien/foundryvtt-forien-quest-log/wiki) or most recent [Release Video](https://www.patreon.com/forien/posts?filters[tag]=quest%20log&filters[media_types]=video).


## Features

* Quest Log windows that lists all quests divided into `In Progress`, `Completed` and `Failed` tabs
* Quest creator with WYSIWYG editors for description and GM notes
* Quest objectives
* Draggable Item rewards
* Fully editable Quest Details window
* Personal Quests
* Quest Branching in the form of Sub Quests

## Future plans (current ideas)

Plans for future include:
* a toggle "hide future tasks from players"
* Chapter/Arc system
* draggable EXP/Money rewards (need to wait for FVTT 0.7.0)

You can **always** check current and up-to-date [planned and requested features here](https://github.com/Forien/foundryvtt-forien-quest-log/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

*If you have **any** suggestion or idea on new contents, hit me up on Discord!*

## Translations

If you are interested in translating my module, simply make a new Pull Request with your changes, or contact me on Discord.

#### How to translate

I maintain both English and Polish translation of this module, so you check on those two to see how translation file can look like. It can be either expanded (nested) JSON like English, or flat JSON like Polish.

Order of Localization Strings inside a `.json` file is indifferent. 

Localization file **must be** either completely flat, or completely expanded (nested). Not partially both. 

#### What is `missing` Folder?

The `lang/missing/` folder contains files for all languages showing all Localization Strings that are in the Module, but are not covered by that Language. For example, there are 6 strings not covered by Polish language, but since they are simply `API Error` messages, there is no need.  


## Contact
[League of Foundry Developers](https://discord.gg/gzemMfHURH)
~~If you wish to contact me for any reason, reach me out on Discord using my tag: `Forien#2130`~~

## Acknowledgments

* Great thanks to sdenec for his invaluable help with UI overhaul!
* Thanks to Atropos for his relentless work on developing and improving the Foundry VTT
* Thanks to necxelos, TomChristoffer and Kralug for their massive lists of suggestions
* Thanks to Brother Sharp for providing Japanese translation
* Thanks to Acd-Jake for providing German translation
* Thanks to KLO for providing Korean translation
* Thanks to rectulo and Naoki for providing French translation
* Thanks to JJBocanegra for providing Spanish translation
* Thanks to Ztt1996 for providing Chinese translation
* Thanks to Innocenti for providing Brazilian Portuguese translation 

## Support

If you wish to support module development, please consider [becoming Patron](https://www.patreon.com/foundryworkshop) or donating [through Paypal](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=6P2RRX7HVEMV2&source=url). Thanks!

## License

Forien's Quest Log is a module for Foundry VTT by Forien and is licensed under a [MIT License](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/LICENSE). List of contributors in [AUTHORS file](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/AUTHORS).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development from May 29, 2020](https://foundryvtt.com/article/license/).
