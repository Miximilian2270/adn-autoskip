# Documentation

This document describes the behavior of `adn-auto-skip-with-settings.user.js` (version `1.3.0`).

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
- `SKIP ON`: active
- `SKIP OFF`: disabled
- `SKIP PAUSED`: temporarily paused

Click the button to open the settings panel.

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
  - The visible button is marked as suppressed.
  - Auto-click skips this one button instance.
  - Auto-skip continues normally for later/new buttons.

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

## Inspiration and References
- Crunchyroll Auto Skip with Settings:
  https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings
- MALSync:
  https://github.com/MALSync/MALSync

## Build Note
Created with assistance from GPT-5.3-Codex.
