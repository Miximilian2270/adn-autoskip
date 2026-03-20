// ==UserScript==
// @name         ADN Auto Skip with Settings
// @namespace    local.adn.autoskip
// @version      1.8.1
// @description  Automatically skip intro/recap/credits/next episode on ADN with configurable settings.
// @author       Miximilian2270
// @match        *://*.animationdigitalnetwork.com/*
// @homepageURL  https://github.com/Miximilian2270/adn-autoskip
// @supportURL   https://github.com/Miximilian2270/adn-autoskip/issues
// @downloadURL  https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js
// @updateURL    https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js
// @license      MIT
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// @connect      api.github.com
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

  const SCRIPT_VERSION = (typeof GM_info !== "undefined" && GM_info?.script?.version)
    ? GM_info.script.version
    : "1.8.1";
  const STORAGE_KEY = "ADN_AUTO_SKIP_SETTINGS_V1";
  const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const UPDATE_SOURCE_URL = "https://raw.githubusercontent.com/Miximilian2270/adn-autoskip/main/adn-auto-skip-with-settings.user.js";
  const UPDATE_TAGS_URL = "https://api.github.com/repos/Miximilian2270/adn-autoskip/tags?per_page=100";
  const DEFAULTS = {
    enabled: true,
    delayMs: 3500,
    uiTheme: "dark",
    pauseMinutes: 5,
    pauseKey: "F9",
    introSkipKey: "Control+ArrowRight",
    introBackKey: "Control+ArrowLeft",
    jumpSeconds: 85,
    skipCurrentOnceKey: "ArrowDown",
    pausedUntilTs: 0,
    skipIntro: true,
    skipRecap: true,
    skipCredits: true,
    skipNextEpisode: true,
    requirePlayerContext: false,
    debug: false,
    toggleKey: "F8",
    updateCheckEnabled: true,
    updateLastCheckTs: 0,
    updateAvailable: false,
    updateLastRemoteVersion: "",
    updateLastResult: "idle",
    updateLastError: "",
    updateInstallPending: false,
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
  let pendingClicks = new WeakMap();
  let suppressedCurrentButton = null;
  let playerNoSkipButton = null;
  let playerNoSkipActive = false;
  let pauseLabel = null;
  let updateLabel = null;
  let titleEl = null;
  let lastIntroStartTime = null;
  let updateCheckTimer = null;
  let updateInstallWindow = null;
  let updateInstallWatchTimer = null;

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
    if (Object.prototype.hasOwnProperty.call(next, "updateCheckEnabled")) {
      if (!settings.updateCheckEnabled) settings.updateAvailable = false;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    refreshPanelValues();
    if (Object.prototype.hasOwnProperty.call(next, "updateCheckEnabled") && settings.updateCheckEnabled) {
      checkForUpdates(true);
    }
    log("Settings saved", settings);
  }

  function compareSemver(a, b) {
    const ap = String(a).split(".").map((n) => Number(n) || 0);
    const bp = String(b).split(".").map((n) => Number(n) || 0);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i += 1) {
      const ai = ap[i] || 0;
      const bi = bp[i] || 0;
      if (ai > bi) return 1;
      if (ai < bi) return -1;
    }
    return 0;
  }

  function extractVersionFromTagName(tagName) {
    const m = String(tagName || "").match(/v?(\d+\.\d+\.\d+)/i);
    return m ? m[1] : null;
  }

  function extractVersionFromScriptText(text) {
    const m = String(text || "").match(/@version\s+([0-9.]+)/);
    return m ? m[1] : null;
  }

  function httpGetText(url) {
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          nocache: true,
          onload: (resp) => {
            if (resp.status >= 200 && resp.status < 300) resolve(resp.responseText);
            else reject(new Error(`HTTP ${resp.status} for ${url}`));
          },
          onerror: () => reject(new Error(`Network error for ${url}`)),
          ontimeout: () => reject(new Error(`Timeout for ${url}`)),
        });
      });
    }
    return fetch(url, { cache: "no-store" }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return res.text();
    });
  }

  async function getRemoteVersion() {
    try {
      const tagsText = await httpGetText(UPDATE_TAGS_URL);
      const tags = JSON.parse(tagsText);
      if (Array.isArray(tags)) {
        const versions = tags
          .map((t) => extractVersionFromTagName(t?.name))
          .filter(Boolean)
          .sort((a, b) => compareSemver(b, a));
        if (versions.length) return versions[0];
      }
    } catch (err) {
      log("Tag version lookup failed, falling back to raw script", err);
    }

    const rawText = await httpGetText(UPDATE_SOURCE_URL);
    const rawVersion = extractVersionFromScriptText(rawText);
    if (!rawVersion) throw new Error("No @version found in remote script");
    return rawVersion;
  }

  async function checkForUpdates(force = false) {
    if (!settings.updateCheckEnabled) {
      if (settings.updateAvailable || settings.updateLastResult !== "disabled" || settings.updateLastError || settings.updateInstallPending) {
        saveSettings({
          updateAvailable: false,
          updateLastResult: "disabled",
          updateLastError: "",
          updateInstallPending: false,
        });
      }
      return;
    }

    const now = Date.now();
    const last = Number(settings.updateLastCheckTs || 0);
    if (!force && now - last < UPDATE_CHECK_INTERVAL_MS) return;

    saveSettings({ updateLastResult: "checking", updateLastError: "" });

    try {
      const remoteVersion = await getRemoteVersion();
      const hasUpdate = compareSemver(remoteVersion, SCRIPT_VERSION) > 0;
      saveSettings({
        updateLastCheckTs: now,
        updateAvailable: hasUpdate,
        updateLastRemoteVersion: remoteVersion,
        updateLastResult: hasUpdate ? "update" : "up_to_date",
        updateLastError: "",
        updateInstallPending: hasUpdate ? settings.updateInstallPending : false,
      });
      log("Update check", { local: SCRIPT_VERSION, remote: remoteVersion, hasUpdate });
    } catch (err) {
      saveSettings({
        updateLastCheckTs: now,
        updateLastResult: "error",
        updateLastError: err?.message ? String(err.message) : "unknown error",
      });
      log("Update check error", err);
    }
  }

  function startUpdateChecker() {
    const reloadAfterInstallIfPending = () => {
      if (!settings.updateInstallPending) return;
      window.location.reload();
    };

    const mustForceAtStartup =
      !!settings.updateAvailable || settings.updateLastResult === "update";
    checkForUpdates(mustForceAtStartup);
    if (updateCheckTimer) window.clearInterval(updateCheckTimer);
    updateCheckTimer = window.setInterval(() => {
      checkForUpdates(false);
    }, 60 * 60 * 1000);
    window.addEventListener("beforeunload", () => {
      if (updateCheckTimer) window.clearInterval(updateCheckTimer);
      if (updateInstallWatchTimer) window.clearInterval(updateInstallWatchTimer);
    }, { once: true });
    window.addEventListener("focus", reloadAfterInstallIfPending);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reloadAfterInstallIfPending();
    });
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

  function formatComboForButtonHint(combo) {
    return formatComboForDisplay(combo)
      .replace(/Control/g, "Ctrl")
      .replace(/ArrowUp/g, "↑")
      .replace(/ArrowDown/g, "↓")
      .replace(/ArrowLeft/g, "←")
      .replace(/ArrowRight/g, "→");
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
    if (pendingClicks.has(el)) return;
    const delay = Math.max(0, Number(settings.delayMs) || 0);
    const timerId = window.setTimeout(() => {
      pendingClicks.delete(el);
      if (!settings.enabled || isTemporarilyPaused() || !isVisible(el)) return;
      if (suppressedCurrentButton === el) return;
      if (!canClickNow(el)) return;
      markClicked(el);
      if (category === "intro") {
        const v = findPrimaryVideo();
        if (v) lastIntroStartTime = Math.max(0, v.currentTime || 0);
      }
      el.click();
      log("Clicked", category, el);
    }, delay);
    pendingClicks.set(el, timerId);
  }

  function getVisibleAutoSkipCandidates() {
    const nodes = Array.from(document.querySelectorAll(ADN_SELECTORS.strictSkipButtons));
    const out = [];

    for (const el of nodes) {
      if (!isVisible(el)) continue;
      if (!inVideoContext(el)) continue;
      if (!el.closest(ADN_SELECTORS.skipArea)) continue;

      const text = getElementText(el);
      if (text.length > 100) continue;

      const category = classifyFromElement(el);
      if (!category || !categoryEnabled(category)) continue;
      out.push({ el, category });
    }
    return out;
  }

  function removePlayerNoSkipButton() {
    if (playerNoSkipButton && playerNoSkipButton.parentNode) {
      playerNoSkipButton.parentNode.removeChild(playerNoSkipButton);
    }
    playerNoSkipButton = null;
  }

  function updatePlayerNoSkipButtonText() {
    if (!playerNoSkipButton) return;
    const onceHint = formatComboForButtonHint(settings.skipCurrentOnceKey || "ArrowDown");
    const isSuppressed = !!suppressedCurrentButton;
    const isDe = navigator.language.startsWith("de");

    let nextText = "";
    let bgColor = "#e7e7e7";
    let textColor = "#111";
    let borderColor = "#777";

    if (isSuppressed) {
      nextText = isDe ? `Überspringen unterdrückt! [Normal Weiter]` : `Skip temporarily suppressed! [Playing Normally]`;
      bgColor = "#4caf50";
      textColor = "#fff";
      borderColor = "#2e7d32";
    } else if (playerNoSkipActive) {
      nextText = isDe ? `Auto Skip wieder aktivieren [Einmal: ${onceHint}]` : `Re-enable Auto Skip [Press once: ${onceHint}]`;
    } else {
      nextText = isDe ? `Automatisches Überspringen deaktivieren [Einmal: ${onceHint}]` : `Disable Auto Skip [Press once: ${onceHint}]`;
    }

    if (playerNoSkipButton.textContent !== nextText) {
      playerNoSkipButton.textContent = nextText;
    }

    Object.assign(playerNoSkipButton.style, {
      background: bgColor,
      color: textColor,
      borderColor: borderColor
    });
  }

  function ensurePlayerNoSkipButton(candidates) {
    if (!settings.enabled || !candidates.length) {
      removePlayerNoSkipButton();
      if (!candidates.length) playerNoSkipActive = false;
      return;
    }

    const anchor = candidates[0]?.el;
    if (!anchor) return;
    const container = anchor.parentElement || anchor.closest(ADN_SELECTORS.skipArea);
    if (!container) return;

    if (!playerNoSkipButton || !document.contains(playerNoSkipButton)) {
      playerNoSkipButton = document.createElement("button");
      playerNoSkipButton.type = "button";
      playerNoSkipButton.className = "adn-auto-btn adn-player-noskip-btn";
      Object.assign(playerNoSkipButton.style, {
        marginRight: "8px",
        padding: "8px 12px",
        borderRadius: "4px",
        border: "1px solid #777",
        background: "#e7e7e7",
        color: "#111",
        fontSize: "13px",
        fontWeight: "600",
        cursor: "pointer",
      });
      playerNoSkipButton.addEventListener("click", () => {
        playerNoSkipActive = !playerNoSkipActive;
        updatePlayerNoSkipButtonText();
      });
    }

    if (playerNoSkipButton.parentElement !== container) {
      container.insertBefore(playerNoSkipButton, anchor);
    }
    updatePlayerNoSkipButtonText();
  }

  function scanAndSkip() {
    if (!settings.enabled || isTemporarilyPaused()) {
      removePlayerNoSkipButton();
      return;
    }

    if (suppressedCurrentButton) {
      const stillVisible = document.contains(suppressedCurrentButton) && isVisible(suppressedCurrentButton);
      if (!stillVisible) {
        suppressedCurrentButton = null;
        updatePlayerNoSkipButtonText();
      }
    }

    const candidates = getVisibleAutoSkipCandidates();
    ensurePlayerNoSkipButton(candidates);

    if (playerNoSkipActive) return;

    for (const { el, category } of candidates) {
      if (suppressedCurrentButton === el) continue;
      if (!canClickNow(el)) continue;

      clickAfterDelay(el, category);
    }
  }

  function startObservers() {
    const observer = new MutationObserver(() => scanAndSkip());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    skipLoopTimer = window.setInterval(scanAndSkip, 900);
    window.addEventListener("beforeunload", () => {
      observer.disconnect();
      if (skipLoopTimer) window.clearInterval(skipLoopTimer);
    }, { once: true });
  }


  function injectStyles() {
    if (document.getElementById("adn-auto-skip-styles")) return;
    const style = document.createElement("style");
    style.id = "adn-auto-skip-styles";
    style.textContent = `
      :root {
        --adn-bg: #121826;
        --adn-text: #eaf0ff;
        --adn-border: #33415f;
        --adn-input-bg: #0d1422;
        --adn-input-border: #44557a;
        --adn-btn-bg: #1c2940;
        --adn-btn-hover: #2a3d5e;
        --adn-accent: #6ea8ff;
        --adn-muted: #9fb0d1;
        --adn-shadow: 0 8px 28px rgba(0,0,0,0.55);
        --adn-danger: #ff4a60;
      }
      [data-adn-theme="light"] {
        --adn-bg: #ffffff;
        --adn-text: #111111;
        --adn-border: #dddddd;
        --adn-input-bg: #f9f9f9;
        --adn-input-border: #bbbbbb;
        --adn-btn-bg: #f1f1f1;
        --adn-btn-hover: #e2e2e2;
        --adn-accent: #246bff;
        --adn-muted: #666666;
        --adn-shadow: 0 6px 24px rgba(0,0,0,0.2);
      }
      #adn-auto-skip-gear {
        position: fixed;
        right: 15px;
        bottom: 15px;
        z-index: 2147483646;
        background: var(--adn-bg);
        color: var(--adn-text);
        border: 1px solid var(--adn-border);
        border-radius: 12px;
        padding: 8px 14px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: var(--adn-shadow);
        transition: all 0.2s ease;
      }
      #adn-auto-skip-gear:hover {
        transform: translateY(-2px);
      }
      #adn-auto-skip-gear.adn-update-available {
        background: var(--adn-danger);
        color: #fff;
        border-color: #ff8091;
        box-shadow: 0 0 14px rgba(255, 74, 96, 0.65);
      }
      #adn-auto-skip-panel {
        position: fixed;
        right: 15px;
        bottom: 60px;
        width: 380px;
        max-width: 90vw;
        height: min(560px, 80vh);
        overflow: hidden;
        z-index: 2147483647;
        background: var(--adn-bg);
        color: var(--adn-text);
        border: 1px solid var(--adn-border);
        border-radius: 12px;
        padding: 16px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        box-shadow: var(--adn-shadow);
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px);
        transition: all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        scrollbar-width: thin;
        scrollbar-color: var(--adn-border) transparent;
        display: flex;
        flex-direction: column;
      }
      #adn-auto-skip-panel.adn-panel-open {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }
      .adn-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }
      .adn-title {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
      }
      .adn-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;
        border-bottom: 1px solid var(--adn-border);
        padding-bottom: 8px;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .adn-tabs::-webkit-scrollbar { display: none; }
      .adn-tab {
        background: transparent;
        border: none;
        color: var(--adn-muted);
        padding: 6px 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        border-radius: 6px;
        transition: all 0.2s;
        white-space: nowrap;
      }
      .adn-tab:hover {
        color: var(--adn-text);
        background: var(--adn-btn-bg);
      }
      .adn-tab.adn-active {
        background: var(--adn-accent);
        color: #fff;
      }
      .adn-tabs-content {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--adn-border) transparent;
        padding-right: 2px;
      }
      .adn-tab-content {
        display: none;
        animation: adn-fade-in 0.2s ease;
        min-height: 100%;
      }
      .adn-tab-content.adn-active {
        display: block;
      }
      @keyframes adn-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .adn-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .adn-row-label {
        flex: 1;
        padding-right: 12px;
      }
      .adn-input {
        background: var(--adn-input-bg);
        color: var(--adn-text);
        border: 1px solid var(--adn-input-border);
        border-radius: 6px;
        padding: 6px 10px;
        font-size: 13px;
        outline: none;
        transition: border-color 0.2s;
        min-width: 0;
      }
      .adn-input:focus {
        border-color: var(--adn-accent);
      }
      .adn-input[type="number"] {
        width: 70px;
      }
      .adn-btn {
        background: var(--adn-btn-bg);
        color: var(--adn-text);
        border: 1px solid var(--adn-border);
        border-radius: 6px;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .adn-btn:hover {
        background: var(--adn-btn-hover);
      }
      .adn-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .adn-close-btn {
        background: transparent;
        border: none;
        color: var(--adn-muted);
        cursor: pointer;
        font-size: 18px;
        padding: 0 4px;
        line-height: 1;
      }
      .adn-close-btn:hover {
        color: var(--adn-text);
      }
      .adn-toggle {
        appearance: none;
        -webkit-appearance: none;
        width: 36px;
        height: 20px;
        background: var(--adn-input-border);
        border-radius: 20px;
        position: relative;
        cursor: pointer;
        outline: none;
        transition: background 0.3s;
        flex-shrink: 0;
        margin: 0;
      }
      .adn-toggle::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: 14px;
        height: 14px;
        background: #fff;
        border-radius: 50%;
        transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      }
      .adn-toggle:checked {
        background: var(--adn-accent);
      }
      .adn-toggle:checked::after {
        transform: translateX(16px);
      }
      .adn-footer {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--adn-border);
      }
      .adn-footer-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .adn-pause-info {
        font-size: 12px;
        color: var(--adn-muted);
        min-width: 120px;
      }
      .adn-quick-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
    `;
    document.head.appendChild(style);
  }

  function createElement(tag, className = "", props = {}, children = []) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    for (const [k, v] of Object.entries(props)) el[k] = v;
    for (const c of children) {
      if (typeof c === "string") el.appendChild(document.createTextNode(c));
      else if (c instanceof Node) el.appendChild(c);
    }
    return el;
  }

  function makeRow(label, input) {
    const lbl = createElement("div", "adn-row-label", {}, [label]);
    return createElement("label", "adn-row", {}, [lbl, input]);
  }

  function makeCheckbox(key) {
    const input = createElement("input", "adn-toggle", { type: "checkbox", checked: !!settings[key] });
    input.dataset.settingKey = key;
    input.addEventListener("change", () => saveSettings({ [key]: input.checked }));
    return input;
  }

  function makeNumber(key, min, max, step = 1) {
    const input = createElement("input", "adn-input", { type: "number", min: String(min), max: String(max), step: String(step), value: String(settings[key]) });
    input.dataset.settingKey = key;
    const save = (finalize) => {
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return;
      let val = parsed;
      if (finalize) val = Math.min(max, Math.max(min, val));
      saveSettings({ [key]: val });
      if (finalize) input.value = String(val);
    };
    input.addEventListener("input", () => save(false));
    input.addEventListener("change", () => save(true));
    input.addEventListener("blur", () => save(true));
    return input;
  }

  function makeSelect(key, options) {
    const select = createElement("select", "adn-input");
    options.forEach(opt => {
      select.appendChild(createElement("option", "", { value: opt.value, textContent: opt.label }));
    });
    select.value = settings[key];
    select.dataset.settingKey = key;
    select.addEventListener("change", () => saveSettings({ [key]: select.value }));
    return select;
  }

  function makeHotkeyInput(key, width = 120) {
    const input = createElement("input", "adn-input", { type: "text", readOnly: true, value: formatComboForDisplay(settings[key] || "") });
    input.style.width = width + "px";
    input.style.cursor = "pointer";
    input.title = "Click and press key combination";
    input.dataset.settingKey = key;
    input.dataset.capturing = "0";

    const exitCapture = () => {
      input.dataset.capturing = "0";
      input.value = formatComboForDisplay(settings[key] || "");
      input.blur();
    };

    input.addEventListener("focus", () => {
      input.dataset.capturing = "1";
      input.value = "Press keys...";
    });

    input.addEventListener("click", () => input.focus());

    input.addEventListener("blur", () => {
      if (input.dataset.capturing === "1") exitCapture();
    });

    input.addEventListener("keydown", (e) => {
      if (input.dataset.capturing !== "1") return;
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") { exitCapture(); return; }
      const combo = eventToCombo(e);
      if (!combo) return;
      const formatted = formatComboForDisplay(combo);
      saveSettings({ [key]: formatted });
      input.value = formatted;
      exitCapture();
    });
    return input;
  }

  let panel = null;
  let gear = null;
  let updateActionBtn = null;

  function refreshPanelValues() {
    if (!panel) return;
    document.documentElement.setAttribute("data-adn-theme", settings.uiTheme === "light" ? "light" : "dark");
    panel.querySelectorAll("[data-setting-key]").forEach((el) => {
      const key = el.dataset.settingKey;
      if (document.activeElement === el) return;
      if (el.type === "checkbox") el.checked = !!settings[key];
      else el.value = String(settings[key]);
    });
    const isDe = navigator.language.startsWith("de");
    const fmtTime = (ts) => {
      const n = Number(ts || 0);
      if (!n) return isDe ? "nie" : "never";
      try {
        return new Date(n).toLocaleString();
      } catch {
        return isDe ? "unbekannt" : "unknown";
      }
    };

    if (pauseLabel) {
      if (isTemporarilyPaused()) {
        const sec = Math.ceil(pauseRemainingMs() / 1000);
        pauseLabel.textContent = isDe ? `Pausiert: ${sec}s` : `Paused: ${sec}s`;
      } else {
        pauseLabel.textContent = isDe ? "Auto Skip Aktiv" : "Auto Skip Active";
      }
    }
    if (updateLabel) {
      const last = fmtTime(settings.updateLastCheckTs);
      const remote = settings.updateLastRemoteVersion ? ` (remote ${settings.updateLastRemoteVersion})` : "";
      const result = settings.updateLastResult || "idle";
      let line = "";
      if (result === "checking") line = isDe ? "Update-Check: läuft..." : "Update check: running...";
      else if (result === "up_to_date") line = isDe ? `Update-Check: aktuell${remote}` : `Update check: up to date${remote}`;
      else if (result === "update") line = isDe ? `Update verfügbar${remote}` : `Update available${remote}`;
      else if (result === "error") line = isDe ? "Update-Check: Fehler" : "Update check: error";
      else if (result === "disabled") line = isDe ? "Update-Check: deaktiviert" : "Update check: disabled";
      else if (result === "skipped") line = isDe ? "Update-Check: Intervall noch aktiv" : "Update check: interval not reached";
      else line = isDe ? "Update-Check: bereit" : "Update check: ready";

      const err = settings.updateLastError ? ` | ${settings.updateLastError}` : "";
      const reloadHint = settings.updateInstallPending
        ? (isDe ? " | Installation gestartet: bitte Seite neu laden" : " | Install started: please reload page")
        : "";
      updateLabel.textContent = `${line} | ${isDe ? "letzte Prüfung" : "last check"}: ${last}${err}${reloadHint}`;
    }
    if (updateActionBtn) {
      if (settings.updateInstallPending) {
        updateActionBtn.disabled = false;
        updateActionBtn.textContent = isDe ? "Seite neu laden" : "Reload page now";
      } else if (!settings.updateCheckEnabled) {
        updateActionBtn.disabled = true;
        updateActionBtn.textContent = isDe ? "Update aus" : "Update off";
      } else if ((settings.updateLastResult || "") === "checking") {
        updateActionBtn.disabled = true;
        updateActionBtn.textContent = isDe ? "Prufe..." : "Checking...";
      } else if (settings.updateAvailable) {
        updateActionBtn.disabled = false;
        updateActionBtn.textContent = isDe ? "Update installieren" : "Install update";
      } else {
        updateActionBtn.disabled = true;
        updateActionBtn.textContent = isDe ? "Kein Update" : "No update";
      }
    }
    if (gear) {
      if (settings.updateCheckEnabled && settings.updateAvailable) {
        gear.classList.add("adn-update-available");
      } else {
        gear.classList.remove("adn-update-available");
      }

      if (!settings.enabled) gear.textContent = isDe ? "SKIP AUS" : "SKIP OFF";
      else if (isTemporarilyPaused()) gear.textContent = isDe ? "SKIP PAUSIERT" : "SKIP PAUSED";
      else gear.textContent = isDe ? "SKIP AN" : "SKIP ON";
    }
  }

  function addSettingsUi() {
    if (document.getElementById("adn-auto-skip-gear")) return;
    injectStyles();

    gear = createElement("button", "", { id: "adn-auto-skip-gear", textContent: "SKIP ON" });

    panel = createElement("div", "", { id: "adn-auto-skip-panel" });

    const titleText = createElement("h2", "adn-title", { textContent: "ADN Auto Skip" });
    const closeBtn = createElement("button", "adn-close-btn", { textContent: "×", title: "Close" });
    closeBtn.addEventListener("click", () => panel.classList.remove("adn-panel-open"));
    const header = createElement("div", "adn-header", {}, [titleText, closeBtn]);

    const tabsNav = createElement("div", "adn-tabs");
    const tabsContentContainer = createElement("div", "adn-tabs-content");

    const tabs = [
      {
        id: "tab-general",
        label: "General",
        rows: [
          makeRow("Enable Auto Skip", makeCheckbox("enabled")),
          makeRow("Delay (ms)", makeNumber("delayMs", 0, 60000, 50)),
          makeRow("Theme", makeSelect("uiTheme", [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }])),
          makeRow("Pause duration (m)", makeNumber("pauseMinutes", 1, 180, 1))
        ]
      },
      {
        id: "tab-skip",
        label: "Skipping",
        rows: [
          makeRow("Skip Intro", makeCheckbox("skipIntro")),
          makeRow("Skip Recap", makeCheckbox("skipRecap")),
          makeRow("Skip Credits/Ending", makeCheckbox("skipCredits")),
          makeRow("Skip Next Episode", makeCheckbox("skipNextEpisode")),
          makeRow("Require player context", makeCheckbox("requirePlayerContext")),
          makeRow("Jump seconds (+/-)", makeNumber("jumpSeconds", 1, 600, 1))
        ]
      },
      {
        id: "tab-keys",
        label: "Hotkeys",
        rows: [
          makeRow("Skip intro key", makeHotkeyInput("introSkipKey", 100)),
          makeRow("Jump to start key", makeHotkeyInput("introBackKey", 100)),
          makeRow("Suppress once key", makeHotkeyInput("skipCurrentOnceKey", 100)),
          makeRow("Toggle key", makeHotkeyInput("toggleKey", 100)),
          makeRow("Pause key", makeHotkeyInput("pauseKey", 100))
        ]
      },
      {
        id: "tab-sys",
        label: "System",
        rows: [
          makeRow("Debug logs", makeCheckbox("debug")),
          makeRow("Daily update check", makeCheckbox("updateCheckEnabled"))
        ]
      }
    ];

    let activeTabBtn = null;
    let activeTabContent = null;

    tabs.forEach((tab, index) => {
      const btn = createElement("button", "adn-tab", { textContent: tab.label });
      const content = createElement("div", "adn-tab-content", {}, tab.rows);

      if (index === 0) {
        btn.classList.add("adn-active");
        content.classList.add("adn-active");
        activeTabBtn = btn;
        activeTabContent = content;
      }

      btn.addEventListener("click", () => {
        if (activeTabBtn) activeTabBtn.classList.remove("adn-active");
        if (activeTabContent) activeTabContent.classList.remove("adn-active");
        btn.classList.add("adn-active");
        content.classList.add("adn-active");
        activeTabBtn = btn;
        activeTabContent = content;
      });

      tabsNav.appendChild(btn);
      tabsContentContainer.appendChild(content);
    });

    pauseLabel = createElement("div", "adn-pause-info", { textContent: "Auto Skip Active" });
    updateLabel = createElement("div", "adn-pause-info", { textContent: "Update check: ready" });

    const pauseBtn = createElement("button", "adn-btn", { textContent: "Pause" });
    pauseBtn.addEventListener("click", () => pauseForMinutes(settings.pauseMinutes));

    const resumeBtn = createElement("button", "adn-btn", { textContent: "Resume" });
    resumeBtn.addEventListener("click", () => resumeNow());

    const resetBtn = createElement("button", "adn-btn", { textContent: "Reset" });
    resetBtn.addEventListener("click", () => {
      if (confirm("Reset all settings to default?")) saveSettings(DEFAULTS);
    });

    const checkNowBtn = createElement("button", "adn-btn", { textContent: "Check update now" });
    checkNowBtn.addEventListener("click", async () => {
      if (checkNowBtn.disabled) return;
      const old = checkNowBtn.textContent;
      checkNowBtn.disabled = true;
      checkNowBtn.textContent = "Checking...";
      try {
        await checkForUpdates(true);
      } finally {
        checkNowBtn.disabled = false;
        checkNowBtn.textContent = old;
      }
    });

    updateActionBtn = createElement("button", "adn-btn", { textContent: "No update", disabled: true });
    updateActionBtn.addEventListener("click", () => {
      if (updateActionBtn.disabled) return;
      if (settings.updateInstallPending) {
        window.location.reload();
        return;
      }
      const popup = window.open(UPDATE_SOURCE_URL, "_blank");
      if (popup) {
        saveSettings({ updateInstallPending: true, updateLastError: "" });
        updateInstallWindow = popup;
        if (updateInstallWatchTimer) window.clearInterval(updateInstallWatchTimer);
        updateInstallWatchTimer = window.setInterval(() => {
          if (!updateInstallWindow) return;
          if (updateInstallWindow.closed) {
            window.clearInterval(updateInstallWatchTimer);
            updateInstallWatchTimer = null;
            window.location.reload();
          }
        }, 700);
      } else {
        saveSettings({
          updateLastResult: "error",
          updateLastError: "Popup blocked. Please allow popups for this site.",
        });
      }
    });

    const quickActionsRow1 = createElement("div", "adn-quick-actions", {}, [pauseBtn, resumeBtn]);
    const quickActionsRow2 = createElement("div", "adn-quick-actions", {}, [resetBtn, checkNowBtn, updateActionBtn]);

    const statusWrap = createElement("div", "", {}, [pauseLabel, updateLabel]);
    const footerTop = createElement("div", "adn-footer-top", {}, [statusWrap, quickActionsRow1]);
    const footer = createElement("div", "adn-footer", {}, [footerTop, quickActionsRow2]);

    panel.append(header, tabsNav, tabsContentContainer, footer);

    gear.addEventListener("click", () => {
      panel.classList.toggle("adn-panel-open");
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

    const suppressCurrentVisibleSkipOnce = () => {
      const candidates = getVisibleAutoSkipCandidates();
      const first = candidates.find((c) => c.el !== suppressedCurrentButton);
      if (!first) return false;
      suppressedCurrentButton = first.el;
      log("Suppressed once:", first.category, first.el);
      updatePlayerNoSkipButtonText();
      return true;
    };

    const shouldIgnoreHotkeys = (target) => {
      if (!(target instanceof Element)) return false;
      if (target.closest("#adn-auto-skip-panel, #adn-auto-skip-gear")) return true;
      return (
        (target instanceof HTMLInputElement) ||
        (target instanceof HTMLTextAreaElement) ||
        (target instanceof HTMLSelectElement) ||
        target.isContentEditable
      );
    };

    document.addEventListener("keydown", (e) => {
      if (shouldIgnoreHotkeys(e.target)) return;

      if (matchesCombo(e, settings.skipCurrentOnceKey)) {
        if (suppressCurrentVisibleSkipOnce()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

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
    startUpdateChecker();
    scanAndSkip();
    log("Loaded", settings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
