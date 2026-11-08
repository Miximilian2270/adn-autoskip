// ==UserScript==
// @name         ADN Auto Skip with Settings
// @namespace    local.adn.autoskip
// @version      2.1.1
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
  : "2.1.1";

  const STORAGE_KEY = "ADN_AUTO_SKIP_SETTINGS_V1";
  const UPDATE_LOCK_KEY = "ADN_AUTO_SKIP_UPDATE_LOCK";
  const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;
  const UPDATE_SNOOZE_MS = 4 * 60 * 60 * 1000;
  const UPDATE_LOCK_TTL_MS = 30 * 1000;

  const GITHUB_REPO = "Miximilian2270/adn-autoskip";
  const UPDATE_SOURCE_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/adn-auto-skip-with-settings.user.js`;
  const UPDATE_TAGS_URL = `https://api.github.com/repos/${GITHUB_REPO}/tags?per_page=20`;
  const UPDATE_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`;
  const UPDATE_INSTALL_URL = UPDATE_SOURCE_URL;

  /* ─── i18n ─────────────────────────────────────────────── */
  const LANG = {
    en: {
      "gear.on":"SKIP ON","gear.off":"SKIP OFF","gear.paused":"PAUSED {time}","gear.update":"UPDATE",
      "panel.title":"ADN Auto Skip",
      "tab.general":"General","tab.skip":"Skip","tab.keys":"Keys","tab.system":"System",
      "card.behavior":"Behavior","card.appearance":"Appearance","card.categories":"Categories",
      "card.detection":"Detection","card.hotkeys":"Hotkeys","card.jump":"Jump",
      "card.maintenance":"Maintenance","card.settings":"Settings","card.updates":"Updates",
      "general.enable":"Enable Auto Skip","general.delay":"Delay before skipping",
      "general.auto_fullscreen":"Auto fullscreen on play",
      "general.theme":"Theme","general.language":"Language",
      "general.toasts":"Notifications",
      "general.gear_pos":"Button position","general.gear_autohide":"Hide button when idle",
      "opt.auto":"Auto","opt.dark":"Dark","opt.light":"Light",
      "pos.br":"Bottom right","pos.bl":"Bottom left","pos.tr":"Top right","pos.tl":"Top left",
      "skip.intro":"Skip Intro","skip.recap":"Skip Recap",
      "skip.credits":"Skip Credits","skip.next":"Skip Next Episode",
      "skip.require_player":"Require player context","skip.jump_seconds":"Jump seconds",
      "keys.skip_intro":"Skip intro / jump","keys.jump_back":"Jump back",
      "keys.suppress":"Cancel current skip","keys.toggle":"Toggle on/off",
      "keys.pause":"Pause/Resume","keys.cheatsheet":"Show help",
      "keys.press":"Press keys…","keys.click_hint":"Click, then press keys (Esc cancels)",
      "keys.clear":"Clear hotkey","keys.conflict":"⚠ {key} is assigned twice: {a}",
      "sys.debug":"Debug logs","sys.update_check":"Auto update check",
      "sys.export":"Export","sys.import":"Import","sys.reset":"Reset all",
      "sys.check_now":"Check now","sys.checking":"Checking…",
      "sys.install":"Install","sys.release":"Release ↗","sys.reload":"Reload page",
      "sys.installed":"Installed","sys.latest":"Latest","sys.status":"Status",
      "sys.checked":"Checked","sys.error":"Error","sys.never":"never",
      "status.checking":"Checking…","status.up_to_date":"Up to date",
      "status.update":"Update available","status.error":"Error",
      "status.disabled":"Disabled","status.locked":"Other tab checking","status.ready":"Ready",
      "pause.active":"Auto Skip active","pause.paused":"Paused · {time} left","pause.off":"Auto Skip off",
      "pause.btn":"Pause","pause.resume":"Resume","pause.min":"min",
      "confirm.sure":"Sure? Click again",
      "import.success":"Settings imported","import.error":"Import failed: invalid file",
      "export.filename":"adn-autoskip-settings.json",
      "update.title":"Update available","update.subtitle":"v{old} → v{new}",
      "update.whats_new":"What's new","update.install_now":"Install now",
      "update.installed_q":"Update installed?","update.reload_hint":"Reload page to activate the new version.",
      "update.remind_later":"Later","update.ignore_version":"Ignore",
      "update.view_release":"View release",
      "toast.intro":"⏭ Intro skipped","toast.recap":"⏭ Recap skipped",
      "toast.credits":"⏭ Credits skipped","toast.next":"⏭ Next episode",
      "toast.enabled":"✅ Auto Skip on","toast.disabled":"⛔ Auto Skip off",
      "toast.paused":"⏸ Paused {min}m","toast.resumed":"▶ Resumed",
      "toast.suppressed":"🔇 Skip cancelled","toast.jump_fwd":"⏩ +{sec}s",
      "toast.jump_back":"⏪ Back",
      "cs.title":"Keyboard Shortcuts","cs.hint":"Press any key to close",
      "cs.toggle":"Toggle","cs.pause":"Pause / Resume",
      "cs.skip":"Skip / Jump","cs.back":"Jump back",
      "cs.suppress":"Cancel current skip","cs.help":"This help",
      "player.intro":"Skipping intro in {sec}s","player.recap":"Skipping recap in {sec}s",
      "player.credits":"Skipping credits in {sec}s","player.next":"Next episode in {sec}s",
      "player.cancel":"Cancel [{key}]","player.cancel_nokey":"Cancel",
      "player.suppressed":"Skip cancelled","player.reenable":"Re-enable",
    },
    de: {
      "gear.on":"SKIP AN","gear.off":"SKIP AUS","gear.paused":"PAUSE {time}","gear.update":"UPDATE",
      "panel.title":"ADN Auto Skip",
      "tab.general":"Allgemein","tab.skip":"Skip","tab.keys":"Tasten","tab.system":"System",
      "card.behavior":"Verhalten","card.appearance":"Darstellung","card.categories":"Kategorien",
      "card.detection":"Erkennung","card.hotkeys":"Tastenkürzel","card.jump":"Springen",
      "card.maintenance":"Wartung","card.settings":"Einstellungen","card.updates":"Updates",
      "general.enable":"Auto Skip aktivieren","general.delay":"Verzögerung vor dem Skip",
      "general.auto_fullscreen":"Automatisch Vollbild bei Wiedergabe",
      "general.theme":"Design","general.language":"Sprache",
      "general.toasts":"Benachrichtigungen",
      "general.gear_pos":"Button-Position","general.gear_autohide":"Button bei Inaktivität ausblenden",
      "opt.auto":"Automatisch","opt.dark":"Dunkel","opt.light":"Hell",
      "pos.br":"Unten rechts","pos.bl":"Unten links","pos.tr":"Oben rechts","pos.tl":"Oben links",
      "skip.intro":"Intro überspringen","skip.recap":"Recap überspringen",
      "skip.credits":"Credits überspringen","skip.next":"Nächste Episode",
      "skip.require_player":"Player-Kontext erforderlich","skip.jump_seconds":"Sprung-Sekunden",
      "keys.skip_intro":"Intro überspringen / springen","keys.jump_back":"Zurückspringen",
      "keys.suppress":"Aktuellen Skip abbrechen","keys.toggle":"Ein/Aus",
      "keys.pause":"Pause/Fortsetzen","keys.cheatsheet":"Hilfe anzeigen",
      "keys.press":"Tasten drücken…","keys.click_hint":"Klick, dann Tasten drücken (Esc bricht ab)",
      "keys.clear":"Tastenkürzel entfernen","keys.conflict":"⚠ {key} ist doppelt belegt: {a}",
      "sys.debug":"Debug-Logs","sys.update_check":"Auto Update-Check",
      "sys.export":"Exportieren","sys.import":"Importieren","sys.reset":"Alles zurücksetzen",
      "sys.check_now":"Jetzt prüfen","sys.checking":"Prüfe…",
      "sys.install":"Installieren","sys.release":"Release ↗","sys.reload":"Seite neu laden",
      "sys.installed":"Installiert","sys.latest":"Neueste","sys.status":"Status",
      "sys.checked":"Geprüft","sys.error":"Fehler","sys.never":"nie",
      "status.checking":"Prüfe…","status.up_to_date":"Aktuell",
      "status.update":"Update verfügbar","status.error":"Fehler",
      "status.disabled":"Deaktiviert","status.locked":"Anderer Tab prüft","status.ready":"Bereit",
      "pause.active":"Auto Skip aktiv","pause.paused":"Pausiert · {time}","pause.off":"Auto Skip aus",
      "pause.btn":"Pause","pause.resume":"Fortsetzen","pause.min":"Min",
      "confirm.sure":"Sicher? Nochmal klicken",
      "import.success":"Einstellungen importiert","import.error":"Import fehlgeschlagen",
      "export.filename":"adn-autoskip-einstellungen.json",
      "update.title":"Update verfügbar","update.subtitle":"v{old} → v{new}",
      "update.whats_new":"Änderungen","update.install_now":"Installieren",
      "update.installed_q":"Update installiert?","update.reload_hint":"Seite neu laden, um die neue Version zu aktivieren.",
      "update.remind_later":"Später","update.ignore_version":"Ignorieren",
      "update.view_release":"Release ansehen",
      "toast.intro":"⏭ Intro übersprungen","toast.recap":"⏭ Recap übersprungen",
      "toast.credits":"⏭ Credits übersprungen","toast.next":"⏭ Nächste Episode",
      "toast.enabled":"✅ Auto Skip an","toast.disabled":"⛔ Auto Skip aus",
      "toast.paused":"⏸ Pausiert {min}m","toast.resumed":"▶ Fortgesetzt",
      "toast.suppressed":"🔇 Skip abgebrochen","toast.jump_fwd":"⏩ +{sec}s",
      "toast.jump_back":"⏪ Zurück",
      "cs.title":"Tastenkürzel","cs.hint":"Beliebige Taste zum Schließen",
      "cs.toggle":"Ein/Aus","cs.pause":"Pause / Fortsetzen",
      "cs.skip":"Überspringen / Springen","cs.back":"Zurückspringen",
      "cs.suppress":"Aktuellen Skip abbrechen","cs.help":"Diese Hilfe",
      "player.intro":"Intro wird übersprungen in {sec}s","player.recap":"Recap wird übersprungen in {sec}s",
      "player.credits":"Credits werden übersprungen in {sec}s","player.next":"Nächste Episode in {sec}s",
      "player.cancel":"Abbrechen [{key}]","player.cancel_nokey":"Abbrechen",
      "player.suppressed":"Skip abgebrochen","player.reenable":"Wieder aktivieren",
    },
    fr: {
      "gear.on":"SKIP ON","gear.off":"SKIP OFF","gear.paused":"PAUSE {time}","gear.update":"MAJ",
      "panel.title":"ADN Auto Skip",
      "tab.general":"Général","tab.skip":"Passage","tab.keys":"Touches","tab.system":"Système",
      "card.behavior":"Comportement","card.appearance":"Apparence","card.categories":"Catégories",
      "card.detection":"Détection","card.hotkeys":"Raccourcis","card.jump":"Saut",
      "card.maintenance":"Maintenance","card.settings":"Paramètres","card.updates":"Mises à jour",
      "general.enable":"Activer Auto Skip","general.delay":"Délai avant le passage",
      "general.auto_fullscreen":"Plein écran auto à la lecture",
      "general.theme":"Thème","general.language":"Langue",
      "general.toasts":"Notifications",
      "general.gear_pos":"Position du bouton","general.gear_autohide":"Masquer le bouton si inactif",
      "opt.auto":"Auto","opt.dark":"Sombre","opt.light":"Clair",
      "pos.br":"En bas à droite","pos.bl":"En bas à gauche","pos.tr":"En haut à droite","pos.tl":"En haut à gauche",
      "skip.intro":"Passer l'intro","skip.recap":"Passer le récap",
      "skip.credits":"Passer le générique","skip.next":"Épisode suivant",
      "skip.require_player":"Contexte lecteur requis","skip.jump_seconds":"Secondes de saut",
      "keys.skip_intro":"Passer l'intro / sauter","keys.jump_back":"Retour",
      "keys.suppress":"Annuler le passage","keys.toggle":"Activer/Désactiver",
      "keys.pause":"Pause/Reprendre","keys.cheatsheet":"Aide",
      "keys.press":"Appuyez…","keys.click_hint":"Cliquez puis appuyez (Échap annule)",
      "keys.clear":"Effacer le raccourci","keys.conflict":"⚠ {key} est attribué deux fois : {a}",
      "sys.debug":"Logs debug","sys.update_check":"Vérif. auto",
      "sys.export":"Exporter","sys.import":"Importer","sys.reset":"Tout réinitialiser",
      "sys.check_now":"Vérifier","sys.checking":"Vérification…",
      "sys.install":"Installer","sys.release":"Release ↗","sys.reload":"Recharger la page",
      "sys.installed":"Installé","sys.latest":"Dernière","sys.status":"Statut",
      "sys.checked":"Vérifié","sys.error":"Erreur","sys.never":"jamais",
      "status.checking":"Vérification…","status.up_to_date":"À jour",
      "status.update":"Mise à jour dispo","status.error":"Erreur",
      "status.disabled":"Désactivé","status.locked":"Autre onglet vérifie","status.ready":"Prêt",
      "pause.active":"Auto Skip actif","pause.paused":"En pause · {time}","pause.off":"Auto Skip désactivé",
      "pause.btn":"Pause","pause.resume":"Reprendre","pause.min":"min",
      "confirm.sure":"Sûr ? Cliquez encore",
      "import.success":"Paramètres importés","import.error":"Échec de l'import",
      "export.filename":"adn-autoskip-parametres.json",
      "update.title":"Mise à jour","update.subtitle":"v{old} → v{new}",
      "update.whats_new":"Nouveautés","update.install_now":"Installer",
      "update.installed_q":"Mise à jour installée ?","update.reload_hint":"Rechargez la page pour activer la nouvelle version.",
      "update.remind_later":"Plus tard","update.ignore_version":"Ignorer",
      "update.view_release":"Voir la release",
      "toast.intro":"⏭ Intro passée","toast.recap":"⏭ Récap passé",
      "toast.credits":"⏭ Générique passé","toast.next":"⏭ Épisode suivant",
      "toast.enabled":"✅ Auto Skip activé","toast.disabled":"⛔ Auto Skip désactivé",
      "toast.paused":"⏸ En pause {min}m","toast.resumed":"▶ Repris",
      "toast.suppressed":"🔇 Passage annulé","toast.jump_fwd":"⏩ +{sec}s",
      "toast.jump_back":"⏪ Retour",
      "cs.title":"Raccourcis clavier","cs.hint":"Touche pour fermer",
      "cs.toggle":"Activer/Désactiver","cs.pause":"Pause/Reprendre",
      "cs.skip":"Passer / Sauter","cs.back":"Retour",
      "cs.suppress":"Annuler le passage","cs.help":"Cette aide",
      "player.intro":"Intro passée dans {sec}s","player.recap":"Récap passé dans {sec}s",
      "player.credits":"Générique passé dans {sec}s","player.next":"Épisode suivant dans {sec}s",
      "player.cancel":"Annuler [{key}]","player.cancel_nokey":"Annuler",
      "player.suppressed":"Passage annulé","player.reenable":"Réactiver",
    },
  };

  // Sprache: Einstellung "auto" folgt dem Browser, sonst feste Auswahl
  function getLang() {
    const pref = S?.lang;
    if (pref && pref !== "auto" && LANG[pref]) return pref;
    const l = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANG[l] ? l : "en";
  }
  function t(key, vars = {}) {
    let s = LANG[getLang()]?.[key] || LANG.en[key] || key;
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    return s;
  }

  /* ─── Settings Schema ──────────────────────────────────── */
  const KNOWN_KEYS = new Set([
    "enabled","delayMs","uiTheme","pauseMinutes","pauseKey",
    "introSkipKey","introBackKey","jumpSeconds","skipCurrentOnceKey",
    "pausedUntilTs","skipIntro","skipRecap","skipCredits",
    "skipNextEpisode","requirePlayerContext","debug","toggleKey",
    "showToasts","cheatsheetKey","autoFullscreen",
    "updateCheckEnabled","updateLastCheckTs","updateAvailable",
    "updateLastRemoteVersion","updateLastResult","updateLastError",
    "updateChangelog","updateReleaseUrl","updateSnoozedUntilTs",
    "updateIgnoredVersion","updateLastSuccessfulUpdate",
    "lang","gearPos","gearAutoHide",
    "_settingsVersion",
  ]);
  const SETTINGS_VERSION = 7;
  const DELAY_MAX_MS = 10000;
  const THEMES = ["auto","dark","light"];
  const LANGS = ["auto","en","de","fr"];
  const GEAR_POS = ["br","bl","tr","tl"];
  const HOTKEYS = [
    ["introSkipKey","keys.skip_intro"], ["introBackKey","keys.jump_back"],
    ["skipCurrentOnceKey","keys.suppress"], ["toggleKey","keys.toggle"],
    ["pauseKey","keys.pause"], ["cheatsheetKey","keys.cheatsheet"],
  ];
  const DEFAULTS = {
    enabled:true, delayMs:3500, uiTheme:"dark", pauseMinutes:5,
    pauseKey:"F9", introSkipKey:"Control+ArrowRight", introBackKey:"Control+ArrowLeft",
    jumpSeconds:85, skipCurrentOnceKey:"ArrowDown", pausedUntilTs:0,
    skipIntro:true, skipRecap:true, skipCredits:true, skipNextEpisode:true,
    requirePlayerContext:false, debug:false, toggleKey:"F8",
    showToasts:true, cheatsheetKey:"Shift+?",  // FIX #3: changed from F1
    autoFullscreen:false,
    updateCheckEnabled:true, updateLastCheckTs:0, updateAvailable:false,
    updateLastRemoteVersion:"", updateLastResult:"idle", updateLastError:"",
    updateChangelog:"", updateReleaseUrl:"", updateSnoozedUntilTs:0,
    updateIgnoredVersion:"", updateLastSuccessfulUpdate:0,
    lang:"auto", gearPos:"br", gearAutoHide:false,
    _settingsVersion:SETTINGS_VERSION,
  };

  const ADN_SEL = {
    skipArea: ".vjs-time-code-skip-buttons",
    skipBtns: [
      'a[data-testid="skip-intro-button"]','a[data-testid="skip-recap-button"]',
      'a[data-testid="skip-ending-button"]','a[data-testid="next-video-button"]',
      'button[data-testid="skip-intro-button"]','button[data-testid="skip-recap-button"]',
      'button[data-testid="skip-ending-button"]','button[data-testid="next-video-button"]',
    ].join(","),
  };

  /* ─── State ────────────────────────────────────────────── */
  let S = loadSettings();
  let skipTimer = null; const clickCD = new WeakMap();
  const pending = new Map(); // Skip-Button → { cat, start, dur, tid }
  let suppressedBtn = null, playerBtn = null, playerBtnRing = null, playerBtnTxt = null, pbRaf = null;
  let pauseToggleBtn = null, hkWarn = null, updInfoSig = "", activeTab = 0, idleTimer = null;
  let pauseLabel = null, lastIntroT = null;
  let updTimer = null, updBanner = null, updInfo = null;
  let isFS = false, toastBox = null, csOverlay = null, csCloseHandler = null; // FIX #2
  let panel = null, gear = null, gearDot = null, gearTxt = null, sysTabBadge = null;
  let refreshTimer = null; // FIX #13
  let panelCloseHandler = null; // FIX: outside-click listener reference

  function log(...a) { if (S.debug) console.log("[ADN‑AS]", ...a); }

  /* ─── createElement ────────────────────────────────────── */
  function el(tag, cls = "", props = {}, children = []) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    for (const [k, v] of Object.entries(props)) {
      if (k === "style" && typeof v === "object") Object.assign(e.style, v);
      else e[k] = v;
    }
    for (const c of children) {
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else if (c instanceof Node) e.appendChild(c);
    }
    return e;
  }

  /* ─── SVG-Icons (per createElementNS, kein innerHTML → CSP-sicher) ─── */
  const ICONS = {
    general: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    skip: "M5 4l10 8-10 8V4zM19 5v14",
    keys: "M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1zM6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10",
    system: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  };
  function icon(name, size = 14) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    for (const [k, v] of Object.entries({ width: size, height: size, viewBox: "0 0 24 24", fill: "none",
      stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" }))
      svg.setAttribute(k, String(v));
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", ICONS[name] || "");
    svg.appendChild(p);
    svg.classList.add("as-ico");
    return svg;
  }

  /* ─── Inline-Bestätigung statt confirm() ───────────────── */
  function armConfirm(btn, action) {
    const orig = btn.textContent; let tmr = null;
    const disarm = () => { clearTimeout(tmr); btn.classList.remove("as-armed"); btn.textContent = orig; };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (btn.classList.contains("as-armed")) { disarm(); action(); return; }
      btn.classList.add("as-armed"); btn.textContent = t("confirm.sure");
      tmr = setTimeout(disarm, 3000);
    });
    return btn;
  }

  /* ─── Container für Overlays (im Vollbild das Vollbild-Element) ─── */
  function uiHost() {
    const f = fsEl();
    return f && !(f instanceof HTMLVideoElement) ? f : document.body;
  }

  /* ─── Settings ─────────────────────────────────────────── */
  function migrate(raw) {
    const c = {};
    for (const k of Object.keys(raw)) if (KNOWN_KEYS.has(k)) c[k] = raw[k];
    const merged = { ...DEFAULTS, ...c, _settingsVersion: SETTINGS_VERSION };
    // FIX #3: migrate old F1 cheatsheet key
    if (c.cheatsheetKey === "F1") merged.cheatsheetKey = DEFAULTS.cheatsheetKey;
    // v7: Verzögerung per Slider (max. 10 s), ungültige Auswahlwerte zurücksetzen
    merged.delayMs = Math.min(DELAY_MAX_MS, Math.max(0, Number(merged.delayMs) || 0));
    if (!THEMES.includes(merged.uiTheme)) merged.uiTheme = DEFAULTS.uiTheme;
    if (!LANGS.includes(merged.lang)) merged.lang = DEFAULTS.lang;
    if (!GEAR_POS.includes(merged.gearPos)) merged.gearPos = DEFAULTS.gearPos;
    return merged;
  }
  function loadSettings() {
    try {
      const r = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const m = migrate(r);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
      return m;
    } catch { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS)); return { ...DEFAULTS }; }
  }
  function save(next) {
    S = { ...S, ...next };
    if (next.updateCheckEnabled === false) { S.updateAvailable = false; S.updateChangelog = ""; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    refreshUI(); refreshBanner();
    log("Saved", S);
  }

  /* ─── Toast ────────────────────────────────────────────── */
  function ensureToastBox() {
    if (!toastBox) {
      toastBox = el("div", "as-toasts"); toastBox.id = "as-toasts";
      toastBox.setAttribute("role", "status"); toastBox.setAttribute("aria-live", "polite");
    }
    const host = uiHost();
    if (toastBox.parentNode !== host) host.appendChild(toastBox);
    toastBox.classList.toggle("as-fs", host !== document.body);
  }
  function toast(key, vars = {}, ms = 2200) {
    if (!S.showToasts) return;
    ensureToastBox();
    const msg = t(key, vars);
    const d = el("div", "as-toast", {}, [msg]);
    toastBox.appendChild(d);
    requestAnimationFrame(() => d.classList.add("as-toast-in"));
    setTimeout(() => {
      d.classList.replace("as-toast-in", "as-toast-out");
      d.addEventListener("transitionend", () => d.remove(), { once: true });
      setTimeout(() => d.remove(), 400); // fallback
    }, ms);
  }

  /* ─── Cheatsheet ───────────────────────────────────────── */
  function showCS() {
    if (csOverlay) { hideCS(); return; }
    const keys = [
      [S.toggleKey, "cs.toggle"], [S.pauseKey, "cs.pause"],
      [S.introSkipKey, "cs.skip"], [S.introBackKey, "cs.back"],
      [S.skipCurrentOnceKey, "cs.suppress"], [S.cheatsheetKey, "cs.help"],
    ];
    csOverlay = el("div", "as-cs-overlay");
    const box = el("div", "as-cs-box");
    box.appendChild(el("div", "as-cs-title", { textContent: t("cs.title") }));
    for (const [k, lbl] of keys) {
      if (!k) continue; // nicht belegte Hotkeys auslassen
      const row = el("div", "as-cs-row");
      row.append(
        el("kbd", "as-cs-key", { textContent: fmtHint(k) }),
                 el("span", "as-cs-lbl", { textContent: t(lbl) })
      );
      box.appendChild(row);
    }
    box.appendChild(el("div", "as-cs-hint", { textContent: t("cs.hint") }));
    csOverlay.appendChild(box);
    uiHost().appendChild(csOverlay);
    requestAnimationFrame(() => csOverlay.classList.add("as-cs-show"));

    // FIX #2: Store handler ref so we can properly remove it
    csCloseHandler = (e) => {
      e.preventDefault(); e.stopPropagation();
      hideCS();
    };
    setTimeout(() => {
      document.addEventListener("keydown", csCloseHandler, true);
      document.addEventListener("click", csCloseHandler, true);
    }, 120);
  }
  function hideCS() {
    // FIX #2: Always remove listeners
    if (csCloseHandler) {
      document.removeEventListener("keydown", csCloseHandler, true);
      document.removeEventListener("click", csCloseHandler, true);
      csCloseHandler = null;
    }
    if (!csOverlay) return;
    csOverlay.classList.remove("as-cs-show");
    const ref = csOverlay;
    csOverlay = null; // clear immediately to prevent double-close
    ref.addEventListener("transitionend", () => ref.remove(), { once: true });
    setTimeout(() => ref.remove(), 400);
  }

  /* ─── Import / Export ──────────────────────────────────── */
  function exportS() {
    // FIX #4: Clone settings, don't modify the live object
    const exported = { ...S };
    const TRANSIENT = [
      "pausedUntilTs","updateLastCheckTs","updateLastResult","updateLastError",
      "updateAvailable","updateChangelog","updateReleaseUrl","updateSnoozedUntilTs",
      "updateLastSuccessfulUpdate",
    ];
    TRANSIENT.forEach(k => delete exported[k]);

    const data = {
      _export: "ADN Auto Skip Settings",
      _version: SCRIPT_VERSION,
      _at: new Date().toISOString(),
 settings: exported,
    };
    const b = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = t("export.filename");
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(a.href);
    toast("sys.export");
  }
  function importS() {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json";
    inp.addEventListener("change", () => {
      const f = inp.files?.[0]; if (!f) return;
      const r = new FileReader();
      r.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          // FIX #15: Validate structure
          if (!data || typeof data !== "object") throw new Error("not an object");
          if (!data.settings || typeof data.settings !== "object") throw new Error("no settings");
          if (data._export !== "ADN Auto Skip Settings") log("Warning: unexpected export format");
          // Validate individual values
          const imported = {};
          for (const [k, v] of Object.entries(data.settings)) {
            if (!KNOWN_KEYS.has(k)) continue;
            const defaultType = typeof DEFAULTS[k];
            if (typeof v === defaultType) imported[k] = v;
            else log("Import: skipped mismatched type for", k);
          }
          applyAll(migrate({ ...DEFAULTS, ...imported }));
          toast("import.success");
        } catch (err) {
          toast("import.error");
          log("Import failed:", err);
        }
      };
      r.readAsText(f);
    });
    inp.click();
  }

  /* ─── Semver / HTTP ────────────────────────────────────── */
  function cmpVer(a, b) {
    const toNums = (s) => String(s).split(".").map(p => parseInt(p, 10) || 0);
    const A = toNums(a), B = toNums(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      if ((A[i]||0) > (B[i]||0)) return 1;
      if ((A[i]||0) < (B[i]||0)) return -1;
    }
    return 0;
  }
  function tagVer(s) { const m = String(s||"").match(/v?(\d+\.\d+\.\d+)/i); return m?m[1]:null; }
  function scriptVer(s) { const m = String(s||"").match(/@version\s+([0-9.]+)/); return m?m[1]:null; }
  function http(url) {
    if (typeof GM_xmlhttpRequest === "function")
      return new Promise((ok, no) => GM_xmlhttpRequest({ method:"GET", url, nocache:true, timeout:15000,
        onload: r => r.status>=200&&r.status<300 ? ok(r.responseText) : no(new Error(`HTTP ${r.status}`)),
                                                       onerror: ()=>no(new Error("Network")), ontimeout: ()=>no(new Error("Timeout")) }));
      return fetch(url, {cache:"no-store"}).then(r=>{if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.text();});
  }

  /* ─── Update ───────────────────────────────────────────── */
  function lockUpd() {
    const now = Date.now();
    try {
      const l = JSON.parse(localStorage.getItem(UPDATE_LOCK_KEY)||"{}");
      if (l.ts && now - l.ts < UPDATE_LOCK_TTL_MS) return false;
    } catch{/* localStorage nicht verfügbar */}
    localStorage.setItem(UPDATE_LOCK_KEY, JSON.stringify({ts:now}));
    return true;
  }
  function unlockUpd() { try{localStorage.removeItem(UPDATE_LOCK_KEY);}catch{/* ignore */} }

  async function getRemote() {
    let ver=null, log_="", url_="";
    try {
      const rels = JSON.parse(await http(UPDATE_RELEASES_URL));
      if (Array.isArray(rels)) {
        const newer = rels.filter(r=>{const v=tagVer(r?.tag_name);return v&&cmpVer(v,SCRIPT_VERSION)>0;})
        .sort((a,b)=>cmpVer(tagVer(b?.tag_name)||"0",tagVer(a?.tag_name)||"0"));
        if (newer.length) {
          ver = tagVer(newer[0].tag_name); url_ = newer[0].html_url||"";
          log_ = newer.map(r=>{
            const v=tagVer(r.tag_name)||r.tag_name, b=(r.body||"").trim(), n=(r.name||"").trim();
            let h=`v${v}`;if(n&&n!==r.tag_name&&n!==`v${v}`)h+=` — ${n}`;
            return b?`**${h}**\n${b}`:`**${h}**`;
          }).join("\n\n");
        }
      }
    } catch(e){log("Releases fail",e);}
    if (!ver) try{const tags=JSON.parse(await http(UPDATE_TAGS_URL));if(Array.isArray(tags)){const vs=tags.map(t=>tagVer(t?.name)).filter(Boolean).sort((a,b)=>cmpVer(b,a));if(vs.length)ver=vs[0];}}catch(e){log("Tags fail",e);}
    if (!ver){const raw=await http(UPDATE_SOURCE_URL);ver=scriptVer(raw);if(!ver)throw new Error("No version");}
    return {remoteVersion:ver,changelog:log_,releaseUrl:url_};
  }

  async function checkUpd(force=false) {
    if (!S.updateCheckEnabled) {
      if (S.updateAvailable||S.updateLastResult!=="disabled")
        save({updateAvailable:false,updateLastResult:"disabled",updateLastError:"",updateChangelog:"",updateReleaseUrl:""});
      return;
    }
    const now=Date.now();
    if (!force&&now-Number(S.updateLastCheckTs||0)<UPDATE_CHECK_INTERVAL_MS) return;
    if (!force&&!lockUpd()){save({updateLastResult:"skipped_lock"});return;}
    save({updateLastResult:"checking",updateLastError:""});
    try {
      const{remoteVersion,changelog,releaseUrl}=await getRemote();
      const has=cmpVer(remoteVersion,SCRIPT_VERSION)>0, ign=S.updateIgnoredVersion===remoteVersion;
      save({updateLastCheckTs:now,updateAvailable:has&&!ign,updateLastRemoteVersion:remoteVersion,
        updateLastResult:has?"update":"up_to_date",updateLastError:"",
        updateChangelog:has?changelog:"",updateReleaseUrl:has?releaseUrl:""});
    } catch(e) {
      save({updateLastCheckTs:now,updateLastResult:"error",updateLastError:String(e?.message||"").slice(0,200)});
    } finally { unlockUpd(); }
  }

  function isSnoozed(){return Number(S.updateSnoozedUntilTs||0)>Date.now();}
  function snooze(){save({updateSnoozedUntilTs:Date.now()+UPDATE_SNOOZE_MS});}
  // Komplette Einstellungen setzen (Import/Reset); bei Sprachwechsel Panel neu aufbauen
  function applyAll(next) {
    const before = getLang();
    save(next);
    if (getLang() !== before) rebuildPanel();
  }
  function ignoreVer(){const v=S.updateLastRemoteVersion;if(v)save({updateIgnoredVersion:v,updateAvailable:false,updateChangelog:""});}
  function installUpd(){window.open(UPDATE_INSTALL_URL,"_blank");save({updateLastSuccessfulUpdate:Date.now()});}

  function startUpdChecker() {
    checkUpd(!!S.updateAvailable);
    if (updTimer) clearInterval(updTimer);
    updTimer = setInterval(()=>checkUpd(false), 3600000);
    window.addEventListener("beforeunload", ()=>{
      if(updTimer)clearInterval(updTimer);
      // FIX #10: Release lock on unload
      unlockUpd();
    }, {once:true});
  }

  /* ─── Fullscreen ───────────────────────────────────────── */
  const autoFSState = new WeakMap();
  let autoFSRetry = null;

  function fsEl() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
  function playerRoot(v) {
    return v.closest(".video-js,.vjs-player,[class*='player'],[id*='player']") || v.parentElement || v;
  }
  function clearFSRetry() {
    if (!autoFSRetry) return;
    for (const type of ["pointerdown", "click", "touchend"]) {
      autoFSRetry.root.removeEventListener(type, autoFSRetry.handler, true);
    }
    autoFSRetry = null;
  }
  function armFSRetry(v) {
    if (autoFSRetry?.video === v) return;
    clearFSRetry();
    const root = playerRoot(v);
    const handler = () => {
      clearFSRetry();
      if (S.autoFullscreen && !fsEl()) requestFS(v, true);
    };
    autoFSRetry = { video: v, root, handler };
    for (const type of ["pointerdown", "click", "touchend"]) {
      root.addEventListener(type, handler, true);
    }
  }
  function requestFS(v, isRetry) {
    const root = playerRoot(v);
    const target = (root.requestFullscreen || root.webkitRequestFullscreen) ? root : v;
    const fn = target.requestFullscreen || target.webkitRequestFullscreen;
    if (fn) {
      try {
        const p = fn.call(target);
        if (p?.catch) p.catch(() => { if (!isRetry) armFSRetry(v); log("Fullscreen blocked"); });
        return true;
      } catch {
        if (!isRetry) armFSRetry(v);
        log("Fullscreen blocked");
        return false;
      }
    }
    if (typeof v.webkitEnterFullscreen === "function") {
      try { v.webkitEnterFullscreen(); return true; }
      catch { if (!isRetry) armFSRetry(v); log("Fullscreen blocked"); return false; }
    }
    return false;
  }
  function maybeAutoFS(v) {
    if (!S.autoFullscreen || fsEl()) return;
    const src = v.currentSrc || v.src || "";
    const st = autoFSState.get(v) || { src, attempted: false };
    if (st.src !== src) { st.src = src; st.attempted = false; }
    if (st.attempted) return;
    st.attempted = true;
    autoFSState.set(v, st);
    requestFS(v, false);
  }
  function resetAutoFS(v) {
    autoFSState.set(v, { src: v.currentSrc || v.src || "", attempted: false });
    if (autoFSRetry?.video === v) clearFSRetry();
  }
  function setupAutoFS() {
    document.addEventListener("playing", e => {
      if (e.target instanceof HTMLVideoElement) maybeAutoFS(e.target);
    }, true);
    for (const type of ["loadstart", "emptied"]) {
      document.addEventListener(type, e => {
        if (e.target instanceof HTMLVideoElement) resetAutoFS(e.target);
      }, true);
    }
    for (const v of document.querySelectorAll("video")) {
      if (!v.paused) maybeAutoFS(v);
    }
    window.addEventListener("beforeunload", clearFSRetry, { once: true });
  }
  function setupFS() {
    const u=()=>{isFS=!!fsEl();updateVis();};
    document.addEventListener("fullscreenchange",u);
    document.addEventListener("webkitfullscreenchange",u);
    document.addEventListener("webkitbeginfullscreen",u);
    document.addEventListener("webkitendfullscreen",u);
    u();
  }
  function updateVis() {
    // Toasts und Cheatsheet ins Vollbild-Element umhängen statt ausblenden
    if (toastBox) ensureToastBox();
    if (csOverlay && csOverlay.parentNode !== uiHost()) uiHost().appendChild(csOverlay);
    if (!gear) return;
    if (isFS) {
      gear.style.opacity="0"; gear.style.pointerEvents="none";
      closePanel(false);
      if(updBanner)updBanner.style.display="none";
    } else {
      gear.style.opacity=""; gear.style.pointerEvents="";
      if(updBanner)updBanner.style.display="";
    }
  }

  /* ─── Pause ────────────────────────────────────────────── */
  function isPaused(){return Number(S.pausedUntilTs||0)>Date.now();}
  function pauseMs(){return Math.max(0,Number(S.pausedUntilTs||0)-Date.now());}
  function doPause(m){const mins=Math.max(1,Math.min(180,Number(m)||S.pauseMinutes));save({pausedUntilTs:Date.now()+mins*60000});toast("toast.paused",{min:mins});}
  // Restzeit als m:ss bzw. h:mm:ss (Pause bis 180 Min)
  function fmtDur(ms){
    const total=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),sec=total%60;
    const pad=n=>String(n).padStart(2,"0");
    return h?`${h}:${pad(m)}:${pad(sec)}`:`${m}:${pad(sec)}`;
  }
  function doResume(){save({pausedUntilTs:0});toast("toast.resumed");}

  /* ─── Key Util ─────────────────────────────────────────── */
  function norm(s){return(s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();}
  // FIX: gespeicherte Werte wie "Control+→" auf Event-Namen ("arrowright") zurückführen
  function normCombo(c){
    return(c||"").toLowerCase().replace(/\s+/g,"").replace(/\bctrl\b/g,"control")
      .replace(/←/g,"arrowleft").replace(/→/g,"arrowright").replace(/↑/g,"arrowup").replace(/↓/g,"arrowdown");
  }
  function normKey(k){return k===" "?"space":(k||"").toLowerCase();}
  function evCombo(e){
    const k=normKey(e.key);if(!k||["control","shift","alt","meta"].includes(k))return null;
    const p=[];if(e.ctrlKey)p.push("control");if(e.shiftKey)p.push("shift");if(e.altKey)p.push("alt");if(e.metaKey)p.push("meta");
    p.push(k);return p.join("+");
  }
  // FIX #5: Unified format functions
  function fmtCombo(c) {
    return normCombo(c).split("+").filter(Boolean).map(p => {
      const l = p.toLowerCase();
      const map = {control:"Control",shift:"Shift",alt:"Alt",meta:"Meta",space:"Space",
        arrowup:"↑",arrowdown:"↓",arrowleft:"←",arrowright:"→"};
        if (map[l]) return map[l];
        if (/^f\d{1,2}$/.test(l)) return l.toUpperCase();
        if (l === "?") return "?";
        if (l.length === 1) return l.toUpperCase();
        return l.slice(0,1).toUpperCase() + l.slice(1);
    }).join("+");
  }
  function fmtHint(c) {
    return fmtCombo(c).replace(/Control/g,"Ctrl");
  }
  function matchCombo(e, c) {
    const ec = evCombo(e);
    return ec ? normCombo(ec) === normCombo(c) : false;
  }

  /* ─── DOM Util ─────────────────────────────────────────── */
  function elText(e){return norm([e.textContent||"",e.getAttribute("aria-label")||"",e.getAttribute("title")||""].join(" "));}
  function isVis(e){const s=getComputedStyle(e);if(s.visibility==="hidden"||s.display==="none"||Number(s.opacity)<.05)return false;const r=e.getBoundingClientRect();return r.width>8&&r.height>8&&r.bottom>0&&r.right>0;}
  function inPlayer(e){if(!S.requirePlayerContext)return true;return!!e.closest('[class*="player"],[class*="video"],[id*="player"],[id*="video"],video');}
  function classify(e){const tid=norm(e.getAttribute("data-testid")||"");if(tid.includes("skip-intro"))return"intro";if(tid.includes("skip-recap"))return"recap";if(tid.includes("skip-ending"))return"credits";if(tid.includes("next-video"))return"next";return null;}
  function findVid(){const v=[...document.querySelectorAll("video")];return v.find(x=>!x.paused&&x.readyState>=2)||v[0]||null;}
  function catOn(c){return{intro:S.skipIntro,recap:S.skipRecap,credits:S.skipCredits,next:S.skipNextEpisode}[c]||false;}
  function canClick(e){return Date.now()-(clickCD.get(e)||0)>3000;}
  function markClick(e){clickCD.set(e,Date.now());}

  /* ─── Skip Logic ───────────────────────────────────────── */
  const TOAST_CAT={intro:"toast.intro",recap:"toast.recap",credits:"toast.credits",next:"toast.next"};
  function cancelPending(e){const p=pending.get(e);if(!p)return;clearTimeout(p.tid);pending.delete(e);}
  function cancelAllPending(){for(const e of [...pending.keys()])cancelPending(e);}
  function clickDelay(e,cat){
    if(pending.has(e))return;
    const d=Math.max(0,Number(S.delayMs)||0);
    const tid=setTimeout(()=>{
      pending.delete(e);
      if(!S.enabled||isPaused()||!isVis(e)||suppressedBtn===e||!canClick(e)){updPlayerBtn();return;}
      markClick(e);
      if(cat==="intro"){const v=findVid();if(v)lastIntroT=Math.max(0,v.currentTime||0);}
      e.click();toast(TOAST_CAT[cat]||"toast.intro");log("Click",cat);
      updPlayerBtn();
    },d);
    pending.set(e,{cat,start:Date.now(),dur:d,tid});
    startPBLoop();
  }
  function getCandidates(){
    const out=[];
    for(const e of document.querySelectorAll(ADN_SEL.skipBtns)){
      if(!isVis(e)||!inPlayer(e)||!e.closest(ADN_SEL.skipArea))continue;
      if(elText(e).length>100)continue;
      const c=classify(e);if(c&&catOn(c))out.push({el:e,cat:c});
    }
    return out;
  }

  /* Player-Button: Countdown mit Fortschrittsring + Abbrechen / Wieder aktivieren */
  let pbAnchor=null;
  function rmPlayerBtn(){if(playerBtn?.parentNode)playerBtn.remove();pbAnchor=null;}
  function startPBLoop(){
    if(pbRaf)return;
    const loop=()=>{updPlayerBtn();pbRaf=pending.size?requestAnimationFrame(loop):null;};
    pbRaf=requestAnimationFrame(loop);
  }
  function updPlayerBtn(){
    if(!playerBtn||!pbAnchor)return;
    const p=pending.get(pbAnchor);
    let txt="",state="";
    if(suppressedBtn===pbAnchor){
      state="suppressed";txt=`${t("player.suppressed")} · ${t("player.reenable")}`;
    } else if(p){
      state="countdown";
      const remain=Math.max(0,p.dur-(Date.now()-p.start));
      const prog=p.dur>0?Math.min(1,1-remain/p.dur):1;
      playerBtn.style.setProperty("--p",prog.toFixed(3));
      const k=S.skipCurrentOnceKey?fmtHint(S.skipCurrentOnceKey):"";
      txt=`${t("player."+p.cat,{sec:Math.ceil(remain/1000)})} · ${k?t("player.cancel",{key:k}):t("player.cancel_nokey")}`;
    }
    playerBtn.hidden=!state;
    playerBtn.dataset.state=state;
    if(playerBtnTxt.textContent!==txt)playerBtnTxt.textContent=txt;
  }
  function ensurePlayerBtn(cands){
    if(!S.enabled||!cands.length){rmPlayerBtn();return;}
    const anchor=(cands.find(c=>c.el===suppressedBtn)||cands[0]).el;
    const container=anchor?.parentElement||anchor?.closest(ADN_SEL.skipArea);
    if(!container)return;
    if(!playerBtn){
      playerBtn=el("button","as-player-btn",{type:"button"});
      playerBtnRing=el("span","as-pb-ring");playerBtnTxt=el("span","as-pb-txt");
      playerBtn.append(playerBtnRing,playerBtnTxt);
      playerBtn.addEventListener("click",(e)=>{
        e.preventDefault();e.stopPropagation();
        if(!pbAnchor)return;
        if(suppressedBtn===pbAnchor){suppressedBtn=null;updPlayerBtn();scan();}
        else{suppressedBtn=pbAnchor;cancelPending(pbAnchor);toast("toast.suppressed");updPlayerBtn();}
      });
    }
    pbAnchor=anchor;
    if(playerBtn.parentElement!==container||playerBtn.nextSibling!==anchor)container.insertBefore(playerBtn,anchor);
    updPlayerBtn();
  }
  function scan(){
    if(!S.enabled||isPaused()){cancelAllPending();rmPlayerBtn();return;}
    for(const e of [...pending.keys()])if(!document.contains(e))cancelPending(e);
    if(suppressedBtn&&(!document.contains(suppressedBtn)||!isVis(suppressedBtn)))suppressedBtn=null;
    const c=getCandidates();
    for(const{el:e,cat}of c){if(suppressedBtn===e||!canClick(e))continue;clickDelay(e,cat);}
    ensurePlayerBtn(c);
  }
  function startObs(){
    const obs=new MutationObserver(()=>scan());
    obs.observe(document.documentElement,{childList:true,subtree:true});
    skipTimer=setInterval(scan,900);
    window.addEventListener("beforeunload",()=>{
      obs.disconnect();
      if(skipTimer)clearInterval(skipTimer);
      cancelAllPending();
    },{once:true});
  }

  /* ─── Changelog Renderer ───────────────────────────────── */
  function renderCL(text){
    if(!text)return null;
    const c=el("div","as-cl");
    for(const line of text.split("\n")){
      const tr=line.trim();if(!tr){c.appendChild(el("br"));continue;}
      const d=el("div","as-cl-line");
      if(tr.startsWith("**")&&tr.endsWith("**")){d.style.fontWeight="700";d.style.marginTop="8px";d.textContent=tr.replace(/\*\*/g,"");}
      else if(tr.startsWith("- ")||tr.startsWith("* ")){d.textContent=`  •  ${tr.slice(2)}`;d.style.paddingLeft="8px";}
      else d.textContent=tr;
      c.appendChild(d);
    }
    return c;
  }

  /* ─── Update Banner ────────────────────────────────────── */
  function createBanner(){
    if(updBanner)return;
    updBanner=el("div","as-banner");updBanner.id="as-banner";
    document.body.appendChild(updBanner);
  }
  function refreshBanner(){
    if(!updBanner)return;
    const show=S.updateCheckEnabled&&S.updateAvailable&&!isSnoozed()&&!isFS&&S.updateIgnoredVersion!==S.updateLastRemoteVersion;
    if(!show){updBanner.classList.remove("as-banner-show");return;}
    const rem=S.updateLastRemoteVersion;
    const justInst=Date.now()-Number(S.updateLastSuccessfulUpdate||0)<120000;

    // FIX #7: Clear children properly instead of innerHTML
    while(updBanner.firstChild) updBanner.removeChild(updBanner.firstChild);

    // Header
    const hdr=el("div","as-banner-hdr");
    const titleArea=el("div","as-banner-title-area");
    titleArea.append(
      el("span","as-banner-icon",{textContent:justInst?"✅":"🔄"}),
                     el("div","",[
                       el("div","as-banner-t",{textContent:justInst?t("update.installed_q"):t("update.title")}),
                        el("div","as-banner-sub",{textContent:justInst?t("update.reload_hint"):t("update.subtitle",{old:SCRIPT_VERSION,new:rem})}),
                     ])
    );
    const closeB=el("button","as-banner-x",{textContent:"×"});
    closeB.setAttribute("aria-label","Close");
    closeB.addEventListener("click",snooze);
    hdr.append(titleArea,closeB);updBanner.appendChild(hdr);

    // Changelog
    if(!justInst&&S.updateChangelog){
      const sec=el("div","as-banner-cl");
      sec.appendChild(el("div","as-banner-cl-t",{textContent:t("update.whats_new")}));
      const r=renderCL(S.updateChangelog);
      if(r){const sc=el("div","as-banner-cl-scroll");sc.appendChild(r);sec.appendChild(sc);}
      updBanner.appendChild(sec);
    }

    // Actions
    const acts=el("div","as-banner-acts");
    if(justInst){
      const relB=el("button","as-btn as-btn-accent",{textContent:t("sys.reload")});
      relB.addEventListener("click",()=>location.reload());
      const snzB=el("button","as-btn as-btn-ghost",{textContent:t("update.remind_later")});
      snzB.addEventListener("click",snooze);
      acts.append(relB,snzB);
    } else {
      const instB=el("button","as-btn as-btn-accent",{textContent:t("update.install_now")});
      instB.addEventListener("click",installUpd);
      const snzB=el("button","as-btn",{textContent:t("update.remind_later")});
      snzB.addEventListener("click",snooze);
      const ignB=el("button","as-btn as-btn-ghost",{textContent:t("update.ignore_version")});
      armConfirm(ignB,ignoreVer);
      acts.append(instB,snzB,ignB);
      if(S.updateReleaseUrl)acts.appendChild(el("a","as-btn as-btn-link",{textContent:t("update.view_release"),href:S.updateReleaseUrl,target:"_blank"}));
    }
    updBanner.appendChild(acts);
    updBanner.classList.add("as-banner-show");
  }

  /* ─── Styles ───────────────────────────────────────────── */
  function injectCSS() {
    if (document.getElementById("as-css")) return;
    const s = document.createElement("style"); s.id = "as-css";
    s.textContent = `
    :root {
      --as-bg: rgba(16,20,32,.92);
      --as-bg-solid: #101420;
      --as-text: #e8edf8;
      --as-text2: #8a9cc0;
      --as-border: rgba(60,80,120,.45);
      --as-input: rgba(8,12,24,.7);
      --as-input-border: rgba(70,90,130,.5);
      --as-btn: rgba(30,42,68,.8);
      --as-btn-h: rgba(40,56,90,.9);
      --as-accent: #5b8cff;
      --as-accent2: #3d6ee0;
      --as-green: #3ddc84;
      --as-red: #ff5a6e;
      --as-yellow: #ffb74d;
      --as-shadow: 0 12px 40px rgba(0,0,0,.55);
      --as-glass: blur(16px) saturate(1.4);
      --as-r: 14px;
      --as-rs: 8px;
      --as-font: 'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
      --as-t: .25s cubic-bezier(.4,0,.2,1);
    }
    [data-as-theme="light"] {
      --as-bg: rgba(250,250,255,.94);
      --as-bg-solid: #fafaff;
      --as-text: #111827;
      --as-text2: #6b7280;
      --as-border: rgba(0,0,0,.1);
      --as-input: rgba(0,0,0,.04);
      --as-input-border: rgba(0,0,0,.12);
      --as-btn: rgba(0,0,0,.06);
      --as-btn-h: rgba(0,0,0,.1);
      --as-accent: #3b6cf5;
      --as-accent2: #2850c8;
      --as-red: #e0364d;
      --as-shadow: 0 8px 32px rgba(0,0,0,.12);
    }

    @supports not (backdrop-filter: blur(1px)) {
      :root { --as-bg: rgba(16,20,32,.98); --as-glass: none; }
      [data-as-theme="light"] { --as-bg: rgba(250,250,255,.98); }
    }

    .as-ico{flex-shrink:0;display:block;}

    /* ── Gear: kompakt, Text nur bei Hover/Fokus/abweichendem Status ── */
    #as-gear {
    position:fixed;z-index:2147483646;
    background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);
    border:1px solid var(--as-border);border-radius:50px;
    padding:9px 12px;
    font:600 12px/1 var(--as-font);color:var(--as-text);letter-spacing:.3px;
    cursor:pointer;box-shadow:var(--as-shadow);
    display:flex;align-items:center;
    transition:transform var(--as-t),box-shadow var(--as-t),opacity .4s;user-select:none;
    }
    [data-as-pos="br"] #as-gear{right:16px;bottom:16px;}
    [data-as-pos="bl"] #as-gear{left:16px;bottom:16px;}
    [data-as-pos="tr"] #as-gear{right:16px;top:16px;}
    [data-as-pos="tl"] #as-gear{left:16px;top:16px;}
    #as-gear:hover{transform:translateY(-2px);box-shadow:0 16px 48px rgba(0,0,0,.6);opacity:1 !important;}
    #as-gear:active{transform:translateY(0);transition-duration:.1s;}
    #as-gear:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent),var(--as-shadow);}
    #as-gear.as-idle{opacity:.15;}
    .as-gear-txt{max-width:0;opacity:0;overflow:hidden;white-space:nowrap;margin-left:0;transition:max-width .3s ease,opacity .2s,margin .3s;}
    #as-gear:hover .as-gear-txt,#as-gear:focus-visible .as-gear-txt,#as-gear.as-expanded .as-gear-txt{max-width:240px;opacity:1;margin-left:8px;}
    .as-dot{width:9px;height:9px;border-radius:50%;background:var(--as-green);flex-shrink:0;margin-right:8px;transition:background .3s;}
    .as-dot.off{background:var(--as-red);}
    .as-dot.paused{background:var(--as-yellow);}
    /* Update: Akzentfarbe mit Puls-Ring statt Rot, damit es nicht wie "Aus" aussieht */
    .as-dot.update{background:var(--as-accent);animation:as-ring 1.8s ease-out infinite;}
    #as-gear.as-update{border-color:var(--as-accent);}
    @keyframes as-ring{0%{box-shadow:0 0 0 0 rgba(91,140,255,.6)}100%{box-shadow:0 0 0 7px rgba(91,140,255,0)}}

    /* ── Panel ── */
    #as-panel {
    position:fixed;width:400px;max-width:92vw;
    max-height:calc(100vh - 90px);
    overflow:hidden;z-index:2147483647;
    background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);
    border:1px solid var(--as-border);border-radius:var(--as-r);
    padding:0;font:13px/1.5 var(--as-font);color:var(--as-text);
    box-shadow:var(--as-shadow);
    opacity:0;visibility:hidden;transform:translateY(12px) scale(.97);
    transition:all .35s cubic-bezier(.2,.8,.2,1);
    display:flex;flex-direction:column;
    }
    [data-as-pos="br"] #as-panel{right:16px;bottom:64px;transform-origin:bottom right;}
    [data-as-pos="bl"] #as-panel{left:16px;bottom:64px;transform-origin:bottom left;}
    [data-as-pos="tr"] #as-panel{right:16px;top:64px;transform-origin:top right;transform:translateY(-12px) scale(.97);}
    [data-as-pos="tl"] #as-panel{left:16px;top:64px;transform-origin:top left;transform:translateY(-12px) scale(.97);}
    #as-panel.as-open{opacity:1;visibility:visible;transform:translateY(0) scale(1);}

    .as-panel-hdr{display:flex;justify-content:space-between;align-items:center;padding:16px 20px 12px;flex-shrink:0;}
    .as-panel-title{font:700 17px/1.2 var(--as-font);margin:0;display:flex;align-items:center;gap:8px;}
    .as-ver{font:400 11px var(--as-font);color:var(--as-text2);background:var(--as-btn);padding:2px 8px;border-radius:20px;}
    .as-x{background:var(--as-btn);border:none;color:var(--as-text2);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;}
    .as-x:hover{background:var(--as-btn-h);color:var(--as-text);}
    .as-x:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent);}

    /* ── Tabs auf der Seite des Gear-Buttons: Panel wächst von dort weg,
          die Tabs bleiben beim Durchklicken an derselben Stelle ── */
    .as-panel-hdr{order:0;}
    .as-tabs-body{order:1;}
    .as-tabs{order:2;}
    .as-footer{order:3;}
    [data-as-pos="tr"] .as-tabs,[data-as-pos="tl"] .as-tabs{order:0;}
    [data-as-pos="tr"] .as-panel-hdr,[data-as-pos="tl"] .as-panel-hdr{order:-1;}
    .as-tabs{display:flex;gap:4px;padding:10px 16px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;border-top:1px solid var(--as-border);}
    [data-as-pos="tr"] .as-tabs,[data-as-pos="tl"] .as-tabs{border-top:none;border-bottom:1px solid var(--as-border);}
    .as-tabs::-webkit-scrollbar{display:none;}
    .as-tab{background:transparent;border:none;color:var(--as-text2);padding:7px 12px;font:600 12px var(--as-font);cursor:pointer;border-radius:20px;transition:all .2s;white-space:nowrap;position:relative;display:inline-flex;align-items:center;gap:6px;}
    .as-tab:hover{color:var(--as-text);background:var(--as-btn);}
    .as-tab.active{background:var(--as-accent);color:#fff;}
    .as-tab:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent);}
    .as-tab-dot{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--as-red);}

    .as-tabs-body{flex:1 1 auto;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--as-border) transparent;padding:4px 20px 0;}
    [data-as-pos="tr"] .as-tabs-body,[data-as-pos="tl"] .as-tabs-body{padding-top:14px;}
    .as-pane{display:none;animation:as-fi .25s ease;}
    .as-pane.active{display:block;}
    @keyframes as-fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

    .as-card{background:var(--as-input);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:14px;margin-bottom:12px;}
    .as-card-title{font:600 11px/1 var(--as-font);color:var(--as-text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;}
    .as-row{display:flex;justify-content:space-between;align-items:center;min-height:32px;margin-bottom:6px;gap:8px;}
    .as-row:last-child{margin-bottom:0;}
    .as-row-lbl{flex:1;padding-right:4px;font:500 13px var(--as-font);}
    .as-card-acts{display:flex;gap:6px;flex-wrap:wrap;}

    .as-toggle{appearance:none;-webkit-appearance:none;width:40px;height:22px;background:var(--as-input-border);border:none;border-radius:20px;position:relative;cursor:pointer;outline:none;transition:background .3s;flex-shrink:0;margin:0;}
    .as-toggle::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .3s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 4px rgba(0,0,0,.25);}
    .as-toggle:checked{background:var(--as-accent);}
    .as-toggle:checked::after{transform:translateX(18px);}
    .as-toggle:focus-visible{box-shadow:0 0 0 2px var(--as-accent);}

    .as-input{background:var(--as-input);color:var(--as-text);border:1px solid var(--as-input-border);border-radius:var(--as-rs);padding:7px 10px;font:13px var(--as-font);outline:none;transition:border .2s;min-width:0;}
    .as-input:focus{border-color:var(--as-accent);}
    .as-input:focus-visible{box-shadow:0 0 0 2px rgba(91,140,255,.3);}
    .as-input[type="number"]{width:72px;}
    .as-input.as-sm{width:56px;padding:6px 8px;}
    select.as-input{max-width:150px;}
    .as-unit{font:500 12px var(--as-font);color:var(--as-text2);}

    /* ── Slider ── */
    .as-range-wrap{display:flex;align-items:center;gap:10px;}
    .as-range{-webkit-appearance:none;appearance:none;width:130px;height:4px;border-radius:4px;background:var(--as-input-border);outline:none;margin:0;cursor:pointer;}
    .as-range::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--as-accent);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);}
    .as-range::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--as-accent);border:2px solid #fff;}
    .as-range:focus-visible{box-shadow:0 0 0 3px rgba(91,140,255,.35);}
    .as-range-out{font:600 12px var(--as-font);min-width:40px;text-align:right;font-variant-numeric:tabular-nums;}

    /* ── Hotkey-Felder ── */
    .as-hk{display:flex;align-items:center;gap:4px;}
    .as-hk .as-input{width:120px;cursor:pointer;text-align:center;}
    .as-hk .as-input.as-capturing{border-color:var(--as-accent);color:var(--as-accent);}
    .as-hk .as-input.as-conflict{border-color:var(--as-red);color:var(--as-red);}
    .as-hk-x{background:transparent;border:none;color:var(--as-text2);width:22px;height:22px;border-radius:50%;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;}
    .as-hk-x:hover{background:var(--as-btn);color:var(--as-text);}
    .as-hk-x:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent);}
    .as-warn{font:500 12px var(--as-font);color:var(--as-red);margin-top:10px;}

    .as-btn{background:var(--as-btn);color:var(--as-text);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:7px 14px;font:500 12px var(--as-font);cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;gap:4px;}
    .as-btn:hover{background:var(--as-btn-h);}
    .as-btn:disabled{opacity:.45;cursor:not-allowed;}
    .as-btn:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent);}
    .as-btn-accent{background:var(--as-accent);color:#fff;border-color:var(--as-accent);font-weight:600;}
    .as-btn-accent:hover{background:var(--as-accent2);}
    .as-btn-ghost{background:transparent;border-color:transparent;color:var(--as-text2);font-size:11px;}
    .as-btn-ghost:hover{color:var(--as-text);background:var(--as-btn);}
    .as-btn-link{border:none;background:transparent;color:var(--as-accent);text-decoration:underline;padding:4px 8px;font-size:11px;}
    .as-btn-danger{background:transparent;color:var(--as-red);border-color:var(--as-red);}
    .as-btn-danger:hover{background:rgba(255,90,110,.12);}
    .as-btn.as-armed{background:var(--as-red);border-color:var(--as-red);color:#fff;}

    .as-footer{padding:12px 20px 14px;border-top:1px solid var(--as-border);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0;}
    .as-footer-status{font:500 12px var(--as-font);color:var(--as-text2);display:flex;align-items:center;gap:6px;min-width:0;}
    .as-footer-acts{display:flex;gap:6px;align-items:center;flex-shrink:0;}
    .as-btn.as-paused{border-color:var(--as-yellow);color:var(--as-yellow);}

    .as-upd-info{background:var(--as-input);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:12px;margin-bottom:12px;font-size:12px;}
    .as-upd-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;gap:12px;}
    .as-upd-lbl{color:var(--as-text2);}
    .as-upd-val{font-weight:600;color:var(--as-text);text-align:right;}
    .as-upd-val.new{color:var(--as-red);}
    .as-upd-val.ok{color:var(--as-green);}
    .as-upd-bar{height:3px;background:var(--as-border);border-radius:2px;margin-bottom:8px;overflow:hidden;}
    .as-upd-bar-fill{height:100%;background:var(--as-accent);border-radius:2px;width:0%;transition:width .5s;}
    .as-upd-bar.ck .as-upd-bar-fill{width:100%;animation:as-ind 1.5s infinite;}
    @keyframes as-ind{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}

    /* ── Update-Banner (weicht dem Gear aus, wenn dieser oben rechts sitzt) ── */
    .as-banner{position:fixed;top:20px;right:20px;width:380px;max-width:calc(100vw - 40px);z-index:2147483645;background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);border:1px solid var(--as-accent);border-radius:var(--as-r);box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 0 1px rgba(91,140,255,.15);font:13px var(--as-font);color:var(--as-text);opacity:0;visibility:hidden;transform:translateY(-20px) scale(.95);transition:all .4s cubic-bezier(.2,.8,.2,1);overflow:hidden;}
    [data-as-pos="tr"] .as-banner{top:auto;bottom:20px;transform:translateY(20px) scale(.95);}
    .as-banner.as-banner-show{opacity:1;visibility:visible;transform:translateY(0) scale(1);}
    .as-banner-hdr{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 16px 12px;border-bottom:1px solid var(--as-border);}
    .as-banner-title-area{display:flex;gap:10px;align-items:flex-start;}
    .as-banner-icon{font-size:24px;}
    .as-banner-t{font:700 15px var(--as-font);}
    .as-banner-sub{font:400 12px var(--as-font);color:var(--as-text2);margin-top:2px;}
    .as-banner-x{background:none;border:none;color:var(--as-text2);cursor:pointer;font-size:20px;padding:0;line-height:1;}
    .as-banner-x:hover{color:var(--as-text);}
    .as-banner-cl{padding:12px 16px;}
    .as-banner-cl-t{font:600 11px var(--as-font);color:var(--as-text2);text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;}
    .as-banner-cl-scroll{max-height:140px;overflow-y:auto;scrollbar-width:thin;font-size:12px;line-height:1.6;opacity:.9;}
    .as-banner-acts{display:flex;gap:8px;padding:12px 16px 14px;flex-wrap:wrap;border-top:1px solid var(--as-border);}

    /* ── Toasts (im Vollbild oben, damit sie nicht über den Player-Controls liegen) ── */
    .as-toasts{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column-reverse;align-items:center;gap:8px;pointer-events:none;}
    .as-toasts.as-fs{bottom:auto;top:40px;flex-direction:column;}
    .as-toast{background:var(--as-bg-solid);color:var(--as-text);border:1px solid var(--as-border);border-radius:12px;padding:10px 22px;font:600 13px var(--as-font);box-shadow:0 8px 28px rgba(0,0,0,.45);opacity:0;transform:translateY(16px) scale(.92);transition:all .3s cubic-bezier(.2,.8,.2,1);pointer-events:none;white-space:nowrap;}
    .as-toast-in{opacity:1;transform:translateY(0) scale(1);}
    .as-toast-out{opacity:0;transform:translateY(-8px) scale(.92);}

    /* ── Countdown-Button im ADN-Player ── */
    .as-player-btn{display:inline-flex;align-items:center;gap:8px;margin-right:8px;padding:8px 14px 8px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(10,12,20,.72);color:#fff;font:600 13px/1.2 var(--as-font);cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);transition:background .2s,border-color .2s;vertical-align:middle;}
    .as-player-btn[hidden]{display:none;}
    .as-player-btn:hover{background:rgba(10,12,20,.9);border-color:rgba(255,255,255,.5);}
    .as-player-btn:focus-visible{outline:none;box-shadow:0 0 0 2px var(--as-accent);}
    .as-pb-ring{width:16px;height:16px;border-radius:50%;flex-shrink:0;
      background:conic-gradient(var(--as-accent) calc(var(--p,0) * 360deg),rgba(255,255,255,.25) 0);
      -webkit-mask:radial-gradient(circle,transparent 4.5px,#000 5px);mask:radial-gradient(circle,transparent 4.5px,#000 5px);}
    .as-player-btn[data-state="suppressed"]{border-color:var(--as-yellow);padding-left:14px;}
    .as-player-btn[data-state="suppressed"] .as-pb-ring{display:none;}

    .as-cs-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;}
    .as-cs-show{opacity:1;}
    .as-cs-box{background:var(--as-bg-solid);border:1px solid var(--as-border);border-radius:20px;padding:32px 40px;min-width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.5);}
    .as-cs-title{font:700 22px var(--as-font);color:var(--as-text);margin-bottom:24px;text-align:center;}
    .as-cs-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--as-border);}
    .as-cs-row:last-of-type{border-bottom:none;}
    .as-cs-key{font:700 13px 'JetBrains Mono',monospace;color:var(--as-accent);background:var(--as-input);border:1px solid var(--as-input-border);border-radius:6px;padding:5px 12px;min-width:80px;text-align:center;}
    .as-cs-lbl{font:500 14px var(--as-font);color:var(--as-text);margin-left:24px;}
    .as-cs-hint{font:400 12px var(--as-font);color:var(--as-text2);text-align:center;margin-top:20px;}

    @media (prefers-reduced-motion: reduce){
      #as-gear,#as-panel,.as-banner,.as-toast,.as-pane,.as-gear-txt,.as-dot{transition:none !important;animation:none !important;}
    }
    `;
    document.head.appendChild(s);
  }

  /* ─── Panel Builder ────────────────────────────────────── */
  function mkRow(label, input) {
    // A11y: Label als aria-label auf das eigentliche Eingabeelement
    const target = input.matches?.("input,select") ? input : input.querySelector?.("input,select");
    if (target && !target.hasAttribute("aria-label")) target.setAttribute("aria-label", label);
    return el("div", "as-row", {}, [el("div", "as-row-lbl", {}, [label]), input]);
  }
  function mkToggle(key) {
    const i = el("input", "as-toggle", { type: "checkbox", checked: !!S[key] });
    i.dataset.sk = key;
    i.setAttribute("role", "switch");
    i.addEventListener("change", () => {
      save({ [key]: i.checked });
      if (key === "updateCheckEnabled" && i.checked) checkUpd(true);
    });
    return i;
  }
  function mkNum(key, min, max, step = 1, cls = "") {
    const i = el("input", `as-input ${cls}`.trim(), { type: "number", min, max, step, value: String(S[key]) });
    i.dataset.sk = key;
    const sv = (fin) => {
      const v = Number(i.value);
      if (!Number.isFinite(v) || i.value === "") return;
      const val = fin ? Math.min(max, Math.max(min, v)) : v;
      save({ [key]: val });
      if (fin) i.value = String(val);
    };
    i.addEventListener("input", () => sv(false));
    i.addEventListener("change", () => sv(true));
    i.addEventListener("blur", () => sv(true));
    return i;
  }
  function fmtSec(ms) {
    return `${(Number(ms) / 1000).toLocaleString(getLang(), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} s`;
  }
  function mkRange(key, min, max, step, fmt) {
    const i = el("input", "as-range", { type: "range", min, max, step, value: String(S[key]) });
    const out = el("span", "as-range-out", { textContent: fmt(S[key]) });
    i.dataset.sk = key; i._out = out; i._fmt = fmt;
    i.addEventListener("input", () => { out.textContent = fmt(i.value); save({ [key]: Number(i.value) }); });
    const wrap = el("div", "as-range-wrap", {}, [i, out]);
    return wrap;
  }
  function mkSel(key, opts, onChange) {
    const s = el("select", "as-input");
    opts.forEach(o => s.appendChild(el("option", "", { value: o.v, textContent: o.l })));
    s.value = S[key]; s.dataset.sk = key;
    s.addEventListener("change", () => { save({ [key]: s.value }); onChange?.(s.value); });
    return s;
  }
  function mkHotkey(key) {
    const i = el("input", "as-input as-hk-input", { type: "text", readOnly: true, value: fmtCombo(S[key] || ""), placeholder: "—" });
    i.title = t("keys.click_hint");
    i.dataset.sk = key; i.dataset.cap = "0";
    const exit = () => { i.dataset.cap = "0"; i.classList.remove("as-capturing"); i.value = fmtCombo(S[key] || ""); i.blur(); };
    i.addEventListener("focus", () => { i.dataset.cap = "1"; i.classList.add("as-capturing"); i.value = t("keys.press"); });
    i.addEventListener("click", () => i.focus());
    i.addEventListener("blur", () => { if (i.dataset.cap === "1") exit(); });
    i.addEventListener("keydown", (e) => {
      if (i.dataset.cap !== "1") return; e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") { exit(); return; }
      if (e.key === "Tab") { exit(); return; }
      const c = evCombo(e); if (!c) return;
      const f = fmtCombo(c); save({ [key]: f }); i.value = f; exit();
    });
    const x = el("button", "as-hk-x", { type: "button", textContent: "×", title: t("keys.clear") });
    x.setAttribute("aria-label", t("keys.clear"));
    x.addEventListener("click", (e) => { e.stopPropagation(); save({ [key]: "" }); });
    return el("div", "as-hk", {}, [i, x]);
  }
  function mkCard(title, rows) {
    const c = el("div", "as-card");
    if (title) c.appendChild(el("div", "as-card-title", { textContent: title }));
    rows.forEach(r => r && c.appendChild(r));
    return c;
  }

  function resolvedTheme() {
    if (S.uiTheme === "light" || S.uiTheme === "dark") return S.uiTheme;
    try { return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; } catch { return "dark"; }
  }

  function refreshHotkeyConflicts() {
    if (!panel) return;
    const map = new Map();
    for (const [k] of HOTKEYS) {
      const n = normCombo(S[k]); if (!n) continue;
      if (!map.has(n)) map.set(n, []);
      map.get(n).push(k);
    }
    const label = Object.fromEntries(HOTKEYS);
    panel.querySelectorAll(".as-hk-input").forEach(i => {
      const n = normCombo(S[i.dataset.sk]);
      const dups = n ? map.get(n) : null;
      const bad = !!dups && dups.length > 1;
      i.classList.toggle("as-conflict", bad);
      i.setAttribute("aria-invalid", bad ? "true" : "false");
    });
    if (hkWarn) {
      const msgs = [...map.values()].filter(v => v.length > 1)
        .map(v => t("keys.conflict", { key: fmtHint(S[v[0]]), a: v.map(k => t(label[k])).join(", ") }));
      hkWarn.textContent = msgs.join("\n");
      hkWarn.style.display = msgs.length ? "" : "none";
    }
  }

  function refreshUI() {
    const root = document.documentElement;
    root.setAttribute("data-as-theme", resolvedTheme());
    root.setAttribute("data-as-pos", GEAR_POS.includes(S.gearPos) ? S.gearPos : "br");
    if (!panel) return;
    panel.querySelectorAll("[data-sk]").forEach(e => {
      const k = e.dataset.sk; if (document.activeElement === e) return;
      if (e.type === "checkbox") e.checked = !!S[k];
      else if (e.tagName === "SELECT") e.value = String(S[k]);
      else if (e.type === "text") e.value = fmtCombo(S[k] || "");
      else e.value = String(S[k]);
      if (e._out) e._out.textContent = e._fmt(S[k]);
    });
    const paused = isPaused();
    if (gear) {
      let txt, dot;
      if (!S.enabled) { txt = t("gear.off"); dot = "off"; }
      else if (paused) { txt = t("gear.paused", { time: fmtDur(pauseMs()) }); dot = "paused"; }
      else { txt = t("gear.on"); dot = ""; }
      const upd = S.updateCheckEnabled && S.updateAvailable;
      if (upd) { dot = "update"; txt = `${txt} · ${t("gear.update")}`; }
      if (gearTxt && gearTxt.textContent !== txt) gearTxt.textContent = txt;
      if (gearDot) gearDot.className = `as-dot ${dot}`;
      // Text dauerhaft zeigen, wenn der Status vom Normalzustand abweicht
      gear.classList.toggle("as-expanded", !!dot);
      gear.classList.toggle("as-update", !!upd);
      gear.setAttribute("aria-label", `${t("panel.title")} – ${txt}${upd ? " · " + t("status.update") : ""}`);
      gear.setAttribute("aria-expanded", panel.classList.contains("as-open") ? "true" : "false");
    }
    if (pauseLabel) {
      const txt = !S.enabled ? t("pause.off")
        : paused ? t("pause.paused", { time: fmtDur(pauseMs()) }) : t("pause.active");
      if (pauseLabel.textContent !== txt) pauseLabel.textContent = txt;
    }
    if (pauseToggleBtn) {
      pauseToggleBtn.textContent = paused ? `▶ ${t("pause.resume")}` : `⏸ ${t("pause.btn")}`;
      pauseToggleBtn.classList.toggle("as-paused", paused);
      pauseToggleBtn.disabled = !S.enabled;
    }
    if (sysTabBadge) sysTabBadge.style.display = S.updateCheckEnabled && S.updateAvailable ? "block" : "none";
    refreshHotkeyConflicts();
    refreshUpdInfo();
  }

  function refreshUpdInfo() {
    if (!updInfo) return;
    // FIX: nur neu aufbauen, wenn sich der Update-Zustand geändert hat (kein Flackern/Fokusverlust)
    const sig = [S.updateLastResult, S.updateLastRemoteVersion, S.updateAvailable, S.updateLastCheckTs,
      S.updateLastError, S.updateReleaseUrl, getLang()].join("|");
    if (sig === updInfoSig) return;
    updInfoSig = sig;

    while(updInfo.firstChild) updInfo.removeChild(updInfo.firstChild);

    const fmtT = ts => { const n = Number(ts || 0); if (!n) return t("sys.never"); try { return new Date(n).toLocaleString(getLang()); } catch { return "?"; } };
    const res = S.updateLastResult || "idle", rem = S.updateLastRemoteVersion, has = S.updateAvailable;

    const bar = el("div", `as-upd-bar ${res === "checking" ? "ck" : ""}`);
    bar.appendChild(el("div", "as-upd-bar-fill"));
    updInfo.appendChild(bar);

    const addR = (l, v, c = "") => {
      const r = el("div", "as-upd-row");
      r.append(el("span", "as-upd-lbl", { textContent: l }), el("span", `as-upd-val ${c}`, { textContent: v }));
      updInfo.appendChild(r);
    };
    addR(t("sys.installed"), `v${SCRIPT_VERSION}`);
    if (rem) addR(t("sys.latest"), `v${rem}`, has ? "new" : "ok");

    const sMap = {
      checking:["🔄","status.checking"], up_to_date:["✅","status.up_to_date"],
      update:["🆕","status.update"], error:["❌","status.error"],
      disabled:["⏸️","status.disabled"], skipped_lock:["🔒","status.locked"],
    };
    const [emo, sKey] = sMap[res] || ["⏳", "status.ready"];
    addR(t("sys.status"), `${emo} ${t(sKey)}`);
    addR(t("sys.checked"), fmtT(S.updateLastCheckTs));

    if (S.updateLastError) {
      const er = el("div", "as-upd-row");
      er.append(el("span", "as-upd-lbl", { textContent: t("sys.error") }));
      const ev = el("span", "as-upd-val", { textContent: S.updateLastError });
      ev.style.cssText = "color:var(--as-red);font-size:11px;word-break:break-all;";
      er.appendChild(ev); updInfo.appendChild(er);
    }

    const acts = el("div", "as-card-acts"); acts.style.marginTop = "10px";
    const checking = res === "checking";
    const ckB = el("button", "as-btn", { textContent: checking ? t("sys.checking") : t("sys.check_now"), disabled: checking });
    ckB.addEventListener("click", () => { ckB.disabled = true; ckB.textContent = t("sys.checking"); checkUpd(true); });
    acts.appendChild(ckB);
    if (has) {
      const iB = el("button", "as-btn as-btn-accent", { textContent: t("sys.install") });
      iB.addEventListener("click", installUpd); acts.appendChild(iB);
      if (S.updateReleaseUrl) acts.appendChild(el("a", "as-btn as-btn-link", { textContent: t("sys.release"), href: S.updateReleaseUrl, target: "_blank", rel: "noopener" }));
    }
    const relB = el("button", "as-btn as-btn-ghost", { textContent: t("sys.reload") });
    relB.addEventListener("click", () => location.reload());
    acts.appendChild(relB);
    updInfo.appendChild(acts);
  }

  function openPanel() {
    if (!panel) return;
    panel.classList.add("as-open");
    gear?.setAttribute("aria-expanded", "true");
    gear?.classList.remove("as-idle");
    // Fokus auf aktiven Tab für Tastaturbedienung
    setTimeout(() => panel?.querySelector(".as-tab.active")?.focus({ preventScroll: true }), 50);
  }
  function closePanel(returnFocus = true) {
    if (!panel || !panel.classList.contains("as-open")) return;
    panel.classList.remove("as-open");
    gear?.setAttribute("aria-expanded", "false");
    if (returnFocus && panel.contains(document.activeElement)) gear?.focus({ preventScroll: true });
  }

  function destroyPanel() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    if (panelCloseHandler) { document.removeEventListener("click", panelCloseHandler); panelCloseHandler = null; }
    gear?.remove(); panel?.remove();
    gear = panel = gearDot = gearTxt = sysTabBadge = pauseLabel = pauseToggleBtn = updInfo = hkWarn = null;
    updInfoSig = "";
  }
  function rebuildPanel() {
    const wasOpen = !!panel?.classList.contains("as-open");
    destroyPanel();
    buildPanel();
    if (wasOpen) { panel.classList.add("as-open"); gear.setAttribute("aria-expanded", "true"); }
    refreshBanner();
    if (playerBtn) { playerBtn.remove(); playerBtn = null; pbAnchor = null; scan(); }
  }

  function buildPanel() {
    if (document.getElementById("as-gear")) return;
    injectCSS();

    gear = el("button", "", { id: "as-gear", type: "button" });
    gear.setAttribute("aria-haspopup", "dialog");
    gear.setAttribute("aria-controls", "as-panel");
    gearDot = el("span", "as-dot");
    gearTxt = el("span", "as-gear-txt", { textContent: t("gear.on") });
    gear.append(gearDot, icon("skip", 15), gearTxt);

    panel = el("div", "", { id: "as-panel" });
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", t("panel.title"));

    const hdr = el("div", "as-panel-hdr");
    const titleArea = el("div", "as-panel-title", {}, [
      document.createTextNode(t("panel.title")),
      el("span", "as-ver", { textContent: `v${SCRIPT_VERSION}` }),
    ]);
    const xBtn = el("button", "as-x", { textContent: "×", type: "button" });
    xBtn.setAttribute("aria-label", "Close");
    xBtn.addEventListener("click", () => closePanel());
    hdr.append(titleArea, xBtn);

    const tabsBar = el("div", "as-tabs");
    tabsBar.setAttribute("role", "tablist");
    const tabsBody = el("div", "as-tabs-body");

    // System-Tab: Update-Info + Einstellungs-Verwaltung inkl. Reset (Gefahr-Button mit Inline-Bestätigung)
    updInfo = el("div", "as-upd-info");
    const expB = el("button", "as-btn", { textContent: t("sys.export"), type: "button" }); expB.addEventListener("click", exportS);
    const impB = el("button", "as-btn", { textContent: t("sys.import"), type: "button" }); impB.addEventListener("click", importS);
    const rstB = armConfirm(el("button", "as-btn as-btn-danger", { textContent: t("sys.reset"), type: "button" }),
      () => applyAll({ ...DEFAULTS }));
    const ioActs = el("div", "as-card-acts", {}, [expB, impB, rstB]);

    hkWarn = el("div", "as-warn"); hkWarn.style.display = "none"; hkWarn.style.whiteSpace = "pre-line";
    hkWarn.setAttribute("role", "alert");

    const themeOpts = THEMES.map(v => ({ v, l: t("opt." + v) }));
    const langOpts = [{ v: "auto", l: t("opt.auto") }, { v: "en", l: "English" }, { v: "de", l: "Deutsch" }, { v: "fr", l: "Français" }];
    const posOpts = GEAR_POS.map(v => ({ v, l: t("pos." + v) }));

    const tabs = [
      { id: "general", label: t("tab.general"), panes: [
        mkCard(t("card.behavior"), [
          mkRow(t("general.enable"), mkToggle("enabled")),
          mkRow(t("general.delay"), mkRange("delayMs", 0, DELAY_MAX_MS, 500, fmtSec)),
          mkRow(t("general.auto_fullscreen"), mkToggle("autoFullscreen")),
        ]),
        mkCard(t("card.appearance"), [
          mkRow(t("general.theme"), mkSel("uiTheme", themeOpts)),
          mkRow(t("general.language"), mkSel("lang", langOpts, () => rebuildPanel())),
          mkRow(t("general.toasts"), mkToggle("showToasts")),
          mkRow(t("general.gear_pos"), mkSel("gearPos", posOpts)),
          mkRow(t("general.gear_autohide"), mkToggle("gearAutoHide")),
        ]),
      ]},
      { id: "skip", label: t("tab.skip"), panes: [
        mkCard(t("card.categories"), [
          mkRow(t("skip.intro"), mkToggle("skipIntro")),
          mkRow(t("skip.recap"), mkToggle("skipRecap")),
          mkRow(t("skip.credits"), mkToggle("skipCredits")),
          mkRow(t("skip.next"), mkToggle("skipNextEpisode")),
        ]),
        mkCard(t("card.detection"), [
          mkRow(t("skip.require_player"), mkToggle("requirePlayerContext")),
        ]),
      ]},
      { id: "keys", label: t("tab.keys"), panes: [
        mkCard(t("card.hotkeys"), [
          ...HOTKEYS.map(([k, lbl]) => mkRow(t(lbl), mkHotkey(k))),
          hkWarn,
        ]),
        mkCard(t("card.jump"), [
          mkRow(t("skip.jump_seconds"), mkNum("jumpSeconds", 1, 600, 1)),
        ]),
      ]},
      { id: "system", label: t("tab.system"), badge: true, panes: [
        mkCard(t("card.updates"), [ mkRow(t("sys.update_check"), mkToggle("updateCheckEnabled")) ]),
        updInfo,
        mkCard(t("card.settings"), [ ioActs ]),
        mkCard(t("card.maintenance"), [ mkRow(t("sys.debug"), mkToggle("debug")) ]),
      ]},
    ];

    if (activeTab >= tabs.length) activeTab = 0;
    const btns = [], panes = [];
    const select = (idx, focus) => {
      btns.forEach((b, j) => {
        const on = j === idx;
        b.classList.toggle("active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.tabIndex = on ? 0 : -1;
        panes[j].classList.toggle("active", on);
      });
      activeTab = idx;
      tabsBody.scrollTop = 0;
      if (focus) btns[idx].focus();
    };
    tabs.forEach((tab, i) => {
      const btn = el("button", "as-tab", { type: "button", id: `as-tab-${tab.id}` });
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", `as-pane-${tab.id}`);
      btn.append(icon(tab.id, 13), document.createTextNode(tab.label));
      if (tab.badge) { sysTabBadge = el("span", "as-tab-dot"); sysTabBadge.style.display = "none"; btn.appendChild(sysTabBadge); }
      const pane = el("div", "as-pane", { id: `as-pane-${tab.id}` }, tab.panes);
      pane.setAttribute("role", "tabpanel");
      pane.setAttribute("aria-labelledby", btn.id);
      btn.addEventListener("click", () => select(i, false));
      btns.push(btn); panes.push(pane);
      tabsBar.appendChild(btn); tabsBody.appendChild(pane);
    });
    // Pfeiltasten-Navigation zwischen Tabs
    tabsBar.addEventListener("keydown", (e) => {
      const n = btns.length;
      if (e.key === "ArrowRight") { e.preventDefault(); select((activeTab + 1) % n, true); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); select((activeTab - 1 + n) % n, true); }
      else if (e.key === "Home") { e.preventDefault(); select(0, true); }
      else if (e.key === "End") { e.preventDefault(); select(n - 1, true); }
    });
    select(activeTab, false);

    // Footer: Status + ein Umschalt-Button für Pause/Fortsetzen + Pausendauer
    pauseLabel = el("div", "as-footer-status", { textContent: t("pause.active") });
    pauseLabel.setAttribute("aria-live", "polite");
    pauseToggleBtn = el("button", "as-btn", { type: "button" });
    pauseToggleBtn.addEventListener("click", () => { if (isPaused()) doResume(); else doPause(S.pauseMinutes); });
    const pauseMin = mkNum("pauseMinutes", 1, 180, 1, "as-sm");
    pauseMin.setAttribute("aria-label", `${t("pause.btn")} (${t("pause.min")})`);
    const footer = el("div", "as-footer", {}, [
      pauseLabel,
      el("div", "as-footer-acts", {}, [pauseMin, el("span", "as-unit", { textContent: t("pause.min") }), pauseToggleBtn]),
    ]);

    panel.append(hdr, tabsBody, tabsBar, footer);
    gear.addEventListener("click", () => {
      if (panel.classList.contains("as-open")) closePanel(); else openPanel();
    });
    if (panelCloseHandler) document.removeEventListener("click", panelCloseHandler);
    panelCloseHandler = e => {
      if (!panel?.classList.contains("as-open")) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      closePanel(false);
    };
    document.addEventListener("click", panelCloseHandler);
    document.body.append(gear, panel);
    createBanner();

    refreshTimer = setInterval(refreshUI, 1000);
    refreshUI();
  }

  /* ─── Gear: Escape schließt Panel, Auto-Ausblenden bei Inaktivität ─── */
  function setupPanelGlobals() {
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (!panel?.classList.contains("as-open")) return;
      e.preventDefault(); e.stopPropagation();
      closePanel(true);
    });
    const wake = () => {
      if (!gear) return;
      gear.classList.remove("as-idle");
      clearTimeout(idleTimer);
      if (!S.gearAutoHide) return;
      idleTimer = setTimeout(() => {
        if (!gear || !S.gearAutoHide) return;
        if (panel?.classList.contains("as-open") || gear.contains(document.activeElement)) return;
        gear.classList.add("as-idle");
      }, 3000);
    };
    for (const type of ["mousemove", "keydown", "touchstart", "scroll"])
      window.addEventListener(type, wake, { passive: true, capture: true });
    try { window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", refreshUI); } catch { /* alte Browser */ }
    wake();
  }

  /* ─── Hotkeys ──────────────────────────────────────────── */
  function handleKeydown(e, { skipBtn, jump, jumpBack, suppress, shouldIgnore }) {
    if (shouldIgnore(e.target)) return;
    if (matchCombo(e, S.cheatsheetKey)) { e.preventDefault(); showCS(); return; }
    if (matchCombo(e, S.skipCurrentOnceKey)) { if (suppress()) { e.preventDefault(); e.stopPropagation(); } }
    if (matchCombo(e, S.toggleKey)) { e.preventDefault(); save({ enabled: !S.enabled }); toast(S.enabled ? "toast.enabled" : "toast.disabled"); }
    if (matchCombo(e, S.pauseKey)) { e.preventDefault(); if (isPaused()) doResume(); else doPause(S.pauseMinutes); }
    if (matchCombo(e, S.introSkipKey)) {
      e.preventDefault();
      if (!skipBtn()) { const s = Math.abs(Number(S.jumpSeconds) || 85); if (jump(s)) toast("toast.jump_fwd", { sec: s }); }
    }
    if (matchCombo(e, S.introBackKey)) { e.preventDefault(); jumpBack(); }
  }

  function setupKeys() {
    const skipBtn = () => {
      const b = document.querySelector('a[data-testid="skip-intro-button"],button[data-testid="skip-intro-button"]');
      if (!b || !isVis(b) || !canClick(b)) return false;
      const v = findVid(); if (v) lastIntroT = Math.max(0, v.currentTime || 0);
      cancelPending(b); markClick(b); b.click(); toast("toast.intro"); updPlayerBtn(); return true;
    };
    const jump = (s) => {
      const v = findVid(); if (!v) return false;
      const m = Number.isFinite(v.duration) ? v.duration : 1e9;
      v.currentTime = Math.max(0, Math.min(m, (v.currentTime || 0) + s));
      return true;
    };
    const jumpBack = () => {
      const v = findVid(); if (!v) return false;
      if (typeof lastIntroT === "number") {
        v.currentTime = Math.max(0, Math.min(v.duration || 1e9, lastIntroT));
        toast("toast.jump_back"); return true;
      }
      toast("toast.jump_back");
      return jump(-Math.abs(Number(S.jumpSeconds) || 85));
    };
    const suppress = () => {
      const c = getCandidates(), f = c.find(x => x.el !== suppressedBtn);
      if (!f) return false;
      suppressedBtn = f.el; cancelPending(f.el); toast("toast.suppressed"); updPlayerBtn(); return true;
    };
    const shouldIgnore = (tgt) => {
      if (!(tgt instanceof Element)) return false;
      if (tgt.closest("#as-panel,#as-gear,#as-banner,.as-cs-overlay")) return true;
      return tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement
      || tgt instanceof HTMLSelectElement || tgt.isContentEditable;
    };

    document.addEventListener("keydown", e => handleKeydown(e, { skipBtn, jump, jumpBack, suppress, shouldIgnore }), true);
  }

  /* ─── Boot ─────────────────────────────────────────────── */
  function boot() {
    buildPanel(); setupPanelGlobals(); startObs(); setupKeys(); setupFS(); setupAutoFS(); startUpdChecker(); scan();
    log("v" + SCRIPT_VERSION, S);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
