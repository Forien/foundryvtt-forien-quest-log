# FoundryVTT - Forien's Quest Log

<img title="Forien's Quest Log version" src="https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/master/module.json&label=Forien%27s+Quest+Log+version&query=version&style=flat-square&color=success"> ![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Ffoundryvtt-forien-quest-log%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)
![GitHub release](https://img.shields.io/github/release-date/League-of-Foundry-Developers/foundryvtt-forien-quest-log)
[![GitHub commits](https://img.shields.io/github/commits-since/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest)](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/commits/)
![the latest version zip](https://img.shields.io/github/downloads/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest/module.zip)
![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fforien-quest-log)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fforien-quest-log%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/forien-quest-log/)

**NOTE** This is an unofficial forked version of the module maintained by the [League of Foundry Developers](https://discord.gg/gzemMfHURH) to provide module continuity while Forien is unavailable. 
The `0.7.x` series of FQL was guided by `TyphonJS` and is in maintenance mode. However, a new module in the works by TyphonJS that moves the questing experience beyond FQL is available at [typhonjs-fvtt/quest-log](https://github.com/typhonjs-fvtt/quest-log).

**[Compatibility]**: _FoundryVTT_ 0.8.6 (as of version 0.6.0)

**[Systems]**: _any_

**[Languages]**: _Chinese, English, French, German, Japanese, Korean, Polish, Portuguese (Brazil), Spanish, Swedish_

This module provides comprehensive Quest Log system for players and Game Masters to use with Foundry Virtual Table Top

## Installation

1. Install Forien's Quest Log from the Foundry Module browser directly, or manually using manifest URL: https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/releases/latest/download/module.json
2. While loaded in World, enable **_Forien's Quest Log_** module.

## Usage

A button to access the Quest Log is situated on the bottom of Journal Directory or in the scene controls menu under notes / journal entries on the left-hand navigation bar where a scroll icon opens the Quest Log.

FQL is quite user-friendly with an intuitive UI, however you might want to [check out the Wiki](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/wiki) for more detailed usage including macros and Quest API details for external developers integrations. 

There are also a series of useful in depth video tutorials on YouTube that cover each recent release:
- [v0.7.7](https://youtu.be/lfSYJXVQAcE)
- [v0.7.6](https://youtu.be/Dn2iprrcPpY)
- [v0.7.5](https://youtu.be/cakE2a9MedM)


## Features

- Quest Log windows that lists all quests divided into `In Progress`, `Completed` and `Failed` tabs
- Quest creator with WYSIWYG editors for description and GM notes
- Quest objectives
- Draggable Item rewards
- Fully editable Quest Details window
- Personal Quests
- Quest Branching in the form of Sub Quests

## Future plans (current ideas)

Plans for future include:

- advanced sorting with additional data fields including user tagging.
- experience / currency rewards with the option to split amongst the party.

You can **always** check current and up-to-date [planned and requested features here](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/issues?q=is%3Aopen+is%3Aissue+label%3Aenhancement)

_If you have **any** suggestion or idea on new contents, hit me up on Discord!_

## Translations

If you are interested in translating my module, simply make a new Pull Request with your changes, or contact me on Discord.

#### How to contribute

Please leave your preferred attribution name and optional email address in the AUTHORS file. Your GitHub noreply address can be found with [this tool](https://caius.github.io/github_id/) (use `<id+username@users.noreply.github.com>`).

#### How to translate

The League maintains the English translation of this module, so you check on that one to see how a translation file should look. It can be either expanded (nested) JSON like English, or flat JSON like Polish.

Order of Localization Strings inside a `.json` file is indifferent.

Localization file **must be** either completely flat, or completely expanded (nested). Not partially both.

Please provide your attribution name and optional email address.

#### What is `missing` Folder?

The `lang/missing/` folder contains files for all languages showing all Localization Strings that are in the Module, but are not covered by that Language. For example, there are 6 strings not covered by Polish language, but since they are simply `API Error` messages, there is no need.

## Contact

Michael Leahy aka TyphonJS is currently maintaining and adding new features as the main developer for Forien's Quest Log.

We request that you contact MLeahy#4299 for permission to use the name **Forien's Quest Log** in your fanworks, self-promotions, and advertisements. Do not use Forien's name or the names of other contributors without permission.

Please feel free to join the following Discord servers:
- [TyphonJS Discord server / current main FQL developer](https://discord.gg/mnbgN8f) for any questions.
- [League of Foundry Developers Discord server](https://discord.gg/gzemMfHURH)

## Acknowledgments

- Thanks to TyphonJS for significant improvements from `v0.7.0+` onward. 
- Great thanks to sdenec for his invaluable help with UI overhaul!
- Thanks to Atropos for his relentless work on developing and improving the Foundry VTT
- Thanks to necxelos, TomChristoffer and Kralug for their massive lists of suggestions
- Thanks to Brother Sharp for providing Japanese translation
- Thanks to Acd-Jake for providing German translation
- Thanks to KLO for providing Korean translation
- Thanks to rectulo and Naoki for providing French translation
- Thanks to JJBocanegra for providing Spanish translation
- Thanks to Ztt1996 for providing Chinese translation
- Thanks to Innocenti for providing Brazilian Portuguese translation

## Support (Historical)

The original author, Forien, is no longer actively maintaining FQL, but for historical correctness please visit: [Foundry Workshop Patreon](https://www.patreon.com/foundryworkshop).

## License

Forien's Quest Log is a module for Foundry VTT by Forien and is licensed under a [MIT License](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/LICENSE). List of contributors in [AUTHORS file](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/AUTHORS).

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development from February 17, 2021](https://foundryvtt.com/article/license/).
