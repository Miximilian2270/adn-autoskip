# ADN Auto Skip with Settings

![Version](https://img.shields.io/badge/version-2.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-ADN-orange)
![Languages](https://img.shields.io/badge/languages-EN%20|%20DE%20|%20FR-yellow)

A userscript that automatically skips intro, recap, credits, and next episode prompts on [Animation Digital Network (ADN)](https://animationdigitalnetwork.com) with a modern glassmorphism settings panel.

<p align="center">
  <img src="https://img.shields.io/badge/UI-Glassmorphism-blueviolet" />
  <img src="https://img.shields.io/badge/themes-Dark%20%7C%20Light-informational" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20DE%20%7C%20FR-success" />
</p>

## ✨ Features

### ⏭ Auto Skip
- **Intro** — Automatically skips opening sequences
- **Recap** — Skips episode recaps
- **Credits/Ending** — Skips ending credits
- **Next Episode** — Auto-advances to the next episode
- **Configurable delay** — 0–60000ms before auto-clicking
- **Per-category toggle** — Enable/disable each skip type
- **Suppress once** — Temporarily block the current skip button

### 🎨 Modern UI
- **Glassmorphism design** — Frosted glass with backdrop blur
- **Graceful fallback** — Solid backgrounds on browsers without `backdrop-filter`
- **Card-based layout** — Settings grouped into visual cards
- **Pill-style tabs** — ⚙ General · ⏭ Skip · ⌨ Keys · 🔧 System
- **Dark & Light themes** — Seamless switching
- **Micro-animations** — Smooth transitions on every interaction
- **Status indicator** — Color-coded dot on the gear button
- **Toast notifications** — Non-blocking slide-in feedback for all actions
- **Fullscreen-aware** — UI auto-hides during fullscreen playback
- **Responsive** — Adapts to small screens and viewport heights
- **Click-outside-to-close** — Panel closes when clicking elsewhere
- **Accessibility** — Focus-visible states, ARIA labels, keyboard navigation

### ⌨ Hotkeys
All hotkeys are fully customizable:

| Default Key | Action |
|---|---|
| `F8` | Toggle auto-skip on/off |
| `F9` | Pause/resume auto-skip |
| `Ctrl+→` | Skip intro (or jump forward) |
| `Ctrl+←` | Jump back to intro start |
| `↓` | Suppress current skip once |
| `Shift+?` | Show hotkey cheatsheet |

### 🌐 Languages
Fully translated with automatic detection:
- 🇬🇧 **English**
- 🇩🇪 **Deutsch**
- 🇫🇷 **Français** (ADN is a French platform!)

### 🔄 Update System
- **Daily automatic check** via GitHub Releases API
- **Floating banner** with changelog display
- **"Remind me later"** — 4 hour snooze
- **"Ignore this version"** — Permanent dismiss per version
- **Release page link** — View details on GitHub
- **Multi-tab safe** — Only one tab checks at a time, lock released on unload
- **Progress indicator** — Visual feedback during checks

### 💾 Settings Management
- **Import/Export** — Save and restore settings as JSON with type validation
- **Auto migration** — Deprecated settings cleaned up on upgrade
- **Reset to defaults** — One-click factory reset

## 📦 Installation

### Prerequisites
You need a userscript manager:
- [Tampermonkey](https://www.tampermonkey.net/) (recommended)
- [Violentmonkey](https://violentmonkey.github.io/)
- [Greasemonkey](https://www.greasespot.net/)

### Install
Click the link below — your userscript manager handles the rest:

### **[⬇️ Install ADN Auto Skip](https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js)**

### Update
Updates are checked automatically once per day. When available:
1. A floating banner appears with the changelog
2. Click **"Install now"** to update
3. Or click **"Later"** / **"Ignore"**

Manual check: **System tab → Check now**

## 🖥️ Usage

1. Go to [animationdigitalnetwork.com](https://animationdigitalnetwork.com)
2. The **gear button** appears in the bottom-right corner:

| Dot Color | Status |
|---|---|
| 🟢 Green | Auto-skip active |
| 🟡 Yellow | Temporarily paused |
| 🔴 Red | Disabled |
| 🔴 Pulsing | Update available |

3. Click the gear to open the **settings panel**
4. Configure your preferences across four tabs

### ⚙ General Tab
| Setting | Description | Default |
|---|---|---|
| Enable Auto Skip | Master on/off switch | ✅ On |
| Delay (ms) | Wait before clicking skip | 3500 |
| Theme | Dark or Light | Dark |
| Pause (min) | Pause timer duration | 5 |
| Notifications | Show toast popups | ✅ On |

### ⏭ Skip Tab
| Setting | Description | Default |
|---|---|---|
| Skip Intro | Auto-skip intros | ✅ On |
| Skip Recap | Auto-skip recaps | ✅ On |
| Skip Credits | Auto-skip endings | ✅ On |
| Skip Next Episode | Auto-advance | ✅ On |
| Require player context | Strict detection | ❌ Off |
| Jump seconds | Hotkey jump distance | 85 |

### ⌨ Keys Tab
Click any field → press your desired key combination → saved automatically.
Press `Escape` to cancel.

### 🔧 System Tab
- Debug logging toggle
- Auto update check toggle
- Import / Export settings (JSON with type validation)
- Update status with version comparison
- Manual update check + install

## 🛡️ Permissions

| Permission | Reason |
|---|---|
| `GM_xmlhttpRequest` | Fetch update info from GitHub |
| `@connect raw.githubusercontent.com` | Download script updates |
| `@connect api.github.com` | Check releases and tags |

## 🔧 Technical Details

| Feature | Implementation |
|---|---|
| **Detection** | `data-testid` attributes on ADN skip buttons |
| **Observation** | MutationObserver + 900ms polling fallback |
| **Storage** | `localStorage` under `ADN_AUTO_SKIP_SETTINGS_V1` |
| **Migration** | `KNOWN_KEYS` whitelist, auto-cleanup, type validation |
| **Cooldown** | 3s per-button via `WeakMap` |
| **Multi-tab** | localStorage lock with 30s TTL, released on unload |
| **Fullscreen** | `fullscreenchange` + `webkitfullscreenchange` |
| **i18n** | Key-based with `{var}` interpolation, 3 languages |
| **UI** | CSS custom properties, `backdrop-filter` with `@supports` fallback |
| **Toasts** | Non-blocking (`pointer-events: none`), auto-dismiss |
| **Cleanup** | All observers, timers, and locks cleaned on `beforeunload` |

## 📋 Version History

| Version | Date | Highlights |
|---|---|---|
| **2.0.1** | 2025-01-24 | 11 bugfixes: toast click-through, cheatsheet leak, F1 conflict, export mutation, banner memory leak, responsive panel, lock cleanup, i18n fix, backdrop fallback, timer cleanup, import validation |
| **2.0.0** | 2025-01-24 | Glassmorphism UI, FR localization, toasts, cheatsheet, import/export |
| 1.9.1 | 2025-01-24 | Settings migration, fullscreen awareness, multi-tab lock |
| 1.9.0 | 2025-01-24 | Update banner with changelog, snooze/ignore, status dot |
| 1.8.1 | 2025-01-23 | Tabbed settings, hotkeys, theme, pause timer |
| 1.0.0 | 2025-01-22 | Initial release |

See [CHANGELOG.md](CHANGELOG.md) for full details.

## 📝 License

[MIT](LICENSE) — feel free to use, modify, and distribute.

## 🙏 Credits

- Inspired by [Crunchyroll Auto Skip](https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings)
- Inspired by [MALSync](https://github.com/MALSync/MALSync)
- Built with assistance from AI

## 🐛 Issues & Contributing

Found a bug or have a feature request?
→ **[Open an issue](https://github.com/Miximilian2270/adn-autoskip/issues)**

Want to contribute?
→ Fork, branch, commit, PR — all welcome!
