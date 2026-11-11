# ADN Auto Skip with Settings

![Version](https://img.shields.io/badge/version-2.1.2-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-ADN-orange)
![Languages](https://img.shields.io/badge/languages-EN%20|%20DE%20|%20FR-yellow)

A userscript that automatically skips intro, recap, credits, and next episode prompts on [Animation Digital Network (ADN)](https://animationdigitalnetwork.com) with a modern glassmorphism settings panel.

<p align="center">
  <img src="https://img.shields.io/badge/UI-Glassmorphism-blueviolet" />
  <img src="https://img.shields.io/badge/themes-Auto%20%7C%20Dark%20%7C%20Light-informational" />
  <img src="https://img.shields.io/badge/i18n-EN%20%7C%20DE%20%7C%20FR-success" />
</p>

## ✨ Features

### ⏭ Auto Skip
- **Intro** — Automatically skips opening sequences
- **Recap** — Skips episode recaps
- **Credits/Ending** — Skips ending credits
- **Next Episode** — Auto-advances to the next episode
- **Visible countdown** — Button in the player shows „Skipping intro in 3s“ with a progress ring
- **Cancel per click or hotkey** — Cancel the pending skip, re-enable with a second click
- **Configurable delay** — Slider 0–10 s before auto-clicking
- **Per-category toggle** — Enable/disable each skip type

### 🎨 Modern UI
- **Glassmorphism design** — Frosted glass with backdrop blur
- **Graceful fallback** — Solid backgrounds on browsers without `backdrop-filter`
- **Card-based layout** — Settings grouped into visual cards
- **Pill-style tabs with icons** — General · Skip · Keys · System; the tab bar stays in place while switching
- **Auto, Dark & Light themes** — Auto follows the system setting
- **Micro-animations** — Short, purposeful transitions (≤ 250 ms, shared ease-out curve); keyboard-triggered UI appears instantly
- **Compact gear button** — Color-coded dot + icon, status text on hover; position selectable, optional auto-hide
- **Toast notifications** — Non-blocking slide-in feedback for all actions, also in fullscreen
- **Fullscreen-aware** — Gear, panel and banner hide during fullscreen playback
- **Auto fullscreen** — Optional fullscreen when an episode starts playing
- **Responsive** — Adapts to small screens and viewport heights
- **Click-outside-to-close** — Panel closes when clicking elsewhere or pressing `Escape`
- **Accessibility** — Focus-visible states, ARIA roles and labels, arrow-key tab navigation, reduced-motion support

### ⌨ Hotkeys
All hotkeys are fully customizable. Duplicate assignments are marked red, and each hotkey can be cleared:

| Default Key | Action |
|---|---|
| `F8` | Toggle auto-skip on/off |
| `F9` | Pause/resume auto-skip |
| `Ctrl+→` | Skip intro (or jump forward) |
| `Ctrl+←` | Jump back to intro start |
| `↓` | Cancel current skip |
| `Shift+?` | Show hotkey cheatsheet |

### 🌐 Languages
Fully translated; automatic detection or manual selection (General → Appearance):
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
| 🔵 Pulsing ring | Update available (accent-colored border, „· UPDATE“ next to the status) |

The status text next to the dot appears on hover and stays visible while auto-skip is off, paused (remaining time as `m:ss`) or an update is available.

3. Click the gear to open the **settings panel**
4. Configure your preferences across four tabs

### ⚙ General Tab
| Setting | Description | Default |
|---|---|---|
| Enable Auto Skip | Master on/off switch | ✅ On |
| Delay | Slider, wait before clicking skip (0–10 s) | 3.5 s |
| Auto fullscreen | Enter fullscreen when playback starts | ❌ Off |
| Theme | Auto, Dark or Light | Dark |
| Language | Auto, English, Deutsch, Français | Auto |
| Notifications | Show toast popups | ✅ On |
| Button position | Corner of the gear button | Bottom right |
| Hide button when idle | Fade the gear after 3 s of inactivity | ❌ Off |

The footer shows the current status, the pause duration (minutes) and a Pause/Resume button.

### ⏭ Skip Tab
| Setting | Description | Default |
|---|---|---|
| Skip Intro | Auto-skip intros | ✅ On |
| Skip Recap | Auto-skip recaps | ✅ On |
| Skip Credits | Auto-skip endings | ✅ On |
| Skip Next Episode | Auto-advance | ✅ On |
| Require player context | Strict detection | ❌ Off |

### ⌨ Keys Tab
Click any field → press your desired key combination → saved automatically.
Press `Escape` to cancel, `×` to clear a hotkey. Duplicate hotkeys are marked red.

| Setting | Description | Default |
|---|---|---|
| Jump seconds | Hotkey jump distance when no skip button is visible | 85 |

### 🔧 System Tab
- Debug logging toggle
- Auto update check toggle
- Import / Export settings (JSON with type validation)
- Reset all (click twice to confirm)
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
| **Migration** | `KNOWN_KEYS` whitelist, auto-cleanup, type validation, value sanitizing (settings v7) |
| **Cooldown** | 3s per-button via `WeakMap` |
| **Multi-tab** | localStorage lock with 30s TTL, released on unload |
| **Fullscreen** | `fullscreenchange`, `webkitfullscreenchange`, optional auto-fullscreen on `playing` |
| **i18n** | Key-based with `{var}` interpolation, 3 languages |
| **UI** | CSS custom properties, `backdrop-filter` with `@supports` fallback |
| **Toasts** | Non-blocking (`pointer-events: none`), auto-dismiss, rendered inside the fullscreen element in fullscreen |
| **Countdown** | Pending clicks tracked in a `Map`, progress ring via `requestAnimationFrame` + `conic-gradient` |
| **Cleanup** | All observers, timers, and locks cleaned on `beforeunload` |

## 📋 Version History

| Version | Date | Highlights |
|---|---|---|
| **2.1.2** | 2026-11-11 | Motion polish: faster, explicit transitions with a shared easing curve, press feedback, no animation for keyboard-triggered UI, reduced-motion keeps fades. |
| **2.1.1** | 2026-11-08 | Gear button: pause time as `m:ss`, update indicator in accent color instead of red. |
| **2.1.0** | 2026-11-08 | UI overhaul: skip countdown in the player, toasts in fullscreen, language/theme/gear position options, hotkey conflict detection, accessibility; fixes for arrow-key hotkeys and update-section flicker. |
| **2.0.5** | 2026-10-29 | Auto fullscreen on playback start (optional, once per episode). |
| **2.0.2** | 2026-04-17 | UI fix: Restored dynamic panel height and moved tabs to the bottom to prevent layout jumping. |
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
