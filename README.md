# FoundryVTT - Forien's Quest Log

![FQL Version](https://img.shields.io/badge/dynamic/json?url=https://raw.githubusercontent.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/master/module.json&label=Forien%27s+Quest+Log+version&query=version&style=flat-square&color=success")
![Foundry Core Compatible Version](https://img.shields.io/badge/dynamic/json.svg?url=https%3A%2F%2Fraw.githubusercontent.com%2FLeague-of-Foundry-Developers%2Ffoundryvtt-forien-quest-log%2Fmaster%2Fmodule.json&label=Foundry%20Version&query=$.compatibleCoreVersion&colorB=orange)
![GitHub release](https://img.shields.io/github/release-date/League-of-Foundry-Developers/foundryvtt-forien-quest-log)
[![GitHub commits](https://img.shields.io/github/commits-since/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest)](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/commits/)
![the latest version zip](https://img.shields.io/github/downloads/League-of-Foundry-Developers/foundryvtt-forien-quest-log/latest/module.zip)
![Forge installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fforien-quest-log)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Fforien-quest-log%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/forien-quest-log/)

[![Weblate Translations](https://weblate.foundryvtt-hub.com/widgets/forien-quest-log/-/287x66-grey.png)](https://weblate.foundryvtt-hub.com/engage/forien-quest-log/)

This module provides comprehensive Quest Log system for players and Game Masters to use with [Foundry VTT](https://foundryvtt.com/).

**[Compatibility]**: _FoundryVTT_ `v11` as of FQL version `0.7.12`. For `v9` / `v10` use FQL `0.7.11`

**[Game Systems]**: _any_

**[Language Translations]**: _Chinese (simplified / traditional), Dutch, English, Finnish, French, German, Italian, Japanese, Korean, Polish, 
Portuguese (Brazil), Russian, Spanish, Swedish_

## Installation

1. (Recommended) Install Forien's Quest Log from the Foundry package manager directly. 
   - _or_ manually using the manifest URL: `https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/releases/latest/download/module.json`


2. While loaded in your World, enable **_Forien's Quest Log_** in the `Module Management` configuration. 

## Recent Updates

The minor `0.7.12` update to FQL:

- Foundry v11 support.
- Removed support for v9 / v10 to prevent any compatibility warnings.
- Fixed minor TinyMCE configuration for correct font support.
- Updated Spanish translation.

The minor `0.7.11` update to FQL:

- Corrects a new compatibility warning that came up w/ the 10.285 Foundry release.
- Provides workarounds for various misbehaving game systems (Gurps / L5R).
- Refines the "show quest log to players" feature showing the players the specific quest status tab the GM currently
  has selected.
- Adds a Dutch language translation.

The `0.7.10` update to FQL brings compatibility for _both_ version 9 & 10 of Foundry VTT and includes several 
quality of life enhancements:

- Quest document linking is enabled again.
- Show quest log to players link in quest log app header (for GM).
- Show quest tracker to players with icon in quest tracker header (for GM).
- Ability to set quest tracker to transparent via fill icon in app header.
- Expanded language / translation support.

## Usage

A button to access the Quest Log is situated on the bottom of Journal Directory or in the left hand scene controls icon 
toolbar under notes / journal entries where two new icons (scroll and list) opens the Quest Log and Quest Tracker. There
also are two `macro compendiums` available for FQL that provide ready to go macros to drop onto your hotbar that allow
convenient access to FQL for players and several GM related options.

There is a series of useful in depth video tutorials on YouTube that cover each recent release:
- [v0.7.10](https://youtu.be/jaQJtCZOiIY)
- [v0.7.7](https://youtu.be/lfSYJXVQAcE)
- [v0.7.6](https://youtu.be/Dn2iprrcPpY)
- [v0.7.5](https://youtu.be/cakE2a9MedM)

FQL is quite user-friendly with an intuitive UI, however you might want to [check out the Wiki](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/wiki) for more detailed usage including macros and Quest API details for external developers integrations. 

## Features

- Quest Log windows that lists all quests divided into `In Progress`, `Completed` and `Failed` tabs.
- Quest creator with WYSIWYG editors for description and GM notes.
- Quest objectives.
- Draggable Item rewards.
- Fully editable Quest Details window.
- Personal Quests.
- Quest Branching in the form of Sub Quests.

## About

This module is hosted by the [League of Foundry Developers Discord](https://discord.gg/gzemMfHURH). The
`0.7.x` series of FQL is developed and maintained by [TyphonJS](https://github.com/typhonrt) / [TyphonJS Discord](https://discord.gg/mnbgN8f)
and is being updated for stability across core Foundry updates. This stability and long term maintenance of such is the
_main feature_ of FQL presently. You can rest assured that the quest log experience you know and _love_ will continue
to be available now and into the future.

A new continuation quest log module is in the works by TyphonJS that moves the questing experience beyond FQL and is
being developed at [typhonjs-fvtt/typhonjs-quest-log](https://github.com/typhonjs-fvtt/typhonjs-quest-log). There is no
specific ETA for this continuation module at this time. In the meantime FQL continues to bring an essential rock solid
quest log experience to Foundry VTT. TyphonJS is developing a [very modern UI library](https://github.com/typhonjs-fvtt-lib),
available for any 3rd party Foundry developer right now, that underpins this new quest log and full time+ work has been
ongoing on this effort since October 2021. When this library is completed then work on the new quest log will be
finished.

## Translations

FQL uses Weblate to coordinate language translation from community translators. Through this interface you are able to
provide language corrections and translations. I am more than willing to support even more language translations for
FQL, so if your language isn't represented yet please visit the [FQL Weblate Portal](https://weblate.foundryvtt-hub.com/engage/forien-quest-log/)
and get in contact.

## Future plans (current ideas)

Rock solid stability through future releases of Foundry VTT and even more language / internationalization support.
At this time a few quality of life features may be added in any given release as well, but major new feature 
development will progress in the forthcoming continuation quest log module. Please file any ideas and review the planned
new feature developments in the [TyphonJS Quest Log Issue Tracker](https://github.com/typhonjs-fvtt/typhonjs-quest-log/issues)

_If you think you have found a bug or usability issue with FQL itself please file an issue in the 
[FQL Issue Tracker](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/issues)_.

_If you have **any** suggestion or idea on new features please get in contact on my [Discord Server](https://discord.gg/mnbgN8f).
Over the `0.7.x` release series I have implemented almost all community suggestions that improve the quest log 
experience._

## Contact

Michael Leahy aka TyphonJS developed the `0.7.x` series of FQL releases and provides ongoing maintenance. 

Please feel free to join my Discord server to get in touch:
- [TyphonJS Discord server / current main FQL developer](https://discord.gg/mnbgN8f) for any questions.

## Acknowledgments

See [Authors](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/AUTHORS) and
[Contributors](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/graphs/contributors)

## Support (Historical)

The original author, Forien, is no longer actively maintaining FQL, but for historical correctness please visit: [Foundry Workshop Patreon](https://www.patreon.com/foundryworkshop).

## License

Forien's Quest Log is a module for Foundry VTT by Forien and is licensed under a [MIT License](https://github.com/League-of-Foundry-Developers/foundryvtt-forien-quest-log/blob/master/LICENSE). 

This work is licensed under Foundry Virtual Tabletop [EULA - Limited License Agreement for module development from February 17, 2021](https://foundryvtt.com/article/license/).
