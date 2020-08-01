# FoundryVTT - Forien's Quest Log
![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/forien/foundryvtt-forien-quest-log?style=for-the-badge) 
![GitHub Releases](https://img.shields.io/github/downloads/Forien/foundryvtt-forien-quest-log/latest/total?style=for-the-badge) 
![GitHub All Releases](https://img.shields.io/github/downloads/Forien/foundryvtt-forien-quest-log/total?style=for-the-badge&label=Downloads+total)  
**[Compatibility]**: *FoundryVTT* 0.6.0+  
**[Systems]**: *any*  
**[Languages]**: *Chinese, English, French, German, Japanese, Korean, Polish, Portuguese (Brazil), Spanish*  

This module provides comprehensive Quest Log system for players and Game Masters to use with Foundry Virtual Table Top

## Installation

1. Install Forien's Quest Log using manifest URL: https://raw.githubusercontent.com/Forien/foundryvtt-forien-quest-log/master/module.json
2. While loaded in World, enable **_Forien's Quest Log_** module.

## Usage
Button to access Quest Log is situated on the bottom of Journal Directory.

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

If you wish to contact me for any reason, reach me out on Discord using my tag: `Forien#2130`


## Acknowledgments

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

Forien's Quest Log is a module for Foundry VTT by Forien and is licensed under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development from May 29, 2020](https://foundryvtt.com/article/license/).
