# Changelog

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
