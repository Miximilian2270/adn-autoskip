// ==UserScript==
// @name         ADN Auto Skip with Settings
// @namespace    local.adn.autoskip
// @version      1.3.2
// @description  Automatically skip intro/recap/credits/next episode on ADN with configurable settings.
// @author       Miximilian2270
// @match        *://*.animationdigitalnetwork.com/*
// @homepageURL  https://github.com/Miximilian2270/adn-autoskip
// @supportURL   https://github.com/Miximilian2270/adn-autoskip/issues
// @license      MIT
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// Inspiration:
// - Crunchyroll Auto Skip with Settings:
//   https://greasyfork.org/de/scripts/513644-crunchyroll-auto-skip-with-settings
// - MALSync:
//   https://github.com/MALSync/MALSync
// Built with assistance from GPT-5.3-Codex.

(() => {
  "use strict";

  const STORAGE_KEY = "ADN_AUTO_SKIP_SETTINGS_V1";
  const DEFAULTS = {
    enabled: true,
    delayMs: 150,
    uiTheme: "dark",
    pauseMinutes: 5,
    pauseKey: "F9",
    introSkipKey: "Control+ArrowRight",
    introBackKey: "Control+ArrowLeft",
    jumpSeconds: 85,
    pausedUntilTs: 0,
    skipIntro: true,
    skipRecap: true,
    skipCredits: true,
    skipNextEpisode: true,
    requirePlayerContext: false,
    debug: false,
    toggleKey: "F8",
  };

  const ADN_SELECTORS = {
    skipArea: ".vjs-time-code-skip-buttons",
    strictSkipButtons: [
      'a[data-testid="skip-intro-button"]',
      'a[data-testid="skip-recap-button"]',
      'a[data-testid="skip-ending-button"]',
      'a[data-testid="next-video-button"]',
      'button[data-testid="skip-intro-button"]',
      'button[data-testid="skip-recap-button"]',
      'button[data-testid="skip-ending-button"]',
      'button[data-testid="next-video-button"]',
    ].join(", "),
  };

  let settings = loadSettings();
  let skipLoopTimer = null;
  let clickCooldown = new WeakMap();
  let pauseLabel = null;
  let titleEl = null;
  let lastIntroStartTime = null;

  function log(...args) {
    if (settings.debug) console.log("[ADN AutoSkip]", ...args);
  }

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const merged = { ...DEFAULTS, ...raw };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
      return { ...DEFAULTS };
    }
  }

  function saveSettings(next) {
    settings = { ...settings, ...next };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    refreshPanelValues();
    log("Settings saved", settings);
  }

  function isTemporarilyPaused() {
    return Number(settings.pausedUntilTs || 0) > Date.now();
  }

  function pauseRemainingMs() {
    return Math.max(0, Number(settings.pausedUntilTs || 0) - Date.now());
  }

  function pauseForMinutes(minutes) {
    const mins = Math.max(1, Math.min(180, Number(minutes) || DEFAULTS.pauseMinutes));
    saveSettings({ pausedUntilTs: Date.now() + mins * 60 * 1000 });
    log("Paused for minutes:", mins);
  }

  function resumeNow() {
    saveSettings({ pausedUntilTs: 0 });
    log("Resumed now");
  }

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeComboString(combo) {
    return (combo || "")
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/\bctrl\b/g, "control");
  }

  function normalizeEventKey(key) {
    if (key === " ") return "space";
    return (key || "").toLowerCase();
  }

  function eventToCombo(e) {
    const key = normalizeEventKey(e.key);
    if (!key || ["control", "shift", "alt", "meta"].includes(key)) return null;
    const parts = [];
    if (e.ctrlKey) parts.push("control");
    if (e.shiftKey) parts.push("shift");
    if (e.altKey) parts.push("alt");
    if (e.metaKey) parts.push("meta");
    parts.push(key);
    return parts.join("+");
  }

  function labelFromComboPart(part) {
    const p = part.toLowerCase();
    if (p === "control") return "Control";
    if (p === "shift") return "Shift";
    if (p === "alt") return "Alt";
    if (p === "meta") return "Meta";
    if (p === "space") return "Space";
    if (p.startsWith("arrow")) return `Arrow${p.slice(5, 6).toUpperCase()}${p.slice(6)}`;
    if (/^f\d{1,2}$/.test(p)) return p.toUpperCase();
    if (p.length === 1) return p.toUpperCase();
    return p.slice(0, 1).toUpperCase() + p.slice(1);
  }

  function formatComboForDisplay(combo) {
    return normalizeComboString(combo)
      .split("+")
      .filter(Boolean)
      .map(labelFromComboPart)
      .join("+");
  }

  function matchesCombo(e, combo) {
    const eventCombo = eventToCombo(e);
    if (!eventCombo) return false;
    return normalizeComboString(eventCombo) === normalizeComboString(combo);
  }

  function getElementText(el) {
    const parts = [el.textContent || "", el.getAttribute("aria-label") || "", el.getAttribute("title") || ""];
    return normalize(parts.join(" "));
  }

  function isVisible(el) {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number(style.opacity) < 0.05) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 8 && rect.height > 8 && rect.bottom > 0 && rect.right > 0;
  }

  function inVideoContext(el) {
    if (!settings.requirePlayerContext) return true;
    return !!el.closest(
      [
        '[class*="player"]',
        '[class*="video"]',
        '[id*="player"]',
        '[id*="video"]',
        "video",
      ].join(",")
    );
  }

  function classifyFromElement(el) {
    const testId = normalize(el.getAttribute("data-testid") || "");
    if (testId.includes("skip-intro-button")) return "intro";
    if (testId.includes("skip-recap-button")) return "recap";
    if (testId.includes("skip-ending-button")) return "credits";
    if (testId.includes("next-video-button")) return "next";
    return null;
  }

  function findPrimaryVideo() {
    const videos = Array.from(document.querySelectorAll("video"));
    if (!videos.length) return null;
    return videos.find((v) => !v.paused && v.readyState >= 2) || videos[0];
  }

  function categoryEnabled(category) {
    if (category === "intro") return settings.skipIntro;
    if (category === "recap") return settings.skipRecap;
    if (category === "credits") return settings.skipCredits;
    if (category === "next") return settings.skipNextEpisode;
    return false;
  }

  function canClickNow(el) {
    const now = Date.now();
    const last = clickCooldown.get(el) || 0;
    return now - last > 3000;
  }

  function markClicked(el) {
    clickCooldown.set(el, Date.now());
  }

  function clickAfterDelay(el, category) {
    const delay = Math.max(0, Number(settings.delayMs) || 0);
    window.setTimeout(() => {
      if (!settings.enabled || isTemporarilyPaused() || !isVisible(el)) return;
      if (!canClickNow(el)) return;
      markClicked(el);
      if (category === "intro") {
        const v = findPrimaryVideo();
        if (v) lastIntroStartTime = Math.max(0, v.currentTime || 0);
      }
      el.click();
      log("Clicked", category, el);
    }, delay);
  }

  function scanAndSkip() {
    if (!settings.enabled || isTemporarilyPaused()) return;
    const nodes = Array.from(document.querySelectorAll(ADN_SELECTORS.strictSkipButtons));

    for (const el of nodes) {
      if (!isVisible(el)) continue;
      if (!inVideoContext(el)) continue;

      const text = getElementText(el);
      if (text.length > 100) continue;
      if (!el.closest(ADN_SELECTORS.skipArea)) continue;

      const category = classifyFromElement(el);
      if (!category || !categoryEnabled(category)) continue;
      if (!canClickNow(el)) continue;

      clickAfterDelay(el, category);
    }
  }

  function startObservers() {
    const observer = new MutationObserver(() => scanAndSkip());
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    skipLoopTimer = window.setInterval(scanAndSkip, 900);
    window.addEventListener("beforeunload", () => {
      observer.disconnect();
      if (skipLoopTimer) window.clearInterval(skipLoopTimer);
    }, { once: true });
  }

  function makeRow(label, input) {
    const row = document.createElement("label");
    row.className = "adn-auto-row";
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "10px";
    row.style.margin = "8px 0";
    row.style.fontSize = "13px";
    row.textContent = label;
    row.appendChild(input);
    return row;
  }

  function makeCheckbox(key) {
    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = "adn-auto-input";
    input.checked = !!settings[key];
    input.addEventListener("change", () => saveSettings({ [key]: input.checked }));
    input.dataset.settingKey = key;
    return input;
  }

  function makeNumber(key, min, max, step = 1) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "adn-auto-input";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(settings[key]);
    input.style.width = "90px";
    const persistNumber = (finalize) => {
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return;
      let value = parsed;
      if (finalize) value = Math.min(max, Math.max(min, value));
      saveSettings({ [key]: value });
      if (finalize) input.value = String(value);
    };
    input.addEventListener("input", () => persistNumber(false));
    input.addEventListener("change", () => persistNumber(true));
    input.addEventListener("blur", () => persistNumber(true));
    input.dataset.settingKey = key;
    return input;
  }

  function makeText(key, width = 90) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "adn-auto-input";
    input.value = settings[key];
    input.style.width = `${width}px`;
    input.addEventListener("change", () => {
      const value = (input.value || "").trim() || DEFAULTS[key];
      input.value = value;
      saveSettings({ [key]: value });
    });
    input.dataset.settingKey = key;
    return input;
  }

  function makeHotkeyInput(key, width = 120) {
    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.className = "adn-auto-input";
    input.value = formatComboForDisplay(settings[key] || "");
    input.style.width = `${width}px`;
    input.style.cursor = "pointer";
    input.title = "Click and press key combination";

    const exitCapture = () => {
      input.dataset.capturing = "0";
      input.value = formatComboForDisplay(settings[key] || "");
      input.blur();
    };

    input.addEventListener("focus", () => {
      input.dataset.capturing = "1";
      input.value = "Press keys...";
    });

    input.addEventListener("click", () => {
      input.focus();
    });

    input.addEventListener("blur", () => {
      if (input.dataset.capturing === "1") {
        input.dataset.capturing = "0";
        input.value = formatComboForDisplay(settings[key] || "");
      }
    });

    input.addEventListener("keydown", (e) => {
      if (input.dataset.capturing !== "1") return;
      e.preventDefault();
      e.stopPropagation();

      if (e.key === "Escape") {
        exitCapture();
        return;
      }

      const combo = eventToCombo(e);
      if (!combo) return;
      const formatted = formatComboForDisplay(combo);
      saveSettings({ [key]: formatted });
      input.value = formatted;
      exitCapture();
    });

    input.dataset.settingKey = key;
    input.dataset.capturing = "0";
    return input;
  }

  function makeInteger(key, min, max) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "adn-auto-input";
    input.min = String(min);
    input.max = String(max);
    input.step = "1";
    input.value = String(settings[key]);
    input.style.width = "90px";
    const commit = () => {
      const parsed = Number(input.value);
      const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : DEFAULTS[key];
      input.value = String(next);
      saveSettings({ [key]: next });
    };
    input.addEventListener("change", commit);
    input.addEventListener("blur", commit);
    input.dataset.settingKey = key;
    return input;
  }

  function makeSelect(key, options) {
    const select = document.createElement("select");
    select.className = "adn-auto-input";
    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      select.appendChild(option);
    });
    select.value = settings[key];
    select.addEventListener("change", () => saveSettings({ [key]: select.value }));
    select.dataset.settingKey = key;
    return select;
  }

  let panel = null;
  let gear = null;

  function getThemePalette(theme) {
    if (theme === "light") {
      return {
        panelBg: "#ffffff",
        panelText: "#111111",
        panelBorder: "#444444",
        gearBg: "#ffffff",
        gearText: "#111111",
        gearBorder: "#444444",
        inputBg: "#ffffff",
        inputText: "#111111",
        inputBorder: "#888888",
        btnBg: "#f7f7f7",
        btnText: "#111111",
        btnBorder: "#444444",
        muted: "#444444",
        accent: "#246bff",
        shadow: "0 6px 24px rgba(0,0,0,.3)",
      };
    }
    return {
      panelBg: "#121826",
      panelText: "#eaf0ff",
      panelBorder: "#33415f",
      gearBg: "#121826",
      gearText: "#eaf0ff",
      gearBorder: "#33415f",
      inputBg: "#0d1422",
      inputText: "#eaf0ff",
      inputBorder: "#44557a",
      btnBg: "#1c2940",
      btnText: "#eaf0ff",
      btnBorder: "#44557a",
      muted: "#9fb0d1",
      accent: "#6ea8ff",
      shadow: "0 8px 28px rgba(0,0,0,.55)",
    };
  }

  function applyTheme() {
    if (!panel || !gear) return;
    const theme = getThemePalette(settings.uiTheme);

    Object.assign(gear.style, {
      border: `1px solid ${theme.gearBorder}`,
      background: theme.gearBg,
      color: theme.gearText,
      boxShadow: theme.shadow,
    });
    Object.assign(panel.style, {
      border: `1px solid ${theme.panelBorder}`,
      background: theme.panelBg,
      color: theme.panelText,
      boxShadow: theme.shadow,
    });
    if (titleEl) titleEl.style.color = theme.panelText;
    if (pauseLabel) pauseLabel.style.color = theme.muted;

    panel.querySelectorAll(".adn-auto-row").forEach((row) => {
      row.style.color = theme.panelText;
    });

    panel.querySelectorAll(".adn-auto-input").forEach((el) => {
      Object.assign(el.style, {
        background: theme.inputBg,
        color: theme.inputText,
        border: `1px solid ${theme.inputBorder}`,
        borderRadius: "6px",
      });
      if (el instanceof HTMLInputElement && el.type === "checkbox") {
        el.style.appearance = "auto";
        el.style.webkitAppearance = "checkbox";
        el.style.background = "transparent";
        el.style.border = "none";
        el.style.borderRadius = "0";
        el.style.width = "18px";
        el.style.height = "18px";
        el.style.cursor = "pointer";
        el.style.margin = "0";
        el.style.accentColor = theme.accent;
      }
    });

    panel.querySelectorAll(".adn-auto-btn").forEach((btn) => {
      Object.assign(btn.style, {
        border: `1px solid ${theme.btnBorder}`,
        background: theme.btnBg,
        color: theme.btnText,
      });
    });
  }

  function refreshPanelValues() {
    if (!panel) return;
    panel.querySelectorAll("[data-setting-key]").forEach((el) => {
      const key = el.dataset.settingKey;
      if (document.activeElement === el) return;
      if (el.type === "checkbox") {
        el.checked = !!settings[key];
      } else {
        el.value = String(settings[key]);
      }
    });
    if (pauseLabel) {
      if (isTemporarilyPaused()) {
        const sec = Math.ceil(pauseRemainingMs() / 1000);
        pauseLabel.textContent = `Paused: ${sec}s remaining`;
      } else {
        pauseLabel.textContent = "Paused: no";
      }
    }
    if (gear) {
      if (!settings.enabled) gear.textContent = "SKIP OFF";
      else if (isTemporarilyPaused()) gear.textContent = "SKIP PAUSED";
      else gear.textContent = "SKIP ON";
    }
    applyTheme();
  }

  function addSettingsUi() {
    if (document.getElementById("adn-auto-skip-gear")) return;

    gear = document.createElement("button");
    gear.id = "adn-auto-skip-gear";
    gear.textContent = settings.enabled ? "SKIP ON" : "SKIP OFF";
    Object.assign(gear.style, {
      position: "fixed",
      right: "12px",
      bottom: "12px",
      zIndex: "2147483646",
      border: "1px solid #444",
      borderRadius: "12px",
      background: "#fff",
      color: "#111",
      padding: "8px 10px",
      fontSize: "12px",
      fontFamily: "sans-serif",
      cursor: "pointer",
      boxShadow: "0 2px 8px rgba(0,0,0,.25)",
    });

    panel = document.createElement("div");
    panel.id = "adn-auto-skip-panel";
    Object.assign(panel.style, {
      position: "fixed",
      right: "12px",
      bottom: "54px",
      width: "430px",
      maxWidth: "92vw",
      zIndex: "2147483647",
      border: "1px solid #444",
      borderRadius: "12px",
      background: "#fff",
      color: "#111",
      padding: "12px",
      fontFamily: "sans-serif",
      fontSize: "13px",
      boxShadow: "0 6px 24px rgba(0,0,0,.3)",
      display: "none",
    });

    titleEl = document.createElement("div");
    titleEl.textContent = "ADN Auto Skip";
    titleEl.style.fontWeight = "700";
    titleEl.style.marginBottom = "8px";

    const rows = [
      makeRow("Enable Auto Skip", makeCheckbox("enabled")),
      makeRow("Delay (ms)", makeNumber("delayMs", 0, 60000, 50)),
      makeRow("Panel Theme", makeSelect("uiTheme", [
        { value: "dark", label: "Dark" },
        { value: "light", label: "Light" },
      ])),
      makeRow("Skip intro hotkey", makeHotkeyInput("introSkipKey", 180)),
      makeRow("Jump to intro start hotkey", makeHotkeyInput("introBackKey", 180)),
      makeRow("Jump seconds (+/-)", makeInteger("jumpSeconds", 1, 600)),
      makeRow("Pause duration (min)", makeNumber("pauseMinutes", 1, 180, 1)),
      makeRow("Skip Intro", makeCheckbox("skipIntro")),
      makeRow("Skip Recap", makeCheckbox("skipRecap")),
      makeRow("Skip Credits/Ending", makeCheckbox("skipCredits")),
      makeRow("Skip Next Episode", makeCheckbox("skipNextEpisode")),
      makeRow("Require player context", makeCheckbox("requirePlayerContext")),
      makeRow("Debug logs", makeCheckbox("debug")),
      makeRow("Toggle key", makeHotkeyInput("toggleKey", 120)),
      makeRow("Pause key", makeHotkeyInput("pauseKey", 120)),
    ];

    pauseLabel = document.createElement("div");
    pauseLabel.style.fontSize = "12px";
    pauseLabel.style.opacity = "0.8";
    pauseLabel.style.marginTop = "4px";

    const quick = document.createElement("div");
    quick.style.display = "flex";
    quick.style.gap = "8px";
    quick.style.marginTop = "10px";

    const resetBtn = document.createElement("button");
    resetBtn.className = "adn-auto-btn";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", () => {
      saveSettings({ ...DEFAULTS });
    });

    const closeBtn = document.createElement("button");
    closeBtn.className = "adn-auto-btn";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
      panel.style.display = "none";
    });

    const pauseBtn = document.createElement("button");
    pauseBtn.className = "adn-auto-btn";
    pauseBtn.textContent = "Pause";
    pauseBtn.addEventListener("click", () => {
      pauseForMinutes(settings.pauseMinutes);
    });

    const resumeBtn = document.createElement("button");
    resumeBtn.className = "adn-auto-btn";
    resumeBtn.textContent = "Resume now";
    resumeBtn.addEventListener("click", () => {
      resumeNow();
    });

    [resetBtn, pauseBtn, resumeBtn, closeBtn].forEach((btn) => {
      Object.assign(btn.style, {
        border: "1px solid #444",
        borderRadius: "8px",
        background: "#f7f7f7",
        padding: "4px 8px",
        cursor: "pointer",
      });
    });

    quick.append(resetBtn, pauseBtn, resumeBtn, closeBtn);
    panel.append(titleEl, ...rows, pauseLabel, quick);

    gear.addEventListener("click", () => {
      panel.style.display = panel.style.display === "none" ? "block" : "none";
    });

    document.body.append(gear, panel);
    window.setInterval(() => refreshPanelValues(), 1000);
    refreshPanelValues();
  }

  function setupHotkeys() {
    const trySkipIntroViaButton = () => {
      const btn = document.querySelector('a[data-testid="skip-intro-button"], button[data-testid="skip-intro-button"]');
      if (!btn || !isVisible(btn)) return false;
      if (!canClickNow(btn)) return false;
      const v = findPrimaryVideo();
      if (v) lastIntroStartTime = Math.max(0, v.currentTime || 0);
      markClicked(btn);
      btn.click();
      return true;
    };

    const jumpBySeconds = (seconds) => {
      const v = findPrimaryVideo();
      if (!v) return false;
      const max = Number.isFinite(v.duration) ? v.duration : Number.MAX_SAFE_INTEGER;
      const target = Math.max(0, Math.min(max, (v.currentTime || 0) + seconds));
      v.currentTime = target;
      return true;
    };

    const jumpToIntroStart = () => {
      const v = findPrimaryVideo();
      if (!v) return false;
      if (typeof lastIntroStartTime === "number") {
        const max = Number.isFinite(v.duration) ? v.duration : Number.MAX_SAFE_INTEGER;
        v.currentTime = Math.max(0, Math.min(max, lastIntroStartTime));
        return true;
      }
      return jumpBySeconds(-Math.abs(Number(settings.jumpSeconds) || DEFAULTS.jumpSeconds));
    };

    document.addEventListener("keydown", (e) => {
      if ((e.target instanceof HTMLInputElement) || (e.target instanceof HTMLTextAreaElement) || e.target?.isContentEditable) return;

      if (matchesCombo(e, settings.toggleKey)) {
        e.preventDefault();
        saveSettings({ enabled: !settings.enabled });
        log("Toggled enabled:", settings.enabled);
      }
      if (matchesCombo(e, settings.pauseKey)) {
        e.preventDefault();
        if (isTemporarilyPaused()) resumeNow();
        else pauseForMinutes(settings.pauseMinutes);
      }
      if (matchesCombo(e, settings.introSkipKey)) {
        e.preventDefault();
        if (!trySkipIntroViaButton()) {
          jumpBySeconds(Math.abs(Number(settings.jumpSeconds) || DEFAULTS.jumpSeconds));
        }
      }
      if (matchesCombo(e, settings.introBackKey)) {
        e.preventDefault();
        jumpToIntroStart();
      }
    }, true);
  }

  function boot() {
    addSettingsUi();
    startObservers();
    setupHotkeys();
    scanAndSkip();
    log("Loaded", settings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
