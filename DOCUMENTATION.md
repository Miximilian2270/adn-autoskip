# ADN Auto Skip — Technical Documentation

> **Version:** 2.0.1
> **Last updated:** 2025-01-24
> **Author:** Miximilian2270

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Structure](#2-file-structure)
3. [Settings System](#3-settings-system)
4. [Skip Detection & Execution](#4-skip-detection--execution)
5. [Internationalization (i18n)](#5-internationalization-i18n)
6. [UI System](#6-ui-system)
7. [Toast Notifications](#7-toast-notifications)
8. [Hotkey System](#8-hotkey-system)
9. [Cheatsheet Overlay](#9-cheatsheet-overlay)
10. [Update System](#10-update-system)
11. [Import / Export](#11-import--export)
12. [Multi-Tab Safety](#12-multi-tab-safety)
13. [Fullscreen Handling](#13-fullscreen-handling)
14. [CSS Architecture](#14-css-architecture)
15. [Browser Compatibility](#15-browser-compatibility)
16. [Security Considerations](#16-security-considerations)
17. [Debugging](#17-debugging)
18. [Known Limitations](#18-known-limitations)
19. [Contributing](#19-contributing)

---

## 1. Architecture Overview

The script runs as a single IIFE (Immediately Invoked Function Expression) in strict mode.
All state is contained within the closure — nothing leaks to the global scope.

```text
┌─────────────────────────────────────────────────┐
│                    Boot                          │
│  buildPanel() → startObs() → setupKeys()        │
│  → setupFS() → startUpdChecker() → scan()       │
└──────────┬──────────────────────────────────────┘
           │
     ┌─────┴─────┐
     │           │
┌────▼───┐  ┌───▼────┐
│  UI    │  │  Skip  │
│ System │  │ Engine │
├────────┤  ├────────┤
│ Panel  │  │ Scan   │
│ Gear   │  │ Click  │
│ Toasts │  │ Delay  │
│ Banner │  │ Filter │
│ CS     │  │ Player │
└────┬───┘  └───┬────┘
     │          │
┌────▼──────────▼───┐
│   Settings (S)    │
│   localStorage    │
│   Migration       │
│   Import/Export   │
└───────────────────┘
```

### Core Loops

| Loop | Interval | Purpose |
|---|---|---|
| MutationObserver | Real-time | Detect new skip buttons in DOM |
| `scan()` | 900ms | Polling fallback for missed mutations |
| `refreshUI()` | 1000ms | Update panel values, gear status, pause countdown |
| `checkUpd()` | 1 hour | Periodic update check (actual check gated to 24h) |

### Lifecycle

```text
document-idle
  → DOMContentLoaded (or immediate if ready)
    → boot()
      → buildPanel()      // Inject CSS, create gear + panel + banner
      → startObs()        // MutationObserver + 900ms polling
      → setupKeys()       // Global keydown listener
      → setupFS()         // Fullscreen change listeners
      → startUpdChecker() // Initial check + 1h interval
      → scan()            // First scan

beforeunload
  → observer.disconnect()
  → clearInterval(skipTimer)
  → clearInterval(updTimer)
  → clearInterval(refreshTimer)
  → unlockUpd()           // Release multi-tab lock
```

---

## 2. File Structure

```text
adn-autoskip/
├── adn-auto-skip-with-settings.user.js   # Main script (single file)
├── README.md                               # User-facing documentation
├── CHANGELOG.md                            # Version history
├── DOCUMENTATION.md                        # This file
├── LICENSE                                 # MIT license
└── .gitignore
```

The entire extension is a **single JavaScript file** with embedded CSS.
No build step, no dependencies, no external assets.

---

## 3. Settings System

### Storage

All settings are stored in `localStorage` under key `ADN_AUTO_SKIP_SETTINGS_V1` as a JSON string.

### Schema

```javascript
const DEFAULTS = {
  // Core
  enabled: true,              // Master toggle
  delayMs: 3500,              // Delay before auto-click (ms)
  uiTheme: "dark",            // "dark" | "light"
  pauseMinutes: 5,            // Default pause duration

  // Skip categories
  skipIntro: true,
  skipRecap: true,
  skipCredits: true,
  skipNextEpisode: true,

  // Behavior
  requirePlayerContext: false, // Only detect inside player
  jumpSeconds: 85,            // Hotkey jump distance
  showToasts: true,           // Show toast notifications
  debug: false,               // Console logging

  // Hotkeys
  toggleKey: "F8",
  pauseKey: "F9",
  introSkipKey: "Control+ArrowRight",
  introBackKey: "Control+ArrowLeft",
  skipCurrentOnceKey: "ArrowDown",
  cheatsheetKey: "Shift+?",

  // Transient state
  pausedUntilTs: 0,           // Pause timer timestamp

  // Update system
  updateCheckEnabled: true,
  updateLastCheckTs: 0,
  updateAvailable: false,
  updateLastRemoteVersion: "",
  updateLastResult: "idle",
  updateLastError: "",
  updateChangelog: "",
  updateReleaseUrl: "",
  updateSnoozedUntilTs: 0,
  updateIgnoredVersion: "",
  updateLastSuccessfulUpdate: 0,

  // Internal
  _settingsVersion: 5,        // Bumped on schema changes
};
```

### Migration

On every `loadSettings()` call, the stored JSON is run through `migrate()`:

1. Parse JSON from localStorage
2. Filter keys through `KNOWN_KEYS` whitelist
3. Remove any unknown/deprecated keys
4. Merge with DEFAULTS (new keys get default values)
5. Special migrations (e.g., F1 → Shift+? for cheatsheetKey)
6. Set `_settingsVersion` to current
7. Save back to localStorage

**Version history:**

| Version | Changes |
|---|---|
| 1 | Initial schema (v1.8.1) |
| 2 | Added migration system (v1.9.1) |
| 3 | Added `showToasts`, `cheatsheetKey` (v1.10.0) |
| 4 | CSS class rename, new UI (v2.0.0) |
| 5 | F1 → Shift+? migration, type validation (v2.0.1) |

### Save Flow

```javascript
function save(next) {
  S = { ...S, ...next };
  if (next.updateCheckEnabled === false) {
    S.updateAvailable = false;
    S.updateChangelog = "";
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  refreshUI();      // Update panel inputs
  refreshBanner();  // Update/hide update banner
}
```

---

## 4. Skip Detection & Execution

### ADN Button Selectors

```javascript
const ADN_SEL = {
  skipArea: ".vjs-time-code-skip-buttons",
  skipBtns: [
    'a[data-testid="skip-intro-button"]',
    'a[data-testid="skip-recap-button"]',
    'a[data-testid="skip-ending-button"]',
    'a[data-testid="next-video-button"]',
    'button[data-testid="skip-intro-button"]',
    'button[data-testid="skip-recap-button"]',
    'button[data-testid="skip-ending-button"]',
    'button[data-testid="next-video-button"]',
  ].join(","),
};
```

### Detection Pipeline

```text
1. querySelectorAll(ADN_SEL.skipBtns)
2. Filter: isVis(el)             → visibility, display, opacity, bounding rect
3. Filter: inPlayer(el)          → optional player context check
4. Filter: el.closest(skipArea)  → must be inside skip area container
5. Filter: elText(el).length     → reject suspiciously long text (>100 chars)
6. Classify: classify(el)        → data-testid → "intro"|"recap"|"credits"|"next"
7. Filter: catOn(category)       → user has this category enabled?
```

### Click Flow

```text
Button detected
  → canClick(el)?          // 3s cooldown per element (WeakMap)
  → suppressedBtn === el?  // User suppressed this one?
  → playerBtnActive?       // User disabled auto-skip via player button?
  → clickDelay(el, cat)    // Schedule click after S.delayMs
    → setTimeout
      → Re-check all conditions
      → markClick(el)      // Set cooldown
      → el.click()         // Trigger the skip
      → toast(...)         // Show notification
```

### Cooldown System

```javascript
let clickCD = new WeakMap();  // el → timestamp

function canClick(el) {
  return Date.now() - (clickCD.get(el) || 0) > 3000;
}
function markClick(el) {
  clickCD.set(el, Date.now());
}
```

Using `WeakMap` ensures garbage collection when buttons are removed from DOM.

### Pending Click Tracking

```javascript
let pendingCD = new WeakMap();  // el → timer ID

// Prevents scheduling duplicate clicks for the same button
if (pendingCD.has(el)) return;
const tid = setTimeout(() => { /* ... */ }, delay);
pendingCD.set(el, tid);
```

---

## 5. Internationalization (i18n)

### Structure

```javascript
const LANG = {
  en: { "key": "English text {var}" },
  de: { "key": "Deutscher Text {var}" },
  fr: { "key": "Texte français {var}" },
};
```

### Usage

```javascript
t("toast.paused", { min: 5 })
// → "⏸ Paused 5m"        (English)
// → "⏸ Pausiert 5m"      (German)
// → "⏸ En pause 5m"      (French)
```

### Language Detection

```javascript
function getLang() {
  const l = navigator.language.slice(0, 2).toLowerCase();
  return LANG[l] ? l : "en";  // Fallback to English
}
```

### Key Naming Convention

```text
category.action
├── gear.on / gear.off / gear.paused
├── tab.general / tab.skip / tab.keys / tab.system
├── general.enable / general.delay / ...
├── skip.intro / skip.recap / ...
├── keys.skip_intro / keys.toggle / ...
├── sys.debug / sys.export / ...
├── status.checking / status.up_to_date / ...
├── pause.active / pause.paused / ...
├── toast.intro / toast.enabled / ...
├── cs.title / cs.hint / ...
├── update.title / update.install_now / ...
└── player.suppressed / player.reenable / ...
```

### Adding a New Language

1. Add a new key to the `LANG` object (e.g., `es` for Spanish)
2. Copy all keys from `en`
3. Translate each value
4. The script automatically detects `navigator.language`

---

## 6. UI System

### Component Hierarchy

```text
document.body
├── #as-gear                // Floating gear button
│   ├── .as-dot             // Status indicator
│   └── <span>              // Status text
├── #as-panel               // Settings panel
│   ├── .as-panel-hdr       // Title + close button
│   ├── .as-tabs            // Tab navigation
│   ├── .as-tabs-body       // Scrollable tab content
│   │   └── .as-pane        // Individual tab panes
│   │       └── .as-card    // Grouped settings cards
│   │           └── .as-row // Label + input pairs
│   └── .as-footer          // Pause status + actions
├── #as-banner              // Update notification banner
│   ├── .as-banner-hdr      // Icon + title + close
│   ├── .as-banner-cl       // Changelog area
│   └── .as-banner-acts     // Action buttons
├── #as-toasts              // Toast container
│   └── .as-toast           // Individual toasts
└── .as-cs-overlay          // Cheatsheet (when open)
    └── .as-cs-box          // Cheatsheet content
```

### Z-Index Stack

| Layer | Z-Index | Elements |
|---|---|---|
| Topmost | 2147483647 | Panel, Toasts, Cheatsheet |
| Middle | 2147483646 | Gear button |
| Bottom | 2147483645 | Update banner |

### Panel Open/Close

```javascript
// Open/close toggle
gear.addEventListener("click", () => panel.classList.toggle("as-open"));

// Close on outside click
document.addEventListener("click", e => {
  if (!panel.classList.contains("as-open")) return;
  if (panel.contains(e.target) || gear.contains(e.target)) return;
  panel.classList.remove("as-open");
});

// Close on fullscreen
if (isFS) panel.classList.remove("as-open");
```

### Input Types

| Factory | Output | Data Binding |
|---|---|---|
| `mkToggle(key)` | Checkbox toggle | `change → save()` |
| `mkNum(key, min, max)` | Number input | `input/change/blur → save()` |
| `mkSel(key, opts)` | Select dropdown | `change → save()` |
| `mkHotkey(key)` | Readonly text input | `focus → capture, keydown → save()` |

All inputs use `data-sk` attribute for automatic refresh in `refreshUI()`.

---

## 7. Toast Notifications

### Design

- **Position:** Fixed, bottom center, above gear button
- **Animation:** Slide up + scale in → auto-dismiss after 2.2s → slide up + scale out
- **Non-blocking:** `pointer-events: none` on both container and individual toasts
- **Stacking:** `flex-direction: column-reverse` (newest at bottom)

### Trigger Points

| Action | Toast Key |
|---|---|
| Skip intro | `toast.intro` |
| Skip recap | `toast.recap` |
| Skip credits | `toast.credits` |
| Skip next | `toast.next` |
| Toggle on | `toast.enabled` |
| Toggle off | `toast.disabled` |
| Pause | `toast.paused` |
| Resume | `toast.resumed` |
| Suppress once | `toast.suppressed` |
| Jump forward | `toast.jump_fwd` |
| Jump back | `toast.jump_back` |
| Export | `sys.export` |
| Import success | `import.success` |
| Import error | `import.error` |

### Lifecycle

```text
toast(key, vars, ms)
  → Check S.showToasts
  → ensureToastBox()
  → Create .as-toast element
  → requestAnimationFrame → add .as-toast-in
  → setTimeout(ms)
    → replace .as-toast-in with .as-toast-out
    → transitionend → remove element
    → setTimeout(400ms) → fallback remove
```

---

## 8. Hotkey System

### Combo Format

Internal format: `Modifier+Modifier+Key` (normalized to lowercase)

```text
"Control+ArrowRight"  → Ctrl + →
"Shift+?"             → Shift + ?
"F8"                  → F8
"ArrowDown"           → ↓
```

### Processing Pipeline

```text
KeyboardEvent
  → shouldIgnore(target)?      // Skip if inside input, panel, etc.
  → evCombo(event)             // Build "modifier+key" string
  → normCombo(combo)           // Normalize to lowercase
  → matchCombo(event, setting) // Compare with stored hotkey
  → Execute action
```

### Hotkey Recording

```text
1. User clicks hotkey input → focus
2. input.dataset.cap = "1"
3. input.value = "Press keys…"
4. User presses key combination
5. evCombo(event) → format → save
6. Exit capture mode
7. Escape → cancel without saving
```

### Ignored Contexts

Hotkeys are suppressed when focus is on:

- `#as-panel` (settings panel)
- `#as-gear` (gear button)
- `#as-banner` (update banner)
- `.as-cs-overlay` (cheatsheet)
- `<input>`, `<textarea>`, `<select>`
- `[contenteditable]`

---

## 9. Cheatsheet Overlay

### Behavior

1. `Shift+?` (configurable) opens fullscreen overlay
2. Shows all current hotkey bindings with formatted key badges
3. Backdrop: semi-transparent black with `blur(6px)`
4. Closes on **any** keypress or **any** click
5. Toggle: pressing `Shift+?` again also closes it

### Event Cleanup (v2.0.1 Fix)

```javascript
let csCloseHandler = null;

function showCS() {
  // ... create overlay ...
  csCloseHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    hideCS();
  };
  setTimeout(() => {
    document.addEventListener("keydown", csCloseHandler, true);
    document.addEventListener("click", csCloseHandler, true);
  }, 120);  // Delay to avoid immediate close
}

function hideCS() {
  // Always remove listeners first
  if (csCloseHandler) {
    document.removeEventListener("keydown", csCloseHandler, true);
    document.removeEventListener("click", csCloseHandler, true);
    csCloseHandler = null;
  }
  // Set ref to null immediately (prevent double-close)
  const ref = csOverlay;
  csOverlay = null;
  // Animate out + remove
  ref.classList.remove("as-cs-show");
  ref.addEventListener("transitionend", () => ref.remove(), { once: true });
  setTimeout(() => ref.remove(), 400);  // Fallback
}
```

---

## 10. Update System

### Check Flow

```text
checkUpd(force?)
  │
  ├── Not enabled? → save "disabled", return
  ├── Interval not reached & !force? → return
  ├── Multi-tab locked & !force? → save "skipped_lock", return
  │
  ├── Acquire lock
  ├── save "checking"
  │
  ├── Try GitHub Releases API
  │   ├── Parse newer releases
  │   ├── Build changelog from all newer releases
  │   └── Get latest version + release URL
  │
  ├── Fallback: GitHub Tags API
  │   └── Find highest semver tag
  │
  ├── Fallback: Raw script header
  │   └── Extract @version from remote file
  │
  ├── Compare versions (semver)
  ├── Check if version is ignored
  ├── Save results
  └── Release lock (finally block)
```

### API Endpoints

| URL | Purpose |
|---|---|
| `api.github.com/repos/.../releases` | Version + changelog + release URL |
| `api.github.com/repos/.../tags` | Version fallback (no changelog) |
| `raw.githubusercontent.com/.../main/...` | Raw script fallback |

### Update States

| State | Meaning |
|---|---|
| `idle` | Never checked |
| `checking` | Check in progress |
| `up_to_date` | Latest version installed |
| `update` | Newer version available |
| `error` | Check failed |
| `disabled` | Update check turned off |
| `skipped_lock` | Another tab is checking |

### Banner Display Logic

```javascript
const shouldShow =
  S.updateCheckEnabled &&      // Feature enabled
  S.updateAvailable &&         // Update exists
  !isSnoozed() &&              // Not snoozed (4h)
  !isFS &&                     // Not in fullscreen
  S.updateIgnoredVersion !== S.updateLastRemoteVersion;  // Not ignored
```

### Semver Comparison

```javascript
function cmpVer(a, b) {
  const A = String(a).split(".").map(Number);
  const B = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    if ((A[i]||0) > (B[i]||0)) return 1;
    if ((A[i]||0) < (B[i]||0)) return -1;
  }
  return 0;
}
```

---

## 11. Import / Export

### Export

```javascript
function exportS() {
  // Clone settings (don't modify live object!)
  const exported = { ...S };

  // Remove transient keys
  const TRANSIENT = [
    "pausedUntilTs", "updateLastCheckTs", "updateLastResult",
    "updateLastError", "updateAvailable", "updateChangelog",
    "updateReleaseUrl", "updateSnoozedUntilTs", "updateLastSuccessfulUpdate",
  ];
  TRANSIENT.forEach(k => delete exported[k]);

  const data = {
    _export: "ADN Auto Skip Settings",
    _version: SCRIPT_VERSION,
    _at: new Date().toISOString(),
    settings: exported,
  };
  // ... trigger download ...
}
```

### Import Validation (v2.0.1)

```text
1. Read file
2. Parse JSON
3. Validate structure:
   - Must be an object
   - Must have .settings object
   - Optionally check ._export marker
4. Type-check each key against DEFAULTS:
   - Only import keys in KNOWN_KEYS
   - Only import values matching typeof DEFAULTS[key]
   - Skip mismatched types with debug warning
5. Run through migrate()
6. save()
```

### Export File Format

```json
{
  "_export": "ADN Auto Skip Settings",
  "_version": "2.0.1",
  "_at": "2025-01-24T12:00:00.000Z",
  "settings": {
    "enabled": true,
    "delayMs": 3500,
    "uiTheme": "dark",
    "skipIntro": true
  }
}
```

---

## 12. Multi-Tab Safety

### Problem

Multiple ADN tabs could trigger simultaneous update checks, wasting API calls
and potentially causing race conditions.

### Solution: localStorage Lock

```javascript
const UPDATE_LOCK_KEY = "ADN_AUTO_SKIP_UPDATE_LOCK";
const UPDATE_LOCK_TTL_MS = 30 * 1000;  // 30 second TTL

function lockUpd() {
  const now = Date.now();
  try {
    const l = JSON.parse(localStorage.getItem(UPDATE_LOCK_KEY) || "{}");
    if (l.ts && now - l.ts < UPDATE_LOCK_TTL_MS) return false;  // Lock held
  } catch {}
  localStorage.setItem(UPDATE_LOCK_KEY, JSON.stringify({ ts: now }));
  return true;  // Lock acquired
}

function unlockUpd() {
  try { localStorage.removeItem(UPDATE_LOCK_KEY); } catch {}
}
```

### Lock Lifecycle

```text
Tab opens → checkUpd()
  → lockUpd() succeeds → proceed with check → unlockUpd() in finally
  → lockUpd() fails → save "skipped_lock" → return

Tab closes → beforeunload → unlockUpd()
Browser crash → Lock expires after 30s TTL
```

Manual "Check now" button bypasses the lock (`force = true`).

---

## 13. Fullscreen Handling

### Detection

```javascript
function setupFS() {
  const update = () => {
    isFS = !!document.fullscreenElement;
    updateVis();
  };
  document.addEventListener("fullscreenchange", update);
  document.addEventListener("webkitfullscreenchange", update);  // Safari
}
```

### UI Behavior in Fullscreen

| Element | Fullscreen Behavior |
|---|---|
| Gear button | Hidden (`opacity: 0`, `pointer-events: none`) |
| Settings panel | Force closed |
| Update banner | Hidden (`display: none`) |
| Toast container | Hidden (`display: none`) |
| Player skip button | Unaffected (inside player) |

All elements return to normal state when exiting fullscreen.

---

## 14. CSS Architecture

### Design System

```css
:root {
  --as-bg: rgba(16,20,32,.92);       /* Panel background */
  --as-bg-solid: #101420;             /* Toast background */
  --as-text: #e8edf8;                 /* Primary text */
  --as-text2: #8a9cc0;                /* Secondary text */
  --as-border: rgba(60,80,120,.45);   /* Borders */
  --as-input: rgba(8,12,24,.7);       /* Input backgrounds */
  --as-input-border: rgba(70,90,130,.5);
  --as-btn: rgba(30,42,68,.8);        /* Button background */
  --as-btn-h: rgba(40,56,90,.9);      /* Button hover */
  --as-accent: #5b8cff;               /* Primary accent */
  --as-accent2: #3d6ee0;              /* Accent hover */
  --as-green: #3ddc84;                /* Active status */
  --as-red: #ff5a6e;                  /* Error / off */
  --as-yellow: #ffb74d;               /* Warning / paused */
  --as-shadow: 0 12px 40px rgba(0,0,0,.55);
  --as-glass: blur(16px) saturate(1.4);
  --as-r: 14px;                       /* Border radius */
  --as-rs: 8px;                       /* Small radius */
}
```

### Light Theme Override

```css
[data-as-theme="light"] {
  --as-bg: rgba(250,250,255,.94);
  --as-bg-solid: #fafaff;
  --as-text: #111827;
  --as-text2: #6b7280;
  --as-border: rgba(0,0,0,.1);
  --as-input: rgba(0,0,0,.04);
  --as-accent: #3b6cf5;
  --as-shadow: 0 8px 32px rgba(0,0,0,.12);
}
```

### Backdrop-Filter Fallback (v2.0.1)

```css
@supports not (backdrop-filter: blur(1px)) {
  :root {
    --as-bg: rgba(16,20,32,.98);  /* More opaque */
    --as-glass: none;              /* Disable blur */
  }
}
```

### CSS Class Naming

All classes use the `as-` prefix (short for "auto-skip"):

| Prefix | Elements |
|---|---|
| `as-dot` | Status dot |
| `as-toggle` | Toggle switch |
| `as-input` | Text/number input |
| `as-btn` / `as-btn-accent` / `as-btn-ghost` / `as-btn-link` | Buttons |
| `as-card` / `as-row` | Settings layout |
| `as-tab` / `as-pane` | Tab navigation |
| `as-toast` | Toast notification |
| `as-cs-*` | Cheatsheet elements |
| `as-banner-*` | Update banner elements |
| `as-upd-*` | Update info elements |

### Animation Summary

| Element | Animation | Duration | Easing |
|---|---|---|---|
| Panel open | translateY + scale | 0.35s | cubic-bezier(.2,.8,.2,1) |
| Tab switch | translateY + opacity | 0.25s | ease |
| Toast in | translateY + scale | 0.3s | cubic-bezier(.2,.8,.2,1) |
| Toast out | translateY + scale | 0.3s | cubic-bezier(.2,.8,.2,1) |
| Banner | translateY + scale | 0.4s | cubic-bezier(.2,.8,.2,1) |
| Cheatsheet | opacity | 0.3s | ease |
| Status dot pulse | opacity + scale | 1.5s | infinite |
| Gear hover | translateY | 0.25s | cubic-bezier(.4,0,.2,1) |
| Toggle knob | translateX | 0.3s | cubic-bezier(.4,0,.2,1) |

---

## 15. Browser Compatibility

### Required Features

| Feature | Used For | Fallback |
|---|---|---|
| `localStorage` | Settings storage | None (required) |
| `MutationObserver` | DOM change detection | Polling only |
| `WeakMap` | Click cooldown tracking | None (required) |
| `backdrop-filter` | Glass effect | Solid background (v2.0.1) |
| CSS custom properties | Theme system | None (required) |
| Template literals | String building | None (required) |
| `async/await` | Update checks | None (required) |
| `GM_xmlhttpRequest` | Cross-origin requests | Native `fetch` |
| Fullscreen API | Fullscreen detection | UI stays visible |

### Minimum Browser Versions

| Browser | Version | Notes |
|---|---|---|
| Chrome | 76+ | Full support |
| Firefox | 70+ | Full support |
| Edge | 79+ | Full support (Chromium) |
| Safari | 15+ | Needs `-webkit-backdrop-filter` |
| Opera | 63+ | Full support |

### Userscript Manager Compatibility

| Manager | Status | Notes |
|---|---|---|
| Tampermonkey | ✅ Full | Recommended |
| Violentmonkey | ✅ Full | Works well |
| Greasemonkey | ⚠️ Partial | `GM_xmlhttpRequest` may differ |

---

## 16. Security Considerations

### Permissions

| Permission | Scope | Reason |
|---|---|---|
| `GM_xmlhttpRequest` | Script-level | Bypass CORS for GitHub API |
| `@connect raw.githubusercontent.com` | Domain whitelist | Download updates |
| `@connect api.github.com` | Domain whitelist | Check releases/tags |

### Data Handling

- **No data sent externally** — Only reads from GitHub APIs
- **No tracking** — No analytics, no telemetry
- **No cookies** — Uses only localStorage
- **No remote code execution** — Update opens URL for userscript manager to handle
- **Settings stay local** — Export creates a local file download

### Token Safety

The script uses **no authentication tokens**. All GitHub API calls are unauthenticated
(rate limited to 60 requests/hour per IP).

### DOM Interaction

- Only clicks buttons matching specific `data-testid` selectors
- Never injects content into the video player
- Never modifies ADN's own scripts or network requests

---

## 17. Debugging

### Enable Debug Mode

1. Open settings panel → System tab → Enable "Debug logs"
2. Or in browser console:

```javascript
const s = JSON.parse(localStorage.getItem("ADN_AUTO_SKIP_SETTINGS_V1"));
s.debug = true;
localStorage.setItem("ADN_AUTO_SKIP_SETTINGS_V1", JSON.stringify(s));
location.reload();
```

### Console Output

All debug messages are prefixed with `[ADN-AS]`:

```text
[ADN-AS] v2.0.1 {enabled: true, delayMs: 3500, ...}
[ADN-AS] Click intro <a data-testid="skip-intro-button">
[ADN-AS] Saved {skipIntro: false}
```

### Quick Health Check

```javascript
// Script loaded?
document.getElementById("as-gear") ? "✅ Active" : "❌ Not loaded"

// Settings version?
JSON.parse(localStorage.getItem("ADN_AUTO_SKIP_SETTINGS_V1"))?._settingsVersion

// Current settings?
JSON.parse(localStorage.getItem("ADN_AUTO_SKIP_SETTINGS_V1"))

// Force update check
const s = JSON.parse(localStorage.getItem("ADN_AUTO_SKIP_SETTINGS_V1"));
s.updateLastCheckTs = 0;
localStorage.setItem("ADN_AUTO_SKIP_SETTINGS_V1", JSON.stringify(s));
```

### Reset Everything

```javascript
localStorage.removeItem("ADN_AUTO_SKIP_SETTINGS_V1");
localStorage.removeItem("ADN_AUTO_SKIP_UPDATE_LOCK");
location.reload();
```

---

## 18. Known Limitations

### Current

| Issue | Description | Workaround |
|---|---|---|
| iframes | Skip buttons inside iframes not detected | ADN doesn't currently use iframes |
| SPA navigation | Interval timers may stack on soft nav | Cleaned on `beforeunload` |
| API rate limit | GitHub allows 60 unauth requests/hour | Gated to once per 24h |
| Popup blocker | "Install now" may be blocked | Allow popups for ADN |
| Very fast skips | Buttons appearing for <100ms may be missed | Reduce `delayMs` to 0 |
| Multiple videos | May pick wrong video element | `findVid()` prefers playing video |

### By Design

| Behavior | Reason |
|---|---|
| No auto-update install | Userscript managers must handle installation for security |
| No cloud sync | Privacy — settings stay in localStorage |
| No per-anime settings | Complexity tradeoff (planned for v3.0) |
| English-only debug logs | Developer audience; keeps code simple |

---

## 19. Contributing

### Getting Started

```bash
git clone https://github.com/Miximilian2270/adn-autoskip.git
cd adn-autoskip
```

### Making Changes

1. Edit `adn-auto-skip-with-settings.user.js`
2. Update `@version` in the script header
3. Test on ADN (install via Tampermonkey → "Create a new script")
4. Update CHANGELOG.md
5. Commit with conventional commit format:

```text
feat: description     (new feature → minor version bump)
fix: description      (bug fix → patch version bump)
feat!: description    (breaking change → major version bump)
docs: description     (documentation only)
```

### Release Process

```bash
git add -A
git commit -m "feat: v1.x.x description"
git push origin main
git tag -a v1.x.x -m "Description"
git push origin v1.x.x
```

Then create a GitHub Release with changelog.

### Code Style

- **IIFE wrapper** — All code inside `(() => { "use strict"; ... })()`
- **No global leaks** — Everything stays in closure
- **Short variable names** — `S` for settings, `el()` for createElement
- **Functional helpers** — Small pure functions over classes
- **CSS-in-JS** — All styles in `injectCSS()` as template literal

### Testing Checklist

- [ ] Gear button appears
- [ ] Panel opens/closes
- [ ] All four tabs render
- [ ] Toggles save immediately
- [ ] Hotkey recording works
- [ ] Escape cancels hotkey capture
- [ ] F8 toggles auto-skip
- [ ] F9 pauses/resumes
- [ ] Shift+? opens cheatsheet
- [ ] Cheatsheet closes on any key/click
- [ ] Toast appears on skip
- [ ] Toast doesn't block player controls
- [ ] Fullscreen hides UI
- [ ] Fullscreen exit restores UI
- [ ] Light theme works
- [ ] Dark theme works
- [ ] Update check completes
- [ ] Import/Export roundtrip works
- [ ] Reset restores defaults
- [ ] Multi-tab lock prevents duplicate checks
- [ ] Settings migration removes old keys
