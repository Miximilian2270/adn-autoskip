# ADN Auto Skip with Settings

![Version](https://img.shields.io/badge/version-1.9.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-ADN-orange)

A userscript that automatically skips intro, recap, credits, and next episode prompts on [Animation Digital Network (ADN)](https://animationdigitalnetwork.com) with a fully configurable settings panel.

## ✨ Features

### Auto Skip
- **Intro** — Automatically skips opening sequences
- **Recap** — Skips episode recaps
- **Credits/Ending** — Skips ending credits
- **Next Episode** — Auto-advances to the next episode
- **Configurable delay** — Set how long to wait before skipping (0–60000ms)
- **Per-category toggle** — Enable/disable each skip type individually
- **Suppress once** — Temporarily prevent skipping the current button

### Settings Panel
- **Tabbed interface** — General, Skipping, Hotkeys, System
- **Dark/Light theme** — Choose your preferred UI style
- **Pause timer** — Temporarily pause auto-skip for 1–180 minutes
- **Click-outside-to-close** — Panel closes when clicking elsewhere
- **Version badge** — Current version always visible
- **Status indicator** — Color-coded dot on the gear button

### Hotkeys
All hotkeys are fully customizable via the settings panel:

| Default Key | Action |
|---|---|
| `F8` | Toggle auto-skip on/off |
| `F9` | Pause/resume auto-skip |
| `Ctrl+→` | Skip intro (or jump forward) |
| `Ctrl+←` | Jump back to intro start |
| `↓` | Suppress current skip button once |

### Update System
- **Daily automatic update check** via GitHub Releases API
- **Floating update banner** with changelog display
- **"Remind me later"** — Snooze notifications for 4 hours
- **"Ignore this version"** — Permanently dismiss a specific version
- **Release page link** — View full release details on GitHub
- **Progress indicator** — Visual feedback during update checks
- **Version comparison** — Color-coded in System tab (green = current, red = update available)

## 📦 Installation

### Prerequisites
You need a userscript manager:
- [Tampermonkey](https://www.tampermonkey.net/) (recommended)
- [Violentmonkey](https://violentmonkey.github.io/)
- [Greasemonkey](https://www.greasespot.net/)

### Install
Click the link below — your userscript manager will handle the rest:

**[⬇️ Install ADN Auto Skip](https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js)**

### Update
Updates are checked automatically once per day. When an update is available:
1. A floating banner appears with the changelog
2. Click **"Install now"** to update via your userscript manager
3. Or click **"Remind me later"** / **"Ignore this version"**

You can also manually check for updates in the **System** tab.

## 🖥️ Usage

1. Go to [animationdigitalnetwork.com](https://animationdigitalnetwork.com)
2. A **gear button** appears in the bottom-right corner:
   - 🟢 Green dot = Auto-skip active
   - 🟡 Yellow dot = Temporarily paused
   - 🔴 Red dot = Disabled
   - 🔴 Pulsing = Update available
3. Click the gear to open the **settings panel**
4. Configure your preferences across the four tabs

### Panel Tabs

#### General
| Setting | Description | Default |
|---|---|---|
| Enable Auto Skip | Master on/off switch | ✅ On |
| Delay (ms) | Wait time before clicking skip | 3500 |
| Theme | Dark or Light mode | Dark |
| Pause duration | How long the pause timer runs | 5 min |

#### Skipping
| Setting | Description | Default |
|---|---|---|
| Skip Intro | Auto-skip intro sequences | ✅ On |
| Skip Recap | Auto-skip recaps | ✅ On |
| Skip Credits/Ending | Auto-skip endings | ✅ On |
| Skip Next Episode | Auto-advance episodes | ✅ On |
| Require player context | Only detect buttons inside player | ❌ Off |
| Jump seconds | Seconds to jump with hotkey | 85 |

#### Hotkeys
Click any hotkey field, then press your desired key combination. Press `Escape` to cancel.

#### System
- Toggle debug logging
- Enable/disable automatic update checks
- View update status, installed version, and latest version
- Manually trigger update check

## 🛡️ Permissions

| Permission | Reason |
|---|---|
| `GM_xmlhttpRequest` | Fetch update info from GitHub API |
| `@connect raw.githubusercontent.com` | Download script updates |
| `@connect api.github.com` | Check releases and tags |

## 🔧 Technical Details

- **Detection**: Uses `data-testid` attributes on ADN's skip buttons for reliable classification
- **Observation**: MutationObserver on `document.documentElement` + 900ms polling fallback
- **Storage**: All settings persisted in `localStorage` under `ADN_AUTO_SKIP_SETTINGS_V1`
- **Cooldown**: 3-second click cooldown per button to prevent double-clicks
- **Cleanup**: All observers and timers are properly disconnected on `beforeunload`

## 📝 License

[MIT](LICENSE) — feel free to use, modify, and distribute.

## 🙏 Credits

- Inspired by [Crunchyroll Auto Skip with Settings](https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings)
- Inspired by [MALSync](https://github.com/MALSync/MALSync)
- Built with assistance from GPT-5.3-Codex

## 🐛 Issues

Found a bug or have a feature request?
→ [Open an issue](https://github.com/Miximilian2270/adn-autoskip/issues)

## Disclaimer
This project is unofficial and not affiliated with ADN.
Use at your own risk. Website changes may require selector updates.
