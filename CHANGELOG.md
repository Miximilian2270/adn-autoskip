# Changelog

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
