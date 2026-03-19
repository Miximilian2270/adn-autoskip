# ADN Auto Skip with Settings

Tampermonkey userscript for [Animation Digital Network (ADN)](https://www.animationdigitalnetwork.com/) that automatically skips:
- intro
- recap
- ending/credits
- next episode

The script includes a built-in settings panel with delay, theme switch (dark/light), hotkeys, and temporary pause controls.

## Features
- ADN-focused strict matching using known `data-testid` selectors
- Adjustable skip delay (e.g. `3500 ms`)
- **Modern Tabbed Settings UI** with sleek toggle switches, categories, and smooth CSS animations
- **Bilingual Support (English/German)** automatically adjusting based on browser settings
- Visual feedback directly on the player button when skipping is suppressed via hotkey
- In-player temporary toggle button to pause/resume auto-skip for the current visible skip phase
- Optional daily GitHub update check with red update indicator on the floating `SKIP` button
- Footer update actions: `Check update now` and `Install update` (enabled when update is available)
- Toggle individual skip categories
- Temporary pause with configurable duration
- Hotkeys for enable/disable and pause/resume
- Floating quick-access control (`SKIP ON/OFF/PAUSED`)
- Dark/Light settings panel theme
- Automatic local persistence via `localStorage`

## Installation
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. One-click install (Raw): [Install script](https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js)
3. Confirm installation in Tampermonkey.
4. Reload ADN.

Alternative manual method:
1. Open `adn-auto-skip-with-settings.user.js`.
2. Copy the full script content.
3. In Tampermonkey, create a new script and paste the content.
4. Save and reload ADN.

## Usage
1. Open an episode on ADN.
2. Click the floating button in the bottom-right corner (`SKIP ON`).
3. Configure settings in the panel.
4. For hotkeys, click the hotkey field and press the desired key combo.

### Default Hotkeys
- `F8`: toggle auto skip ON/OFF
- `F9`: pause/resume temporary skip pause
- `Control+ArrowRight`: skip intro (or jump forward)
- `Control+ArrowLeft`: jump to intro start (or jump backward)
- `ArrowDown`: suppress currently visible auto-skip action once

## Settings
- `Enable Auto Skip`
- `Delay (ms)`
- `Panel Theme` (`Dark` / `Light`)
- `Skip intro hotkey`
- `Jump to intro start hotkey`
- `Jump seconds (+/-)`
- `Suppress current skip once key`
- `Pause duration (min)`
- `Skip Intro`
- `Skip Recap`
- `Skip Credits/Ending`
- `Skip Next Episode`
- `Require player context`
- `Debug logs`
- `Daily update check`
  - Includes a manual `Check update now` action in the footer.
- `Toggle key`
- `Pause key`

## Technical Notes
- Storage key: `ADN_AUTO_SKIP_SETTINGS_V1`
- Supported ADN controls are identified via:
  - `skip-intro-button`
  - `skip-recap-button`
  - `skip-ending-button`
  - `next-video-button`

## Documentation
- Full docs: [`DOCUMENTATION.md`](./DOCUMENTATION.md)
- Changelog: [`CHANGELOG.md`](./CHANGELOG.md)

## Inspiration and References
- Crunchyroll Auto Skip with Settings:
  [Greasy Fork script](https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings)
- MALSync:
  [GitHub repository](https://github.com/MALSync/MALSync)

## Build Note
This script was created with assistance from GPT-5.3-Codex.

## Disclaimer
This project is unofficial and not affiliated with ADN.
Use at your own risk. Website changes may require selector updates.
