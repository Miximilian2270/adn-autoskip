# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.2] - 2026-11-11

### Changed
- **Motion polish** (based on Emil Kowalski's design engineering rules):
  - Shared easing token `--as-ease-out: cubic-bezier(.23,1,.32,1)`; all `transition: all` replaced by explicit properties.
  - Panel opens in 200 ms and closes in 150 ms; closing with `Escape` is instant.
  - Cheatsheet (keyboard-only) and tab switching are no longer animated.
  - Toasts enter and leave on the same side (bottom, or top in fullscreen), 250 ms in / 180 ms out, from `scale(.96)`.
  - Update banner 250 ms in / 180 ms out instead of 400 ms; toggles 200 ms.
  - Press feedback (`scale(.97)` on `:active`) for gear, buttons, tabs, close buttons and the player countdown button; gear hover only on devices with a real pointer, without lift.
  - Countdown progress (`--p`) is set on the ring element instead of the button.
  - `prefers-reduced-motion`: movement is removed, short opacity fades (150 ms) remain.

## [2.1.1] - 2026-11-08

### Changed
- **Pause countdown** — Gear button and panel footer show the remaining pause time as `m:ss` (e.g. `PAUSE 4:32`, `h:mm:ss` above one hour) instead of seconds.
- **Update indicator** — The gear's update dot uses the accent color with a pulsing ring instead of a red pulse, so it can no longer be mistaken for „off“. The gear also gets an accent border and shows „… · UPDATE“ next to the status.

## [2.1.0] - 2026-11-08

### Added
- **Skip countdown in the player** — While a skip is pending, a button next to ADN's skip button shows „Skipping intro in 3s · Cancel [↓]“ with a progress ring. Click (or the cancel hotkey) cancels the skip; a second click re-enables it.
- **Toasts in fullscreen** — Toasts and the cheatsheet are now rendered inside the fullscreen element (top center) instead of being hidden.
- **Language selection** — Auto / English / Deutsch / Français in General → Appearance; the panel rebuilds instantly.
- **Auto theme** — Follows the system color scheme (`prefers-color-scheme`); theme options are now translated.
- **Gear position & auto-hide** — Gear can be placed in any corner; optional fade-out after 3 s of inactivity.
- **Hotkey conflict detection** — Duplicate hotkeys are marked red with a warning; new × button to clear a hotkey.
- **Accessibility** — Escape closes the panel, arrow-key tab navigation, ARIA roles for tabs/dialog, translated `aria-label`s, `prefers-reduced-motion` support.

### Changed
- **Gear button** — Compact (dot + icon); status text expands on hover or when status is not „on“.
- **Delay** — Slider from 0 to 10 s in 0.5 s steps (values above 10 s are clamped on migration).
- **Settings layout** — Titled cards (Behavior, Appearance, Categories, Detection, Hotkeys, Jump, Updates, Settings, Maintenance); „Jump seconds“ moved to the Keys tab.
- **Tabs** — SVG icons instead of emojis; the tab bar sits on the gear side of the panel (bottom for bottom positions, top for top positions) so it stays in place when switching tabs.
- **Footer** — Single Pause/Resume toggle with inline pause duration; „Reset all“ moved to the System tab as a danger button.
- **Confirmations** — „Reset all“ and „Ignore version“ use an inline double-click confirmation instead of `confirm()`.
- Settings version bumped to 7 (`lang`, `gearPos`, `gearAutoHide`).
- Regenerated `DOCUMENTATION.md` via `create-docs.js`.

### Fixed
- **Re-recorded arrow-key hotkeys never triggered** — Stored values like `Control+→` are now normalized back to `arrowright` before matching.
- **Update section flicker** — The System tab update info was rebuilt every second, causing hover flicker, focus loss and a re-enabled „Check now“ button during a check; it now only rebuilds when the update state changes.
- **`npm run lint` on Windows** — The glob in `package.json` now uses double quotes so it works with `cmd.exe`.

## [2.0.5] - 2026-10-29

### Added
- **Auto fullscreen** — Optional setting to enter fullscreen when an episode starts playing. Triggers once per episode; if the browser blocks the request during autoplay, it retries on the next click inside the player.

### Fixed
- **Safari/iOS fullscreen detection** — `setupFS()` now also checks `webkitFullscreenElement` and listens for `webkitbeginfullscreen`/`webkitendfullscreen`.

## [2.0.4] - 2026-05-07

### Added
- **Reload page button** — Added a "Reload page" button to the System tab update section to manually reload the page and script after a Tampermonkey update install

## [2.0.3] - 2026-05-01

### Fixed
- **Semver comparison** — `cmpVer()` now uses `parseInt()` instead of `Number()` to correctly handle non-numeric version parts (e.g. pre-release tags)
- **Memory leak in buildPanel** — Outside-click listener is now stored and removed on re-invocation, preventing duplicate handlers

### Changed
- **Refactored setupKeys** — Extracted `handleKeydown()` helper, reducing cyclomatic complexity from 33 to 19
- **Updated documentation** — Regenerated `DOCUMENTATION.md` and added `create-docs.js` generator

## [2.0.2] - 2026-04-17

### Fixed
- **Settings panel layout** — Restored dynamic panel height and moved tabs to the bottom to prevent UI jumping when switching between tabs of different lengths.

## [2.0.1] - 2025-01-24

### Fixed
- **Toast click-through** — Toasts no longer block clicks on player controls (`pointer-events: none` on individual toasts)
- **Cheatsheet event leak** — Close handler is now properly stored and removed on every hide, preventing stacked listeners on repeated open/close
- **F1 browser conflict** — Default cheatsheet key changed from `F1` to `Shift+?` to avoid opening browser help; existing `F1` bindings are auto-migrated
- **Export mutation bug** — `exportS()` now clones settings before removing transient keys, preventing live settings object from being modified
- **Banner memory leak** — `innerHTML = ""` replaced with `while(firstChild) removeChild` in `refreshBanner()` and `refreshUpdInfo()` to prevent orphaned event listeners
- **Panel overflow on small screens** — `max-height` changed to `min(580px, calc(100vh - 90px))` with `flex-shrink: 0` on header and footer
- **Update lock not released on crash** — `unlockUpd()` now also called in `beforeunload` handler to prevent stale locks after browser crash or tab close
- **Duplicate i18n key** — Removed duplicate `"general.toasts"` entry in German translation
- **Backdrop-filter fallback** — Added `@supports not (backdrop-filter)` rule that increases background opacity to `.98` for browsers without blur support
- **Refresh timer leak** — `refreshTimer` is now tracked and cleared on `beforeunload` to prevent orphaned intervals during SPA navigation
- **Import type safety** — Import now validates each key's type against `DEFAULTS` and skips mismatched values with a debug warning

### Changed
- `fmtCombo()` and `fmtHint()` now share a single label map instead of duplicating arrow/modifier logic
- Cheatsheet overlay sets `csOverlay = null` immediately on hide to prevent double-close race condition
- Settings version bumped to 5
- Cheatsheet close handler stored as module-level `csCloseHandler` ref for reliable cleanup

## [2.0.0] - 2025-01-24

### Added
- **Glassmorphism UI** — Frosted glass effect with `backdrop-filter: blur(16px) saturate(1.4)`
- **Card-based layout** — Settings grouped into visual cards with clear hierarchy
- **Pill-style tabs** with emoji icons (⚙ ⏭ ⌨ 🔧)
- **Micro-animations** on every interaction (panel open, tab switch, toast, cheatsheet)
- **Accessibility** — `role="switch"` on toggles, `aria-label` on buttons, `focus-visible` outlines
- **Toast notifications** — Slide-in feedback for all actions (skip, toggle, pause, jump)
- **Hotkey cheatsheet overlay** — Fullscreen shortcut reference with blur backdrop
- **French localization** — Full FR translation (ADN is a French platform)
- **Import/Export settings** — Save and restore configuration as JSON
- **Configurable cheatsheet key** — Customize the help overlay hotkey
- **Show notifications toggle** — Disable toast popups if unwanted

### Changed
- Complete UI/UX overhaul with modern design language
- Gear button redesigned as pill shape with hover lift and active press effects
- Toggles enlarged to 40×22px with smoother knob animation
- Color palette improved for better contrast in both themes
- All CSS class names shortened (`adn-*` → `as-*`) for smaller footprint
- Settings version bumped to 4

### Fixed
- All v1.9.1 fixes included (migration, fullscreen, multi-tab lock, z-index)
- Consistent border-radius using CSS custom properties
- Theme switching applies instantly without flicker

### Removed
- Legacy `adn-*` CSS class naming (replaced with `as-*`)

## [1.9.1] - 2025-01-24

### Added
- Settings migration system with `KNOWN_KEYS` whitelist and `_settingsVersion` tracking
- Automatic cleanup of deprecated keys (`updateInstallPending`, `updateInstallWindow`) on load
- Fullscreen detection with `fullscreenchange` and `webkitfullscreenchange` listeners
- Gear button auto-hides in fullscreen mode
- Panel auto-closes when entering fullscreen
- Update banner hides during fullscreen playback
- Multi-tab update lock via `localStorage` with 30s TTL
- New update status `skipped_lock` shown when another tab is already checking
- `releaseUpdateLock()` in `finally` block to prevent stale locks

### Fixed
- Banner and panel no longer overlap (z-index: banner 2147483645, gear 2147483646, panel 2147483647)
- Settings panel now properly closes when entering fullscreen
- Update check no longer runs simultaneously in multiple tabs
- Deprecated settings keys from v1.8.x are automatically removed on upgrade
- Force update checks (manual "Check now") bypass the multi-tab lock

### Changed
- `loadSettings()` now runs `migrateSettings()` on every load
- Update banner checks `isFullscreen` before showing
- Progress bar is now recreated inside `refreshUpdateInfo()` for consistency

## [1.9.0] - 2025-01-24

### Added
- Floating update banner with changelog display from GitHub Releases
- "Remind me later" option (4 hour snooze) for update notifications
- "Ignore this version" option to permanently dismiss a specific update
- Status indicator dot on gear button (green = active, yellow = paused, red = off)
- Pulsing red dot animation when update is available
- Version badge (`v1.9.0`) in settings panel header
- Structured update info section in System tab with clear status rows
- Indeterminate progress bar during update checks
- Click-outside-to-close for settings panel
- GitHub Releases API integration for fetching changelogs
- Release page link in update banner and System tab
- `t()` and `isDe()` helper functions for cleaner localization

### Changed
- Redesigned entire update system from scratch
- Replaced `updateInstallPending` logic with cleaner snooze/ignore system
- Update banner now shows all newer releases combined
- System tab now shows version comparison with color coding (green = current, red = update available)
- Gear button now shows status dot instead of changing background color
- Simplified HTTP error handling with proper timeout support
- Improved panel footer layout with grouped quick actions

### Fixed
- Template literal syntax errors (`new Error\`...\`` → `new Error(...)`)
- Missing error handling for release API calls
- Hotkey inputs now properly ignore clicks on update banner

### Removed
- `updateInstallPending` setting (replaced by snooze/ignore system)
- Popup-based install flow (replaced by direct userscript manager install)
- `updateLastResult: "skipped"` state (no longer needed)

## 1.8.1
- Improved post-install auto-reload reliability:
  - added focus/visibility fallback reload when returning to the ADN tab with install pending
  - removed `noopener/noreferrer` from update-tab open call to improve closed-window detection

## 1.8.0
- Added automatic reload after update-install flow:
  - after `Install update`, the opened update tab is watched
  - when that tab is closed, the original page reloads automatically
- This reduces manual reload steps after successful Tampermonkey update install.

## 1.7.9
- Prevented duplicate delayed auto-click scheduling for the same visible skip button.
- Added pending-click tracking cleanup when delayed click executes.
- Improved hotkey guard to ignore keybind handling while interacting with the script UI (panel/gear).

## 1.7.8
- Stabilized settings panel layout across tab switches.
- Panel now keeps a consistent height and uses an internal scroll area for tab content.
- Fixed visual size jumping when switching between tabs with different content lengths.

## 1.7.7
- Fixed update-check edge cases and reduced unnecessary status writes.
- Improved tag lookup breadth (`per_page=100`) to reduce missed update detections.
- `Install update` now sets install-pending only when popup/tab opens successfully.
- Added explicit popup-blocked error feedback in the panel status.

## 1.7.6
- Added post-install reload flow for updates:
  - after clicking `Install update`, footer action switches to `Reload page now`
  - update status shows explicit reload hint until page reload
- `Reload page now` immediately activates the newly installed script version.

## 1.7.5
- Fixed stale update indicator after installing a new version.
- On startup, update check is now forced when previous state was `update available`.
- This clears red `SKIP` state and `update available` status immediately after successful install.

## 1.7.4
- Added footer `Install update` action button that is enabled only when an update is available.
- Button opens the Raw install URL to start Tampermonkey update/install directly.
- Added clearer disabled button states: `No update`, `Update off`, `Checking...`.

## 1.7.3
- Added userscript metadata URLs for direct Raw-based updates:
  - `@downloadURL`
  - `@updateURL`
- Added one-click Raw install link to README.

## 1.7.2
- Added visible update-check feedback in panel footer:
  - running / up to date / update available / error / disabled / interval skipped
  - includes last check timestamp and optional remote version/error
- Improved `Check update now` button with live checking state.

## 1.7.1
- Fixed update detection to support repository tags (e.g. `v1.7.0`) even when raw file version lags.
- Switched network update checks to `GM_xmlhttpRequest` for better Tampermonkey/CSP compatibility.
- Added manual `Check update now` button in the settings footer.

## 1.7.0
- **UI & UX Overhaul:**
  - Settings panel redesigned with a modern tabbed layout (General, Skipping, Hotkeys, System).
  - Replaced standard checkboxes with sleek iOS-style toggle switches.
  - Improved floating gear button with smoother animations and a cleaner design.
  - Re-engineered dark/light mode themes with robust CSS variables.
- **Internationalization (i18n):**
  - Added dynamic bilingual support based on browser language (`navigator.language`).
  - Button texts and UI elements default to English but switch to German for German-language browsers.
- **Visual Feedback:**
  - The in-player suppression button now visually turns green when the `ArrowDown` (suppress current skip) key is pressed to clearly confirm suppression.


## 1.6.0
- Added daily GitHub update check (default: enabled).
- Added `Daily update check` toggle in settings.
- `SKIP ON/OFF` floating button now turns red when a newer version is available.
- Update source:
  - `https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js`

## 1.5.2
- Added one-time suppression hotkey hint directly in the in-player toggle button text.
- Hint reflects the currently configured `Suppress current skip once key`.

## 1.5.1
- Fixed potential UI freeze caused by in-player button update loops.
- Reduced MutationObserver load by removing global attribute observation.
- Prevented redundant button text DOM writes.

## 1.5.0
- Added an in-player temporary toggle button next to visible skip controls:
  - `Automatisches Uberspringen deaktivieren`
  - `Auto Skip wieder aktivieren`
- While temporary toggle is active, auto-clicking is paused for visible skip controls.
- Temporary toggle resets automatically when no skip control is visible anymore.

## 1.4.1
- Fixed one-time suppression reliability:
  - Suppression now also blocks already scheduled delayed auto-clicks.
  - Suppression stays active for the currently visible button instance and clears when that button disappears.

## 1.4.0
- Added configurable `Suppress current skip once key` (default: `ArrowDown`).
- Pressing this key while a skip button is visible suppresses that specific button instance one time.
- Auto-skip resumes normally for new/other buttons.

## 1.3.2
- Added explicit inspiration/reference links to:
  - Crunchyroll Auto Skip with Settings (Greasy Fork)
  - MALSync (GitHub)
- Added build note indicating GPT-5.3-Codex assistance.

## 1.3.1
- Added click-to-capture hotkey inputs (no manual text typing required).
- Hotkey fields now record key combos directly from keyboard input.
- Toggle/pause hotkeys now use the same combo parser as intro shortcuts.
- Improved panel width and hotkey field widths for better combo visibility.

## 1.3.0
- Added configurable intro shortcut keys:
  - `Skip intro hotkey` (default: `Control+ArrowRight`)
  - `Jump to intro start hotkey` (default: `Control+ArrowLeft`)
- Added configurable `Jump seconds (+/-)` fallback (default: `85`).
- `Skip intro hotkey` now clicks ADN intro button if available; otherwise jumps forward by configured seconds.
- `Jump to intro start hotkey` jumps to detected intro start time; if unavailable, it jumps backward by configured seconds.

## 1.2.0
- Added `Panel Theme` setting (`Dark` / `Light`).
- Improved panel styling for dark mode readability.
- Fixed checkbox rendering compatibility with site CSS.

## 1.1.0
- Added temporary pause controls and pause status.
- Added `Pause duration (min)` and `Pause key`.
- Added `Pause` / `Resume now` actions.
- Delay setting now persists while typing.

## 1.0.2
- Switched to strict ADN-only selector mode.
- Removed broad fallback heuristics to reduce false positives.

## 1.0.1
- Added explicit ADN selector handling for known skip controls.

## 1.0.0
- Initial ADN auto-skip release with settings panel.
