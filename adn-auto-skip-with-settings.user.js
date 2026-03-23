// ==UserScript==
// @name         ADN Auto Skip with Settings
// @namespace    local.adn.autoskip
// @version      1.9.0
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

(() => {
  "use strict";

  const SCRIPT_VERSION = (typeof GM_info !== "undefined" && GM_info?.script?.version)
  ? GM_info.script.version
  : "1.9.0";

  const STORAGE_KEY = "ADN_AUTO_SKIP_SETTINGS_V1";
  const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const UPDATE_SNOOZE_MS = 4 * 60 * 60 * 1000; // 4 hours snooze

  const GITHUB_REPO = "Miximilian2270/adn-autoskip";
  const UPDATE_SOURCE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/adn-auto-skip-with-settings.user.js`;
  const UPDATE_TAGS_URL = `https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=20`;
  const UPDATE_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`;
  const UPDATE_INSTALL_URL = UPDATE_SOURCE_URL;

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
    // Update settings
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

  // ── State ──────────────────────────────────────────────────
  let settings = loadSettings();
  let skipLoopTimer = null;
  let clickCooldown = new WeakMap();
  let pendingClicks = new WeakMap();
  let suppressedCurrentButton = null;
  let playerNoSkipButton = null;
  let playerNoSkipActive = false;
  let pauseLabel = null;
  let titleEl = null;
  let lastIntroStartTime = null;
  let updateCheckTimer = null;
  let updateBanner = null;
  let updateStatusEl = null;
  let updateProgressEl = null;

  // ── Utility ────────────────────────────────────────────────
  function log(...args) {
    if (settings.debug) console.log("[ADN AutoSkip]", ...args);
  }

  function isDe() {
    return navigator.language.startsWith("de");
  }

  function t(de, en) {
    return isDe() ? de : en;
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
      if (!settings.updateCheckEnabled) {
        settings.updateAvailable = false;
        settings.updateChangelog = "";
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    refreshPanelValues();
    refreshUpdateBanner();
    log("Settings saved", settings);
  }

  // ── Semver ─────────────────────────────────────────────────
  function compareSemver(a, b) {
    const ap = String(a).split(".").map((n) => Number(n) || 0);
    const bp = String(b).split(".").map((n) => Number(n) || 0);
    const len = Math.max(ap.length, bp.length);
    for (let i = 0; i < len; i++) {
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

  // ── HTTP ───────────────────────────────────────────────────
  function httpGet(url) {
    if (typeof GM_xmlhttpRequest === "function") {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url,
          nocache: true,
          timeout: 15000,
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

  // ── Update System ──────────────────────────────────────────
  async function getRemoteVersionAndChangelog() {
    let remoteVersion = null;
    let changelog = "";
    let releaseUrl = "";

    // Try releases first (has changelog)
    try {
      const releasesText = await httpGet(UPDATE_RELEASES_URL);
      const releases = JSON.parse(releasesText);
      if (Array.isArray(releases) && releases.length) {
        // Find all releases newer than current
        const newerReleases = releases
        .filter((r) => {
          const v = extractVersionFromTagName(r?.tag_name);
          return v && compareSemver(v, SCRIPT_VERSION) > 0;
        })
        .sort((a, b) => {
          const va = extractVersionFromTagName(a?.tag_name) || "0";
          const vb = extractVersionFromTagName(b?.tag_name) || "0";
          return compareSemver(vb, va);
        });

        if (newerReleases.length) {
          const latest = newerReleases[0];
          remoteVersion = extractVersionFromTagName(latest.tag_name);
          releaseUrl = latest.html_url || "";

          // Build changelog from all newer releases
          changelog = newerReleases
          .map((r) => {
            const v = extractVersionFromTagName(r.tag_name) || r.tag_name;
            const body = (r.body || "").trim();
            const name = (r.name || "").trim();
            let header = `v${v}`;
            if (name && name !== r.tag_name && name !== `v${v}`) {
              header += ` — ${name}`;
            }
            return body ? `**${header}**\n${body}` : `**${header}**`;
          })
          .join("\n\n");
        }
      }
    } catch (err) {
      log("Releases lookup failed, trying tags", err);
    }

    // Fallback: tags
    if (!remoteVersion) {
      try {
        const tagsText = await httpGet(UPDATE_TAGS_URL);
        const tags = JSON.parse(tagsText);
        if (Array.isArray(tags)) {
          const versions = tags
          .map((t) => extractVersionFromTagName(t?.name))
          .filter(Boolean)
          .sort((a, b) => compareSemver(b, a));
          if (versions.length) remoteVersion = versions[0];
        }
      } catch (err) {
        log("Tags lookup failed, trying raw script", err);
      }
    }

    // Last fallback: raw script header
    if (!remoteVersion) {
      const rawText = await httpGet(UPDATE_SOURCE_URL);
      remoteVersion = extractVersionFromScriptText(rawText);
      if (!remoteVersion) throw new Error("No @version found in remote script");
    }

    return { remoteVersion, changelog, releaseUrl };
  }

  async function checkForUpdates(force = false) {
    if (!settings.updateCheckEnabled) {
      if (settings.updateAvailable || settings.updateLastResult !== "disabled") {
        saveSettings({
          updateAvailable: false,
          updateLastResult: "disabled",
          updateLastError: "",
          updateChangelog: "",
          updateReleaseUrl: "",
        });
      }
      return;
    }

    const now = Date.now();
    const last = Number(settings.updateLastCheckTs || 0);
    if (!force && now - last < UPDATE_CHECK_INTERVAL_MS) return;

    saveSettings({ updateLastResult: "checking", updateLastError: "" });

    try {
      const { remoteVersion, changelog, releaseUrl } = await getRemoteVersionAndChangelog();
      const hasUpdate = compareSemver(remoteVersion, SCRIPT_VERSION) > 0;
      const isIgnored = settings.updateIgnoredVersion === remoteVersion;

      saveSettings({
        updateLastCheckTs: now,
        updateAvailable: hasUpdate && !isIgnored,
        updateLastRemoteVersion: remoteVersion,
        updateLastResult: hasUpdate ? "update" : "up_to_date",
        updateLastError: "",
        updateChangelog: hasUpdate ? changelog : "",
        updateReleaseUrl: hasUpdate ? releaseUrl : "",
      });

      log("Update check", { local: SCRIPT_VERSION, remote: remoteVersion, hasUpdate, isIgnored });
    } catch (err) {
      saveSettings({
        updateLastCheckTs: now,
        updateLastResult: "error",
        updateLastError: err?.message ? String(err.message).slice(0, 200) : "unknown error",
      });
      log("Update check error", err);
    }
  }

  function isUpdateSnoozed() {
    return Number(settings.updateSnoozedUntilTs || 0) > Date.now();
  }

  function snoozeUpdate() {
    saveSettings({ updateSnoozedUntilTs: Date.now() + UPDATE_SNOOZE_MS });
  }

  function ignoreCurrentUpdate() {
    const ver = settings.updateLastRemoteVersion;
    if (ver) {
      saveSettings({
        updateIgnoredVersion: ver,
        updateAvailable: false,
        updateChangelog: "",
      });
    }
  }

  function installUpdate() {
    // Open the raw script URL - userscript manager should intercept
    window.open(UPDATE_INSTALL_URL, "_blank");
    saveSettings({ updateLastSuccessfulUpdate: Date.now() });
  }

  function startUpdateChecker() {
    checkForUpdates(!!settings.updateAvailable);

    if (updateCheckTimer) clearInterval(updateCheckTimer);
    updateCheckTimer = setInterval(() => checkForUpdates(false), 60 * 60 * 1000);

    window.addEventListener("beforeunload", () => {
      if (updateCheckTimer) clearInterval(updateCheckTimer);
    }, { once: true });
  }

  // ── Pause / Time helpers ───────────────────────────────────
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

  // ── Text / Key helpers ─────────────────────────────────────
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
      ['[class*="player"]', '[class*="video"]', '[id*="player"]', '[id*="video"]', "video"].join(",")
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

  // ── Skip Logic ─────────────────────────────────────────────
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

    let nextText = "";
    let bgColor = "#e7e7e7";
    let textColor = "#111";
    let borderColor = "#777";

    if (isSuppressed) {
      nextText = t("Überspringen unterdrückt!", "Skip suppressed!");
      bgColor = "#4caf50";
      textColor = "#fff";
      borderColor = "#2e7d32";
    } else if (playerNoSkipActive) {
      nextText = t(
        `Auto Skip wieder aktivieren [${onceHint}]`,
        `Re-enable Auto Skip [${onceHint}]`
      );
    } else {
      nextText = t(
        `Auto Skip deaktivieren [${onceHint}]`,
        `Disable Auto Skip [${onceHint}]`
      );
    }

    if (playerNoSkipButton.textContent !== nextText) {
      playerNoSkipButton.textContent = nextText;
    }
    Object.assign(playerNoSkipButton.style, {
      background: bgColor,
      color: textColor,
      borderColor,
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
      if (skipLoopTimer) clearInterval(skipLoopTimer);
    }, { once: true });
  }

  // ── UI helpers ─────────────────────────────────────────────
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
    input.addEventListener("change", () => {
      saveSettings({ [key]: input.checked });
      if (key === "updateCheckEnabled" && input.checked) {
        checkForUpdates(true);
      }
    });
    return input;
  }

  function makeNumber(key, min, max, step = 1) {
    const input = createElement("input", "adn-input", {
      type: "number", min: String(min), max: String(max),
                                step: String(step), value: String(settings[key]),
    });
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
    options.forEach((opt) => {
      select.appendChild(createElement("option", "", { value: opt.value, textContent: opt.label }));
    });
    select.value = settings[key];
    select.dataset.settingKey = key;
    select.addEventListener("change", () => saveSettings({ [key]: select.value }));
    return select;
  }

  function makeHotkeyInput(key, width = 120) {
    const input = createElement("input", "adn-input", {
      type: "text", readOnly: true,
      value: formatComboForDisplay(settings[key] || ""),
    });
    input.style.width = width + "px";
    input.style.cursor = "pointer";
    input.title = t("Klicke und drücke Tastenkombination", "Click and press key combination");
    input.dataset.settingKey = key;
    input.dataset.capturing = "0";

    const exitCapture = () => {
      input.dataset.capturing = "0";
      input.value = formatComboForDisplay(settings[key] || "");
      input.blur();
    };
    input.addEventListener("focus", () => {
      input.dataset.capturing = "1";
      input.value = t("Tasten drücken...", "Press keys...");
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

  // ── Markdown-light renderer for changelog ──────────────────
  function renderChangelogText(text) {
    if (!text) return null;
    const container = createElement("div", "adn-changelog-text");
    // Simple rendering: bold headers, line breaks, bullet points
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        container.appendChild(createElement("br"));
        continue;
      }
      const el = createElement("div", "adn-changelog-line");
      // Bold **text**
      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        el.style.fontWeight = "700";
        el.style.marginTop = "8px";
        el.style.fontSize = "13px";
        el.textContent = trimmed.replace(/\*\*/g, "");
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        el.textContent = `  •  ${trimmed.slice(2)}`;
        el.style.paddingLeft = "8px";
      } else {
        el.textContent = trimmed;
      }
      container.appendChild(el);
    }
    return container;
  }

  // ── Update Banner ──────────────────────────────────────────
  function createUpdateBanner() {
    if (updateBanner) return;

    updateBanner = createElement("div", "adn-update-banner");
    updateBanner.id = "adn-update-banner";

    document.body.appendChild(updateBanner);
  }

  function refreshUpdateBanner() {
    if (!updateBanner) return;

    const shouldShow = settings.updateCheckEnabled
    && settings.updateAvailable
    && !isUpdateSnoozed()
    && settings.updateIgnoredVersion !== settings.updateLastRemoteVersion;

    if (!shouldShow) {
      updateBanner.classList.remove("adn-banner-visible");
      return;
    }

    const remote = settings.updateLastRemoteVersion;
    const changelog = settings.updateChangelog;
    const releaseUrl = settings.updateReleaseUrl;

    updateBanner.innerHTML = "";

    // Header
    const header = createElement("div", "adn-banner-header");
    const icon = createElement("span", "adn-banner-icon", { textContent: "🔄" });
    const title = createElement("span", "adn-banner-title", {
      textContent: t(
        `Update verfügbar: v${SCRIPT_VERSION} → v${remote}`,
        `Update available: v${SCRIPT_VERSION} → v${remote}`
      ),
    });
    const closeBtn = createElement("button", "adn-banner-close", { textContent: "×" });
    closeBtn.addEventListener("click", () => {
      snoozeUpdate();
    });
    header.append(icon, title, closeBtn);
    updateBanner.appendChild(header);

    // Changelog
    if (changelog) {
      const changelogSection = createElement("div", "adn-banner-changelog");
      const changelogTitle = createElement("div", "adn-banner-changelog-title", {
        textContent: t("Änderungen:", "What's new:"),
      });
      changelogSection.appendChild(changelogTitle);

      const rendered = renderChangelogText(changelog);
      if (rendered) {
        const scrollArea = createElement("div", "adn-banner-changelog-scroll");
        scrollArea.appendChild(rendered);
        changelogSection.appendChild(scrollArea);
      }
      updateBanner.appendChild(changelogSection);
    }

    // Actions
    const actions = createElement("div", "adn-banner-actions");

    const installBtn = createElement("button", "adn-btn adn-btn-primary", {
      textContent: t("Jetzt installieren", "Install now"),
    });
    installBtn.addEventListener("click", () => installUpdate());

    const snoozeBtn = createElement("button", "adn-btn", {
      textContent: t("Später erinnern", "Remind me later"),
    });
    snoozeBtn.addEventListener("click", () => snoozeUpdate());

    const ignoreBtn = createElement("button", "adn-btn adn-btn-subtle", {
      textContent: t("Version ignorieren", "Ignore this version"),
    });
    ignoreBtn.addEventListener("click", () => {
      if (confirm(t(
        `Version v${remote} wirklich ignorieren?`,
        `Really ignore version v${remote}?`
      ))) {
        ignoreCurrentUpdate();
      }
    });

    actions.append(installBtn, snoozeBtn, ignoreBtn);

    if (releaseUrl) {
      const viewBtn = createElement("a", "adn-btn adn-btn-link", {
        textContent: t("Release ansehen", "View release"),
                                    href: releaseUrl,
                                    target: "_blank",
      });
      actions.appendChild(viewBtn);
    }

    updateBanner.appendChild(actions);
    updateBanner.classList.add("adn-banner-visible");
  }

  // ── Styles ─────────────────────────────────────────────────
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
      --adn-success: #4caf50;
      --adn-warning: #ff9800;
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

    /* Gear button */
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
    display: flex;
    align-items: center;
    gap: 6px;
    }
    #adn-auto-skip-gear:hover {
    transform: translateY(-2px);
    }
    #adn-auto-skip-gear .adn-gear-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--adn-success);
    flex-shrink: 0;
    }
    #adn-auto-skip-gear .adn-gear-dot.off {
    background: var(--adn-danger);
    }
    #adn-auto-skip-gear .adn-gear-dot.paused {
    background: var(--adn-warning);
    }
    #adn-auto-skip-gear .adn-gear-dot.update {
    background: var(--adn-danger);
    animation: adn-pulse 1.5s infinite;
    }
    @keyframes adn-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.4); }
    }

    /* Panel */
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
      margin-bottom: 8px;
    }
    .adn-title {
      font-size: 16px;
      font-weight: 700;
      margin: 0;
    }
    .adn-version-badge {
      font-size: 11px;
      color: var(--adn-muted);
      background: var(--adn-btn-bg);
      padding: 2px 8px;
      border-radius: 10px;
      margin-left: 8px;
      font-weight: 400;
    }
    .adn-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 12px;
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
      position: relative;
    }
    .adn-tab:hover {
      color: var(--adn-text);
      background: var(--adn-btn-bg);
    }
    .adn-tab.adn-active {
      background: var(--adn-accent);
      color: #fff;
    }
    .adn-tab .adn-tab-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--adn-danger);
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
      text-decoration: none;
    }
    .adn-btn:hover {
      background: var(--adn-btn-hover);
    }
    .adn-btn:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }
    .adn-btn-primary {
      background: var(--adn-accent);
      color: #fff;
      border-color: var(--adn-accent);
      font-weight: 600;
    }
    .adn-btn-primary:hover {
      filter: brightness(1.1);
      background: var(--adn-accent);
    }
    .adn-btn-subtle {
      opacity: 0.7;
      font-size: 12px;
    }
    .adn-btn-subtle:hover {
      opacity: 1;
    }
    .adn-btn-link {
      border: none;
      background: transparent;
      color: var(--adn-accent);
      text-decoration: underline;
      padding: 4px 8px;
      font-size: 12px;
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
      gap: 10px;
      margin-top: 12px;
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
    }
    .adn-quick-actions {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    /* Update info in System tab */
    .adn-update-info {
      background: var(--adn-input-bg);
      border: 1px solid var(--adn-border);
      border-radius: 8px;
      padding: 10px;
      margin-top: 8px;
      font-size: 12px;
      color: var(--adn-muted);
    }
    .adn-update-info-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 0;
    }
    .adn-update-info-label {
      opacity: 0.7;
    }
    .adn-update-info-value {
      font-weight: 600;
      color: var(--adn-text);
    }
    .adn-update-info-value.adn-available {
      color: var(--adn-danger);
    }
    .adn-update-info-value.adn-current {
      color: var(--adn-success);
    }
    .adn-update-progress {
      height: 3px;
      background: var(--adn-border);
      border-radius: 2px;
      margin-top: 8px;
      overflow: hidden;
    }
    .adn-update-progress-bar {
      height: 100%;
      background: var(--adn-accent);
      border-radius: 2px;
      width: 0%;
      transition: width 0.5s ease;
    }
    .adn-update-progress.checking .adn-update-progress-bar {
      width: 100%;
      animation: adn-progress-indeterminate 1.5s infinite;
    }
    @keyframes adn-progress-indeterminate {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(200%); }
    }

    /* Update Banner (floating) */
    .adn-update-banner {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 360px;
      max-width: calc(100vw - 40px);
      z-index: 2147483647;
      background: var(--adn-bg);
      border: 1px solid var(--adn-accent);
      border-radius: 12px;
      padding: 0;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,168,255,0.2);
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 13px;
      color: var(--adn-text);
      opacity: 0;
      visibility: hidden;
      transform: translateY(-20px) scale(0.95);
      transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
      overflow: hidden;
    }
    .adn-update-banner.adn-banner-visible {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .adn-banner-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--adn-border);
    }
    .adn-banner-icon {
      font-size: 20px;
      flex-shrink: 0;
    }
    .adn-banner-title {
      flex: 1;
      font-weight: 700;
      font-size: 14px;
    }
    .adn-banner-close {
      background: transparent;
      border: none;
      color: var(--adn-muted);
      cursor: pointer;
      font-size: 20px;
      padding: 0;
      line-height: 1;
      flex-shrink: 0;
    }
    .adn-banner-close:hover {
      color: var(--adn-text);
    }
    .adn-banner-changelog {
      padding: 10px 16px;
    }
    .adn-banner-changelog-title {
      font-weight: 600;
      font-size: 12px;
      color: var(--adn-muted);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .adn-banner-changelog-scroll {
      max-height: 150px;
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: var(--adn-border) transparent;
      font-size: 12px;
      line-height: 1.5;
      color: var(--adn-text);
      opacity: 0.9;
    }
    .adn-banner-actions {
      display: flex;
      gap: 8px;
      padding: 12px 16px 14px;
      flex-wrap: wrap;
      border-top: 1px solid var(--adn-border);
    }
    `;
    document.head.appendChild(style);
  }

  // ── Settings Panel ─────────────────────────────────────────
  let panel = null;
  let gear = null;
  let gearDot = null;
  let gearText = null;
  let systemTabBtn = null;
  let systemTabBadge = null;
  let updateInfoContainer = null;

  function refreshPanelValues() {
    if (!panel) return;

    document.documentElement.setAttribute(
      "data-adn-theme",
      settings.uiTheme === "light" ? "light" : "dark"
    );

    panel.querySelectorAll("[data-setting-key]").forEach((el) => {
      const key = el.dataset.settingKey;
      if (document.activeElement === el) return;
      if (el.type === "checkbox") el.checked = !!settings[key];
      else if (el.tagName === "SELECT") el.value = String(settings[key]);
      else if (el.type === "text") el.value = formatComboForDisplay(settings[key] || "");
      else el.value = String(settings[key]);
    });

      // Gear button
      if (gear) {
        let statusText = "";
        let dotClass = "";

        if (!settings.enabled) {
          statusText = t("SKIP AUS", "SKIP OFF");
          dotClass = "off";
        } else if (isTemporarilyPaused()) {
          const sec = Math.ceil(pauseRemainingMs() / 1000);
          statusText = t(`PAUSE ${sec}s`, `PAUSED ${sec}s`);
          dotClass = "paused";
        } else {
          statusText = t("SKIP AN", "SKIP ON");
          dotClass = "";
        }

        if (settings.updateCheckEnabled && settings.updateAvailable) {
          dotClass = "update";
        }

        if (gearText) gearText.textContent = statusText;
        if (gearDot) gearDot.className = `adn-gear-dot ${dotClass}`;
      }

      // Pause label
      if (pauseLabel) {
        if (isTemporarilyPaused()) {
          const sec = Math.ceil(pauseRemainingMs() / 1000);
          pauseLabel.textContent = t(`Pausiert: ${sec}s`, `Paused: ${sec}s`);
        } else {
          pauseLabel.textContent = t("Auto Skip Aktiv", "Auto Skip Active");
        }
      }

      // System tab badge
      if (systemTabBadge) {
        systemTabBadge.style.display =
        settings.updateCheckEnabled && settings.updateAvailable ? "block" : "none";
      }

      // Update info in system tab
      refreshUpdateInfo();
  }

  function refreshUpdateInfo() {
    if (!updateInfoContainer) return;
    updateInfoContainer.innerHTML = "";

    const fmtTime = (ts) => {
      const n = Number(ts || 0);
      if (!n) return t("nie", "never");
      try { return new Date(n).toLocaleString(); } catch { return "?"; }
    };

    const result = settings.updateLastResult || "idle";
    const remote = settings.updateLastRemoteVersion;
    const hasUpdate = settings.updateAvailable;

    // Version row
    const versionRow = createElement("div", "adn-update-info-row");
    versionRow.appendChild(createElement("span", "adn-update-info-label", {
      textContent: t("Installierte Version:", "Installed version:"),
    }));
    versionRow.appendChild(createElement("span", "adn-update-info-value", {
      textContent: `v${SCRIPT_VERSION}`,
    }));
    updateInfoContainer.appendChild(versionRow);

    // Remote version row
    if (remote) {
      const remoteRow = createElement("div", "adn-update-info-row");
      remoteRow.appendChild(createElement("span", "adn-update-info-label", {
        textContent: t("Neueste Version:", "Latest version:"),
      }));
      const remoteVal = createElement("span", `adn-update-info-value ${hasUpdate ? "adn-available" : "adn-current"}`, {
        textContent: `v${remote}`,
      });
      remoteRow.appendChild(remoteVal);
      updateInfoContainer.appendChild(remoteRow);
    }

    // Status row
    const statusRow = createElement("div", "adn-update-info-row");
    statusRow.appendChild(createElement("span", "adn-update-info-label", {
      textContent: "Status:",
    }));
    let statusText = "";
    let statusEmoji = "";
    if (result === "checking") { statusText = t("Prüfe...", "Checking..."); statusEmoji = "🔄"; }
    else if (result === "up_to_date") { statusText = t("Aktuell", "Up to date"); statusEmoji = "✅"; }
    else if (result === "update") { statusText = t("Update verfügbar!", "Update available!"); statusEmoji = "🆕"; }
    else if (result === "error") { statusText = t("Fehler", "Error"); statusEmoji = "❌"; }
    else if (result === "disabled") { statusText = t("Deaktiviert", "Disabled"); statusEmoji = "⏸️"; }
    else { statusText = t("Bereit", "Ready"); statusEmoji = "⏳"; }
    statusRow.appendChild(createElement("span", "adn-update-info-value", {
      textContent: `${statusEmoji} ${statusText}`,
    }));
    updateInfoContainer.appendChild(statusRow);

    // Last check row
    const lastCheckRow = createElement("div", "adn-update-info-row");
    lastCheckRow.appendChild(createElement("span", "adn-update-info-label", {
      textContent: t("Letzte Prüfung:", "Last check:"),
    }));
    lastCheckRow.appendChild(createElement("span", "adn-update-info-value", {
      textContent: fmtTime(settings.updateLastCheckTs),
    }));
    updateInfoContainer.appendChild(lastCheckRow);

    // Error row
    if (settings.updateLastError) {
      const errRow = createElement("div", "adn-update-info-row");
      errRow.appendChild(createElement("span", "adn-update-info-label", {
        textContent: t("Fehler:", "Error:"),
      }));
      const errVal = createElement("span", "adn-update-info-value", {
        textContent: settings.updateLastError,
      });
      errVal.style.color = "var(--adn-danger)";
      errVal.style.fontSize = "11px";
      errVal.style.wordBreak = "break-all";
      errRow.appendChild(errVal);
      updateInfoContainer.appendChild(errRow);
    }

    // Progress bar
    if (updateProgressEl) {
      updateProgressEl.className = `adn-update-progress ${result === "checking" ? "checking" : ""}`;
    }

    // Action buttons
    const actionsRow = createElement("div", "adn-quick-actions");
    actionsRow.style.marginTop = "10px";

    const checkBtn = createElement("button", "adn-btn", {
      textContent: t("Jetzt prüfen", "Check now"),
    });
    checkBtn.addEventListener("click", async () => {
      checkBtn.disabled = true;
      checkBtn.textContent = t("Prüfe...", "Checking...");
      try {
        await checkForUpdates(true);
      } finally {
        checkBtn.disabled = false;
        checkBtn.textContent = t("Jetzt prüfen", "Check now");
      }
    });
    actionsRow.appendChild(checkBtn);

    if (hasUpdate) {
      const installBtn = createElement("button", "adn-btn adn-btn-primary", {
        textContent: t("Installieren", "Install"),
      });
      installBtn.addEventListener("click", () => installUpdate());
      actionsRow.appendChild(installBtn);

      if (settings.updateReleaseUrl) {
        const viewBtn = createElement("a", "adn-btn adn-btn-link", {
          textContent: t("Release ↗", "Release ↗"),
                                      href: settings.updateReleaseUrl,
                                      target: "_blank",
        });
        actionsRow.appendChild(viewBtn);
      }
    }

    updateInfoContainer.appendChild(actionsRow);
  }

  function addSettingsUi() {
    if (document.getElementById("adn-auto-skip-gear")) return;
    injectStyles();

    // Gear button with status dot
    gear = createElement("button", "", { id: "adn-auto-skip-gear" });
    gearDot = createElement("span", "adn-gear-dot");
    gearText = createElement("span", "", { textContent: "SKIP ON" });
    gear.append(gearDot, gearText);

    // Panel
    panel = createElement("div", "", { id: "adn-auto-skip-panel" });

    const titleWrap = createElement("div", "", { style: "display:flex;align-items:baseline;" });
    const titleText = createElement("h2", "adn-title", { textContent: "ADN Auto Skip" });
    const versionBadge = createElement("span", "adn-version-badge", { textContent: `v${SCRIPT_VERSION}` });
    titleWrap.append(titleText, versionBadge);

    const closeBtn = createElement("button", "adn-close-btn", { textContent: "×", title: "Close" });
    closeBtn.addEventListener("click", () => panel.classList.remove("adn-panel-open"));

    const header = createElement("div", "adn-header", {}, [titleWrap, closeBtn]);
    const tabsNav = createElement("div", "adn-tabs");
    const tabsContentContainer = createElement("div", "adn-tabs-content");

    // Update info section for system tab
    updateInfoContainer = createElement("div", "adn-update-info");
    updateProgressEl = createElement("div", "adn-update-progress");
    updateProgressEl.appendChild(createElement("div", "adn-update-progress-bar"));

    const updateSection = createElement("div", "", {}, [updateProgressEl, updateInfoContainer]);

    const tabs = [
      {
        id: "tab-general",
 label: t("Allgemein", "General"),
 rows: [
   makeRow(t("Auto Skip aktivieren", "Enable Auto Skip"), makeCheckbox("enabled")),
 makeRow(t("Verzögerung (ms)", "Delay (ms)"), makeNumber("delayMs", 0, 60000, 50)),
 makeRow("Theme", makeSelect("uiTheme", [
   { value: "dark", label: "Dark" },
   { value: "light", label: "Light" },
 ])),
 makeRow(t("Pause-Dauer (Min)", "Pause duration (min)"), makeNumber("pauseMinutes", 1, 180, 1)),
 ],
      },
 {
   id: "tab-skip",
 label: t("Überspringen", "Skipping"),
 rows: [
   makeRow("Skip Intro", makeCheckbox("skipIntro")),
 makeRow("Skip Recap", makeCheckbox("skipRecap")),
 makeRow(t("Skip Credits/Ending", "Skip Credits/Ending"), makeCheckbox("skipCredits")),
 makeRow(t("Skip Nächste Episode", "Skip Next Episode"), makeCheckbox("skipNextEpisode")),
 makeRow(t("Player-Kontext erfordern", "Require player context"), makeCheckbox("requirePlayerContext")),
 makeRow(t("Sprung-Sekunden (+/-)", "Jump seconds (+/-)"), makeNumber("jumpSeconds", 1, 600, 1)),
 ],
 },
 {
   id: "tab-keys",
 label: "Hotkeys",
 rows: [
   makeRow(t("Intro überspringen", "Skip intro key"), makeHotkeyInput("introSkipKey", 100)),
 makeRow(t("Zum Anfang springen", "Jump to start key"), makeHotkeyInput("introBackKey", 100)),
 makeRow(t("Einmal unterdrücken", "Suppress once key"), makeHotkeyInput("skipCurrentOnceKey", 100)),
 makeRow(t("Ein/Aus Taste", "Toggle key"), makeHotkeyInput("toggleKey", 100)),
 makeRow(t("Pause Taste", "Pause key"), makeHotkeyInput("pauseKey", 100)),
 ],
 },
 {
   id: "tab-sys",
 label: "System",
 badge: true,
 rows: [
   makeRow("Debug Logs", makeCheckbox("debug")),
 makeRow(t("Täglicher Update-Check", "Daily update check"), makeCheckbox("updateCheckEnabled")),
 updateSection,
 ],
 },
    ];

    let activeTabBtn = null;
    let activeTabContent = null;

    tabs.forEach((tab, index) => {
      const btn = createElement("button", "adn-tab", { textContent: tab.label });

      if (tab.badge) {
        systemTabBadge = createElement("span", "adn-tab-badge");
        systemTabBadge.style.display = "none";
        btn.style.position = "relative";
        btn.appendChild(systemTabBadge);
        systemTabBtn = btn;
      }

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

    // Footer
    pauseLabel = createElement("div", "adn-pause-info", { textContent: "Auto Skip Active" });

    const pauseBtn = createElement("button", "adn-btn", { textContent: t("Pause", "Pause") });
    pauseBtn.addEventListener("click", () => pauseForMinutes(settings.pauseMinutes));

    const resumeBtn = createElement("button", "adn-btn", { textContent: t("Fortsetzen", "Resume") });
    resumeBtn.addEventListener("click", () => resumeNow());

    const resetBtn = createElement("button", "adn-btn adn-btn-subtle", { textContent: "Reset" });
    resetBtn.addEventListener("click", () => {
      if (confirm(t(
        "Alle Einstellungen auf Standard zurücksetzen?",
        "Reset all settings to default?"
      ))) {
        saveSettings(DEFAULTS);
      }
    });

    const quickActions = createElement("div", "adn-quick-actions", {}, [pauseBtn, resumeBtn, resetBtn]);
    const footerTop = createElement("div", "adn-footer-top", {}, [pauseLabel, quickActions]);
    const footer = createElement("div", "adn-footer", {}, [footerTop]);

    panel.append(header, tabsNav, tabsContentContainer, footer);

    gear.addEventListener("click", () => {
      panel.classList.toggle("adn-panel-open");
    });

    // Close panel on outside click
    document.addEventListener("click", (e) => {
      if (!panel.classList.contains("adn-panel-open")) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      panel.classList.remove("adn-panel-open");
    });

    document.body.append(gear, panel);

    // Create update banner
    createUpdateBanner();

    setInterval(() => refreshPanelValues(), 1000);
    refreshPanelValues();
  }

  // ── Hotkeys ────────────────────────────────────────────────
  function setupHotkeys() {
    const trySkipIntroViaButton = () => {
      const btn = document.querySelector(
        'a[data-testid="skip-intro-button"], button[data-testid="skip-intro-button"]'
      );
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
      v.currentTime = Math.max(0, Math.min(max, (v.currentTime || 0) + seconds));
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
      if (target.closest("#adn-auto-skip-panel, #adn-auto-skip-gear, #adn-update-banner")) return true;
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
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

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    addSettingsUi();
    startObservers();
    setupHotkeys();
    startUpdateChecker();
    scanAndSkip();
    log("Loaded v" + SCRIPT_VERSION, settings);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
