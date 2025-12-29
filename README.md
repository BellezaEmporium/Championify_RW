![Championify](src/img/logo.png)

# Championify

_Champion-If-Ayyy_

[![Crowdin Translation Status](https://badges.crowdin.net/championify/localized.svg)](https://crowdin.com)

Latest Release Downloads: [![Downloads](https://img.shields.io/github/downloads/BellezaEmporium/Championify-RW/latest/total.svg)](https://github.com/BellezaEmporium/Championify-RW/releases/latest)

This is a current Work in Progress based on Dustin's amazing work.

Championify is a little program that downloads all the recent item sets from popular websites like U.gg and imports them in to your League of Legends to use within game! No hassle.
Championify supports 39 languages and with plenty of new features planned and in the works!

Windows and OSX are both supported, tested on Windows 10 and OSX 10.12.1.

Check out screenshots [here](https://imgur.com/a/vgS3I)!

There's also [Championify for Android](https://github.com/OmerValentine/Championify-Android)!

---

## Features
- Summoners Rift and ARAM Item Sets
- 7 Sources (KoreanBuilds/EuropeanBuilds, op.gg, u.gg, Mobalytics (TBA), Tracker.gg, and Probuilds)
- Skill Priorities lists (Q.W.E.Q.E.R) or Q>E>W
- 41 Languages (over Crowdin)
- Bunch of preferences to display item sets in the way you prefer
- Automatically save preference settings
- Garena support
- Does not touch other item sets that you or other applications create

## Downloads
Found [here](https://github.com/BellezaEmporium/Championify-RW/releases/latest)

## [Change Log](CHANGELOG.md)

## Contribute
Please see [CONTRIBUTING.md](./.github/CONTRIBUTING.md)

## [FAQ](FAQ.md)
See [FAQ.md](FAQ.md)

## Command Line Parameters
Championify supports a few command line parameters for those who would like to automate a few tasks before it's official supported within the app. Params work on both Windows and OSX, and uses the last saved preferences made on the app (preferences are saved each time you hit import). The command line prefs do need improvement and can be tracked [here](https://github.com/dustinblackman/Championify/issues/165).

__Params__

- `--import` Imports item sets
- `--delete` Deletes item sets
- `--autorun` Silently (without loading the UI) imports item sets
- `--close` Closes Championify when finished
- `--start-league` Starts League of Legends after import

__Example__

Silently imports and starts League afterwards after installing Championify with the Windows Installer. As Squirrels
generates the main `championify.exe`, `--processStartArgs` must be used before all other command line options.

```cmd
C:\Users\YOURNAME\AppData\Local\Championify\championify.exe --processStartArgs --autorun --start-league
```

<a name="source" />

## Build From Source
You must have Node 12, Rust (via Rustup) 1.63.0 minimum, and npm 9 installed on your system, git clone the repo and run the following in the root folder.

__OSX:__
```bash
npm i
npm run package
```

__Windows:__
```bash
npm i
npm run package
```

You'll find a Championify.exe/Championify.app in the releases folder.

(NOTE THAT I CANNOT SIGN MAC OS APPS)

Wine is required if building on Mac for Windows.
```bash
brew install wine
```

## Backers

See [BACKERS.md](BACKERS.md)

## Credit
- Icon by [Omer Levy](http://github.com/OmerValentine)
- Package icon by [Becris](http://www.flaticon.com/free-icon/new-product_166913#term=new&page=2&position=96)
- [KoreanBuilds](https://koreanbuilds.net)
- [Probuilds](https://probuilds.net)
- [op.gg](https://op.gg)
- [u.gg](https://u.gg

## Thank yous
- [@sargonas](https://github.com/sargonas) and the rest of the Riot API team for unlocking item sets
- All the wonderful people on my [Transifex team](https://www.transifex.com/dustinblackman/championify/) (all 180 of you) for helping translate Championify!

## [License](LICENSE)

The original Championify project and this current rework aren't endorsed by any of it's content sources or Riot Games and doesn't reflect the views or opinions of them or anyone officially involved in producing or managing League of Legends.
League of Legends and Riot Games are trademarks or registered trademarks of Riot Games, Inc. League of Legends © Riot Games, Inc.
