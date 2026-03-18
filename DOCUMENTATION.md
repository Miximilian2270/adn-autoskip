# Documentation

This document describes the behavior of `adn-auto-skip-with-settings.user.js`.

## Purpose
The userscript auto-clicks known ADN skip controls:
- `skip-intro-button`
- `skip-recap-button`
- `skip-ending-button`
- `next-video-button`

It is intentionally ADN-specific and does not target Crunchyroll.

## Quick Setup
1. Open Tampermonkey.
2. Create or edit a userscript.
3. Paste `adn-auto-skip-with-settings.user.js`.
4. Save (`Ctrl+S`) and reload ADN.

## UI Overview
Bottom-right floating button:
- `SKIP ON` / `SKIP AN`: active
- `SKIP OFF` / `SKIP AUS`: disabled
- `SKIP PAUSED` / `SKIP PAUSIERT`: temporarily paused

Click the button to open the settings panel. The settings panel is now divided into four tabs for easier navigation:
- **General**: Enable Auto Skip, Delay, Theme, Pause duration.
- **Skipping**: Configuration for Intro, Recap, Credits, Next Episode, Context, and fallback Jump seconds.
- **Hotkeys**: Custom bindings for all available actions.
- **System**: Debug logs and Update tracking.

## Internationalization (i18n)
The UI elements (such as the floating button text and the in-player toggle) automatically detect the browser's language. The default language is **English**, but it gracefully switches to **German** if the browser's language is set to German (e.g., `de-DE`).


## Settings Reference
- `Enable Auto Skip`
  - Global on/off switch.
- `Delay (ms)`
  - Delay before clicking a detected skip control.
- `Panel Theme`
  - `Dark` or `Light` panel appearance.
- `Skip intro hotkey`
  - Hotkey combo to trigger intro skipping.
  - Default: `Control+ArrowRight`.
- `Jump to intro start hotkey`
  - Hotkey combo to jump back to detected intro start.
  - Default: `Control+ArrowLeft`.
- `Jump seconds (+/-)`
  - Fallback jump amount (seconds) when intro start is not known or intro button is not visible.
  - Default: `85`.
- `Suppress current skip once key`
  - Suppresses exactly the currently visible auto-skip button one time.
  - Default: `ArrowDown`.
- `Pause duration (min)`
  - Duration used by `Pause` and the pause hotkey.
- `Skip Intro`
  - Enables intro skipping.
- `Skip Recap`
  - Enables recap skipping.
- `Skip Credits/Ending`
  - Enables ending/outro skipping.
- `Skip Next Episode`
  - Enables automatic next-episode clicks.
- `Require player context`
  - Extra filter for video/player container context.
- `Debug logs`
  - Enables console logs prefixed with `[ADN AutoSkip]`.
- `Daily update check`
  - Checks the GitHub script once per day for newer `@version`.
  - If an update is found, the floating `SKIP` button turns red.
  - Can be disabled.
- `Toggle key`
  - Hotkey for global enable/disable (default: `F8`).
- `Pause key`
  - Hotkey for pause/resume (default: `F9`).

Hotkey fields support key capture:
- Click/focus a hotkey field.
- Press the desired key combination.
- `Escape` cancels capture.

## Intro Shortcut Behavior
- `Skip intro hotkey`:
  - First tries to click ADN `skip-intro-button`.
  - If the button is not available, jumps forward by `Jump seconds (+/-)`.
- `Jump to intro start hotkey`:
  - Jumps to the stored intro start timestamp (captured when intro skip is triggered).
  - If no intro timestamp is known, jumps backward by `Jump seconds (+/-)`.

## One-Time Suppression Behavior
- When an auto-skip button is currently visible (`Intro` / `Recap` / `Ending` / `Next`):
  - Press `Suppress current skip once key` (default `ArrowDown`).
  - The visible in-player toggle button will turn green and display `Skip temporarily suppressed! [Playing Normally]` (or the German equivalent) to visually confirm the interaction.
  - Auto-click skips this one button instance.
  - Auto-skip continues normally for later/new buttons.

## In-Player Temporary Toggle Button
- When a supported ADN skip button is visible, an extra button is injected nearby:
  - `Automatisches Uberspringen deaktivieren`
- Clicking it changes state to:
  - `Auto Skip wieder aktivieren`
- While active, automatic clicking is paused for currently visible skip controls.
- The temporary toggle auto-resets once no skip control is visible anymore.

## Panel Buttons
- `Reset`
  - Restores defaults.
- `Pause`
  - Pauses for the configured `Pause duration (min)`.
- `Resume now`
  - Immediately cancels temporary pause.
- `Close`
  - Closes the panel.

## Persistence
Settings are auto-saved in browser `localStorage`:
- key: `ADN_AUTO_SKIP_SETTINGS_V1`

There is no manual save button by design.

## Troubleshooting
- Value appears to reset:
  - Reload ADN and re-apply the value.
  - Ensure the updated script version is installed.
- Skip does not trigger:
  - Confirm script enabled in Tampermonkey.
  - Check `Enable Auto Skip` is on.
  - Check not paused.
  - Verify the relevant category is enabled.
- Too early skip:
  - Increase `Delay (ms)` (e.g., `3500`+).

## Maintenance
If ADN changes `data-testid` names, update selector mappings in:
- `ADN_SELECTORS.strictSkipButtons`
- `classifyFromElement(...)`

Update check source:
- `https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js`

## Inspiration and References
- Crunchyroll Auto Skip with Settings:
  https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings
- MALSync:
  https://github.com/MALSync/MALSync

## Build Note
Created with assistance from GPT-5.3-Codex.
