// ==UserScript==
// @name         ADN Auto Skip with Settings
// @namespace    local.adn.autoskip
// @version      2.0.1
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
  : "2.0.1";

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
      "gear.on":"SKIP ON","gear.off":"SKIP OFF","gear.paused":"PAUSED {sec}s",
      "panel.title":"ADN Auto Skip",
      "tab.general":"⚙ General","tab.skip":"⏭ Skip","tab.keys":"⌨ Keys","tab.system":"🔧 System",
      "general.enable":"Enable Auto Skip","general.delay":"Delay (ms)",
 "general.theme":"Theme","general.pause_duration":"Pause (min)",
 "general.toasts":"Notifications",
 "skip.intro":"Skip Intro","skip.recap":"Skip Recap",
 "skip.credits":"Skip Credits","skip.next":"Skip Next Episode",
 "skip.require_player":"Require player context","skip.jump_seconds":"Jump seconds",
 "keys.skip_intro":"Skip intro","keys.jump_back":"Jump back",
 "keys.suppress":"Suppress once","keys.toggle":"Toggle on/off",
 "keys.pause":"Pause/Resume","keys.cheatsheet":"Show help",
 "keys.press":"Press keys…","keys.click_hint":"Click, then press keys",
 "sys.debug":"Debug logs","sys.update_check":"Auto update check",
 "sys.export":"Export","sys.import":"Import","sys.reset":"Reset all",
 "sys.check_now":"Check now","sys.checking":"Checking…",
 "sys.install":"Install","sys.release":"Release ↗",
 "sys.installed":"Installed","sys.latest":"Latest","sys.status":"Status",
 "sys.checked":"Checked","sys.error":"Error","sys.never":"never",
 "status.checking":"Checking…","status.up_to_date":"Up to date",
 "status.update":"Update available","status.error":"Error",
 "status.disabled":"Disabled","status.locked":"Other tab checking","status.ready":"Ready",
 "pause.active":"Auto Skip active","pause.paused":"Paused · {sec}s left",
 "pause.btn":"Pause","pause.resume":"Resume",
 "reset.confirm":"Reset all settings to default?",
 "import.success":"Settings imported","import.error":"Import failed: invalid file",
 "export.filename":"adn-autoskip-settings.json",
 "update.title":"Update available","update.subtitle":"v{old} → v{new}",
 "update.whats_new":"What's new","update.install_now":"Install now",
 "update.remind_later":"Later","update.ignore_version":"Ignore",
 "update.ignore_confirm":"Ignore v{ver}?","update.view_release":"View release",
 "toast.intro":"⏭ Intro skipped","toast.recap":"⏭ Recap skipped",
 "toast.credits":"⏭ Credits skipped","toast.next":"⏭ Next episode",
 "toast.enabled":"✅ Auto Skip on","toast.disabled":"⛔ Auto Skip off",
 "toast.paused":"⏸ Paused {min}m","toast.resumed":"▶ Resumed",
 "toast.suppressed":"🔇 Suppressed","toast.jump_fwd":"⏩ +{sec}s",
 "toast.jump_back":"⏪ Back",
 "cs.title":"Keyboard Shortcuts","cs.hint":"Press any key to close",
 "cs.toggle":"Toggle","cs.pause":"Pause / Resume",
 "cs.skip":"Skip / Jump","cs.back":"Jump back",
 "cs.suppress":"Suppress once","cs.help":"This help",
 "player.suppressed":"Skip suppressed!",
 "player.reenable":"Re-enable [{key}]","player.disable":"Disable [{key}]",
    },
    de: {
      "gear.on":"SKIP AN","gear.off":"SKIP AUS","gear.paused":"PAUSE {sec}s",
      "panel.title":"ADN Auto Skip",
      "tab.general":"⚙ Allgemein","tab.skip":"⏭ Skip","tab.keys":"⌨ Tasten","tab.system":"🔧 System",
      "general.enable":"Auto Skip aktivieren","general.delay":"Verzögerung (ms)",
 "general.theme":"Design","general.pause_duration":"Pause (Min)",
 "general.toasts":"Benachrichtigungen",
 "skip.intro":"Intro überspringen","skip.recap":"Recap überspringen",
 "skip.credits":"Credits überspringen","skip.next":"Nächste Episode",
 "skip.require_player":"Player-Kontext","skip.jump_seconds":"Sprung-Sekunden",
 "keys.skip_intro":"Intro überspringen","keys.jump_back":"Zurückspringen",
 "keys.suppress":"Einmal unterdrücken","keys.toggle":"Ein/Aus",
 "keys.pause":"Pause/Fortsetzen","keys.cheatsheet":"Hilfe anzeigen",
 "keys.press":"Tasten drücken…","keys.click_hint":"Klick, dann Tasten drücken",
 "sys.debug":"Debug-Logs","sys.update_check":"Auto Update-Check",
 "sys.export":"Exportieren","sys.import":"Importieren","sys.reset":"Zurücksetzen",
 "sys.check_now":"Jetzt prüfen","sys.checking":"Prüfe…",
 "sys.install":"Installieren","sys.release":"Release ↗",
 "sys.installed":"Installiert","sys.latest":"Neueste","sys.status":"Status",
 "sys.checked":"Geprüft","sys.error":"Fehler","sys.never":"nie",
 "status.checking":"Prüfe…","status.up_to_date":"Aktuell",
 "status.update":"Update verfügbar","status.error":"Fehler",
 "status.disabled":"Deaktiviert","status.locked":"Anderer Tab prüft","status.ready":"Bereit",
 "pause.active":"Auto Skip aktiv","pause.paused":"Pausiert · {sec}s",
 "pause.btn":"Pause","pause.resume":"Fortsetzen",
 "reset.confirm":"Alle Einstellungen zurücksetzen?",
 "import.success":"Einstellungen importiert","import.error":"Import fehlgeschlagen",
 "export.filename":"adn-autoskip-einstellungen.json",
 "update.title":"Update verfügbar","update.subtitle":"v{old} → v{new}",
 "update.whats_new":"Änderungen","update.install_now":"Installieren",
 "update.remind_later":"Später","update.ignore_version":"Ignorieren",
 "update.ignore_confirm":"v{ver} ignorieren?","update.view_release":"Release ansehen",
 "toast.intro":"⏭ Intro übersprungen","toast.recap":"⏭ Recap übersprungen",
 "toast.credits":"⏭ Credits übersprungen","toast.next":"⏭ Nächste Episode",
 "toast.enabled":"✅ Auto Skip an","toast.disabled":"⛔ Auto Skip aus",
 "toast.paused":"⏸ Pausiert {min}m","toast.resumed":"▶ Fortgesetzt",
 "toast.suppressed":"🔇 Unterdrückt","toast.jump_fwd":"⏩ +{sec}s",
 "toast.jump_back":"⏪ Zurück",
 "cs.title":"Tastenkürzel","cs.hint":"Beliebige Taste zum Schließen",
 "cs.toggle":"Ein/Aus","cs.pause":"Pause / Fortsetzen",
 "cs.skip":"Überspringen / Springen","cs.back":"Zurückspringen",
 "cs.suppress":"Einmal unterdrücken","cs.help":"Diese Hilfe",
 "player.suppressed":"Skip unterdrückt!",
 "player.reenable":"Aktivieren [{key}]","player.disable":"Deaktivieren [{key}]",
    },
    fr: {
      "gear.on":"SKIP ON","gear.off":"SKIP OFF","gear.paused":"PAUSE {sec}s",
 "panel.title":"ADN Auto Skip",
 "tab.general":"⚙ Général","tab.skip":"⏭ Passage","tab.keys":"⌨ Touches","tab.system":"🔧 Système",
 "general.enable":"Activer Auto Skip","general.delay":"Délai (ms)",
 "general.theme":"Thème","general.pause_duration":"Pause (min)",
 "general.toasts":"Notifications",
 "skip.intro":"Passer l'intro","skip.recap":"Passer le récap",
 "skip.credits":"Passer le générique","skip.next":"Épisode suivant",
 "skip.require_player":"Contexte lecteur","skip.jump_seconds":"Secondes de saut",
 "keys.skip_intro":"Passer l'intro","keys.jump_back":"Retour",
 "keys.suppress":"Supprimer une fois","keys.toggle":"Activer/Désactiver",
 "keys.pause":"Pause/Reprendre","keys.cheatsheet":"Aide",
 "keys.press":"Appuyez…","keys.click_hint":"Cliquez puis appuyez",
 "sys.debug":"Logs debug","sys.update_check":"Vérif. auto",
 "sys.export":"Exporter","sys.import":"Importer","sys.reset":"Réinitialiser",
 "sys.check_now":"Vérifier","sys.checking":"Vérification…",
 "sys.install":"Installer","sys.release":"Release ↗",
 "sys.installed":"Installé","sys.latest":"Dernière","sys.status":"Statut",
 "sys.checked":"Vérifié","sys.error":"Erreur","sys.never":"jamais",
 "status.checking":"Vérification…","status.up_to_date":"À jour",
 "status.update":"Mise à jour dispo","status.error":"Erreur",
 "status.disabled":"Désactivé","status.locked":"Autre onglet vérifie","status.ready":"Prêt",
 "pause.active":"Auto Skip actif","pause.paused":"En pause · {sec}s",
 "pause.btn":"Pause","pause.resume":"Reprendre",
 "reset.confirm":"Réinitialiser tous les paramètres ?",
 "import.success":"Paramètres importés","import.error":"Échec de l'import",
 "export.filename":"adn-autoskip-parametres.json",
 "update.title":"Mise à jour","update.subtitle":"v{old} → v{new}",
 "update.whats_new":"Nouveautés","update.install_now":"Installer",
 "update.remind_later":"Plus tard","update.ignore_version":"Ignorer",
 "update.ignore_confirm":"Ignorer v{ver} ?","update.view_release":"Voir la release",
 "toast.intro":"⏭ Intro passée","toast.recap":"⏭ Récap passé",
 "toast.credits":"⏭ Générique passé","toast.next":"⏭ Épisode suivant",
 "toast.enabled":"✅ Auto Skip activé","toast.disabled":"⛔ Auto Skip désactivé",
 "toast.paused":"⏸ En pause {min}m","toast.resumed":"▶ Repris",
 "toast.suppressed":"🔇 Supprimé","toast.jump_fwd":"⏩ +{sec}s",
 "toast.jump_back":"⏪ Retour",
 "cs.title":"Raccourcis clavier","cs.hint":"Touche pour fermer",
 "cs.toggle":"Activer/Désactiver","cs.pause":"Pause/Reprendre",
 "cs.skip":"Passer / Sauter","cs.back":"Retour",
 "cs.suppress":"Supprimer une fois","cs.help":"Cette aide",
 "player.suppressed":"Skip supprimé !",
 "player.reenable":"Réactiver [{key}]","player.disable":"Désactiver [{key}]",
    },
  };

  function getLang() { const l = navigator.language.slice(0, 2).toLowerCase(); return LANG[l] ? l : "en"; }
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
    "showToasts","cheatsheetKey",
    "updateCheckEnabled","updateLastCheckTs","updateAvailable",
    "updateLastRemoteVersion","updateLastResult","updateLastError",
    "updateChangelog","updateReleaseUrl","updateSnoozedUntilTs",
    "updateIgnoredVersion","updateLastSuccessfulUpdate",
    "_settingsVersion",
  ]);
  const SETTINGS_VERSION = 5;
  const DEFAULTS = {
    enabled:true, delayMs:3500, uiTheme:"dark", pauseMinutes:5,
    pauseKey:"F9", introSkipKey:"Control+ArrowRight", introBackKey:"Control+ArrowLeft",
    jumpSeconds:85, skipCurrentOnceKey:"ArrowDown", pausedUntilTs:0,
    skipIntro:true, skipRecap:true, skipCredits:true, skipNextEpisode:true,
    requirePlayerContext:false, debug:false, toggleKey:"F8",
    showToasts:true, cheatsheetKey:"Shift+?",  // FIX #3: changed from F1
    updateCheckEnabled:true, updateLastCheckTs:0, updateAvailable:false,
    updateLastRemoteVersion:"", updateLastResult:"idle", updateLastError:"",
    updateChangelog:"", updateReleaseUrl:"", updateSnoozedUntilTs:0,
    updateIgnoredVersion:"", updateLastSuccessfulUpdate:0,
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
  let skipTimer = null, clickCD = new WeakMap(), pendingCD = new WeakMap();
  let suppressedBtn = null, playerBtn = null, playerBtnActive = false;
  let pauseLabel = null, lastIntroT = null;
  let updTimer = null, updBanner = null, updInfo = null;
  let isFS = false, toastBox = null, csOverlay = null, csCloseHandler = null; // FIX #2
  let panel = null, gear = null, gearDot = null, gearTxt = null, sysTabBadge = null;
  let refreshTimer = null; // FIX #13

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

  /* ─── Settings ─────────────────────────────────────────── */
  function migrate(raw) {
    const c = {};
    for (const k of Object.keys(raw)) if (KNOWN_KEYS.has(k)) c[k] = raw[k];
    const merged = { ...DEFAULTS, ...c, _settingsVersion: SETTINGS_VERSION };
    // FIX #3: migrate old F1 cheatsheet key
    if (c.cheatsheetKey === "F1") merged.cheatsheetKey = DEFAULTS.cheatsheetKey;
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
    if (toastBox && document.contains(toastBox)) return;
    toastBox = el("div", "as-toasts"); toastBox.id = "as-toasts";
    document.body.appendChild(toastBox);
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
      const row = el("div", "as-cs-row");
      row.append(
        el("kbd", "as-cs-key", { textContent: fmtHint(k) }),
                 el("span", "as-cs-lbl", { textContent: t(lbl) })
      );
      box.appendChild(row);
    }
    box.appendChild(el("div", "as-cs-hint", { textContent: t("cs.hint") }));
    csOverlay.appendChild(box);
    document.body.appendChild(csOverlay);
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
          save(migrate({ ...DEFAULTS, ...imported }));
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
    const A = String(a).split(".").map(Number), B = String(b).split(".").map(Number);
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
    } catch{}
    localStorage.setItem(UPDATE_LOCK_KEY, JSON.stringify({ts:now}));
    return true;
  }
  function unlockUpd() { try{localStorage.removeItem(UPDATE_LOCK_KEY);}catch{} }

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
  function setupFS() {
    const u=()=>{isFS=!!document.fullscreenElement;updateVis();};
    document.addEventListener("fullscreenchange",u);
    document.addEventListener("webkitfullscreenchange",u);
  }
  function updateVis() {
    if (!gear) return;
    if (isFS) {
      gear.style.opacity="0"; gear.style.pointerEvents="none";
      panel?.classList.remove("as-open");
      if(updBanner)updBanner.style.display="none";
      if(toastBox)toastBox.style.display="none";
    } else {
      gear.style.opacity=""; gear.style.pointerEvents="";
      if(updBanner)updBanner.style.display="";
      if(toastBox)toastBox.style.display="";
    }
  }

  /* ─── Pause ────────────────────────────────────────────── */
  function isPaused(){return Number(S.pausedUntilTs||0)>Date.now();}
  function pauseMs(){return Math.max(0,Number(S.pausedUntilTs||0)-Date.now());}
  function doPause(m){const mins=Math.max(1,Math.min(180,Number(m)||S.pauseMinutes));save({pausedUntilTs:Date.now()+mins*60000});toast("toast.paused",{min:mins});}
  function doResume(){save({pausedUntilTs:0});toast("toast.resumed");}

  /* ─── Key Util ─────────────────────────────────────────── */
  function norm(s){return(s||"").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/\s+/g," ").trim();}
  function normCombo(c){return(c||"").toLowerCase().replace(/\s+/g,"").replace(/\bctrl\b/g,"control");}
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
  function clickDelay(e,cat){
    if(pendingCD.has(e))return;
    const d=Math.max(0,Number(S.delayMs)||0);
    const tid=setTimeout(()=>{
      pendingCD.delete(e);
      if(!S.enabled||isPaused()||!isVis(e)||suppressedBtn===e||!canClick(e))return;
      markClick(e);
      if(cat==="intro"){const v=findVid();if(v)lastIntroT=Math.max(0,v.currentTime||0);}
      e.click();toast(TOAST_CAT[cat]||"toast.intro");log("Click",cat);
    },d);
    pendingCD.set(e,tid);
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
  function rmPlayerBtn(){if(playerBtn?.parentNode)playerBtn.remove();playerBtn=null;}
  function updPlayerBtn(){
    if(!playerBtn)return;
    const h=fmtHint(S.skipCurrentOnceKey||"ArrowDown");
    let txt,bg,col,bdr;
    if(suppressedBtn){txt=t("player.suppressed");bg="#4caf50";col="#fff";bdr="#2e7d32";}
    else if(playerBtnActive){txt=t("player.reenable",{key:h});bg="#e7e7e7";col="#111";bdr="#777";}
    else{txt=t("player.disable",{key:h});bg="#e7e7e7";col="#111";bdr="#777";}
    if(playerBtn.textContent!==txt)playerBtn.textContent=txt;
    Object.assign(playerBtn.style,{background:bg,color:col,borderColor:bdr});
  }
  function ensurePlayerBtn(cands){
    if(!S.enabled||!cands.length){rmPlayerBtn();if(!cands.length)playerBtnActive=false;return;}
    const anchor=cands[0]?.el,container=anchor?.parentElement||anchor?.closest(ADN_SEL.skipArea);
    if(!container)return;
    if(!playerBtn||!document.contains(playerBtn)){
      playerBtn=document.createElement("button");playerBtn.type="button";playerBtn.className="as-player-btn";
      Object.assign(playerBtn.style,{marginRight:"8px",padding:"8px 12px",borderRadius:"4px",border:"1px solid #777",background:"#e7e7e7",color:"#111",fontSize:"13px",fontWeight:"600",cursor:"pointer"});
      playerBtn.addEventListener("click",()=>{playerBtnActive=!playerBtnActive;updPlayerBtn();});
    }
    if(playerBtn.parentElement!==container)container.insertBefore(playerBtn,anchor);
    updPlayerBtn();
  }
  function scan(){
    if(!S.enabled||isPaused()){rmPlayerBtn();return;}
    if(suppressedBtn&&(!document.contains(suppressedBtn)||!isVis(suppressedBtn))){suppressedBtn=null;updPlayerBtn();}
    const c=getCandidates();ensurePlayerBtn(c);
    if(playerBtnActive)return;
    for(const{el:e,cat}of c){if(suppressedBtn===e||!canClick(e))continue;clickDelay(e,cat);}
  }
  function startObs(){
    const obs=new MutationObserver(()=>scan());
    obs.observe(document.documentElement,{childList:true,subtree:true});
    skipTimer=setInterval(scan,900);
    window.addEventListener("beforeunload",()=>{
      obs.disconnect();
      if(skipTimer)clearInterval(skipTimer);
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

    // FIX #7: Clear children properly instead of innerHTML
    while(updBanner.firstChild) updBanner.removeChild(updBanner.firstChild);

    // Header
    const hdr=el("div","as-banner-hdr");
    const titleArea=el("div","as-banner-title-area");
    titleArea.append(
      el("span","as-banner-icon",{textContent:"🔄"}),
                     el("div","",[
                       el("div","as-banner-t",{textContent:t("update.title")}),
                        el("div","as-banner-sub",{textContent:t("update.subtitle",{old:SCRIPT_VERSION,new:rem})}),
                     ])
    );
    const closeB=el("button","as-banner-x",{textContent:"×"});
    closeB.setAttribute("aria-label","Close");
    closeB.addEventListener("click",snooze);
    hdr.append(titleArea,closeB);updBanner.appendChild(hdr);

    // Changelog
    if(S.updateChangelog){
      const sec=el("div","as-banner-cl");
      sec.appendChild(el("div","as-banner-cl-t",{textContent:t("update.whats_new")}));
      const r=renderCL(S.updateChangelog);
      if(r){const sc=el("div","as-banner-cl-scroll");sc.appendChild(r);sec.appendChild(sc);}
      updBanner.appendChild(sec);
    }

    // Actions
    const acts=el("div","as-banner-acts");
    const instB=el("button","as-btn as-btn-accent",{textContent:t("update.install_now")});
    instB.addEventListener("click",installUpd);
    const snzB=el("button","as-btn",{textContent:t("update.remind_later")});
    snzB.addEventListener("click",snooze);
    const ignB=el("button","as-btn as-btn-ghost",{textContent:t("update.ignore_version")});
    ignB.addEventListener("click",()=>{if(confirm(t("update.ignore_confirm",{ver:rem})))ignoreVer();});
    acts.append(instB,snzB,ignB);
    if(S.updateReleaseUrl)acts.appendChild(el("a","as-btn as-btn-link",{textContent:t("update.view_release"),href:S.updateReleaseUrl,target:"_blank"}));
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
      --as-shadow: 0 8px 32px rgba(0,0,0,.12);
    }

    /* FIX #12: Fallback for browsers without backdrop-filter */
    @supports not (backdrop-filter: blur(1px)) {
      :root { --as-bg: rgba(16,20,32,.98); --as-glass: none; }
      [data-as-theme="light"] { --as-bg: rgba(250,250,255,.98); }
    }

    #as-gear {
    position:fixed;right:16px;bottom:16px;z-index:2147483646;
    background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);
    border:1px solid var(--as-border);border-radius:50px;
    padding:10px 18px 10px 14px;
    font:600 13px/1 var(--as-font);color:var(--as-text);
    cursor:pointer;box-shadow:var(--as-shadow);
    display:flex;align-items:center;gap:8px;
    transition:all var(--as-t);user-select:none;
    }
    #as-gear:hover{transform:translateY(-2px);box-shadow:0 16px 48px rgba(0,0,0,.6);}
    #as-gear:active{transform:translateY(0);transition-duration:.1s;}
    .as-dot{width:9px;height:9px;border-radius:50%;background:var(--as-green);flex-shrink:0;transition:all .3s;}
    .as-dot.off{background:var(--as-red);}
    .as-dot.paused{background:var(--as-yellow);}
    .as-dot.update{background:var(--as-red);animation:as-pulse 1.5s infinite;}
    @keyframes as-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.5)}}

    #as-panel {
    position:fixed;right:16px;bottom:68px;width:400px;max-width:92vw;
    /* FIX #8: Better responsive height */
    max-height:min(580px,calc(100vh - 90px));
    overflow:hidden;z-index:2147483647;
    background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);
    border:1px solid var(--as-border);border-radius:var(--as-r);
    padding:0;font:13px/1.5 var(--as-font);color:var(--as-text);
    box-shadow:var(--as-shadow);
    opacity:0;visibility:hidden;transform:translateY(12px) scale(.97);
    transition:all .35s cubic-bezier(.2,.8,.2,1);
    display:flex;flex-direction:column;
    }
    #as-panel.as-open{opacity:1;visibility:visible;transform:translateY(0) scale(1);}

    .as-panel-hdr{display:flex;justify-content:space-between;align-items:center;padding:18px 20px 14px;flex-shrink:0;}
    .as-panel-title{font:700 17px/1.2 var(--as-font);margin:0;display:flex;align-items:center;gap:8px;}
    .as-ver{font:400 11px var(--as-font);color:var(--as-text2);background:var(--as-btn);padding:2px 8px;border-radius:20px;}
    .as-x{background:var(--as-btn);border:none;color:var(--as-text2);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;}
    .as-x:hover{background:var(--as-btn-h);color:var(--as-text);}
    .as-x:focus-visible{box-shadow:0 0 0 2px var(--as-accent);}

    .as-tabs{display:flex;gap:4px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;}
    .as-tabs::-webkit-scrollbar{display:none;}
    .as-tab{background:transparent;border:none;color:var(--as-text2);padding:7px 14px;font:600 12px var(--as-font);cursor:pointer;border-radius:20px;transition:all .2s;white-space:nowrap;position:relative;}
    .as-tab:hover{color:var(--as-text);background:var(--as-btn);}
    .as-tab.active{background:var(--as-accent);color:#fff;}
    .as-tab:focus-visible{box-shadow:0 0 0 2px var(--as-accent);}
    .as-tab-dot{position:absolute;top:4px;right:4px;width:6px;height:6px;border-radius:50%;background:var(--as-red);}

    .as-tabs-body{flex:1;min-height:0;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--as-border) transparent;padding:0 20px 12px;}
    .as-pane{display:none;animation:as-fi .25s ease;}
    .as-pane.active{display:block;}
    @keyframes as-fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}

    .as-card{background:var(--as-input);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:14px;margin-bottom:12px;}
    .as-card-title{font:600 11px/1 var(--as-font);color:var(--as-text2);text-transform:uppercase;letter-spacing:.8px;margin-bottom:12px;}
    .as-row{display:flex;justify-content:space-between;align-items:center;min-height:32px;margin-bottom:6px;}
    .as-row:last-child{margin-bottom:0;}
    .as-row-lbl{flex:1;padding-right:12px;font:500 13px var(--as-font);}

    .as-toggle{appearance:none;-webkit-appearance:none;width:40px;height:22px;background:var(--as-input-border);border:none;border-radius:20px;position:relative;cursor:pointer;outline:none;transition:background .3s;flex-shrink:0;margin:0;}
    .as-toggle::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;background:#fff;border-radius:50%;transition:transform .3s cubic-bezier(.4,0,.2,1);box-shadow:0 1px 4px rgba(0,0,0,.25);}
    .as-toggle:checked{background:var(--as-accent);}
    .as-toggle:checked::after{transform:translateX(18px);}
    .as-toggle:focus-visible{box-shadow:0 0 0 2px var(--as-accent);}

    .as-input{background:var(--as-input);color:var(--as-text);border:1px solid var(--as-input-border);border-radius:var(--as-rs);padding:7px 10px;font:13px var(--as-font);outline:none;transition:border .2s;min-width:0;}
    .as-input:focus{border-color:var(--as-accent);}
    .as-input:focus-visible{box-shadow:0 0 0 2px rgba(91,140,255,.3);}
    .as-input[type="number"]{width:72px;}

    .as-btn{background:var(--as-btn);color:var(--as-text);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:7px 14px;font:500 12px var(--as-font);cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;gap:4px;}
    .as-btn:hover{background:var(--as-btn-h);}
    .as-btn:disabled{opacity:.45;cursor:not-allowed;}
    .as-btn:focus-visible{box-shadow:0 0 0 2px var(--as-accent);}
    .as-btn-accent{background:var(--as-accent);color:#fff;border-color:var(--as-accent);font-weight:600;}
    .as-btn-accent:hover{background:var(--as-accent2);}
    .as-btn-ghost{background:transparent;border-color:transparent;color:var(--as-text2);font-size:11px;}
    .as-btn-ghost:hover{color:var(--as-text);background:var(--as-btn);}
    .as-btn-link{border:none;background:transparent;color:var(--as-accent);text-decoration:underline;padding:4px 8px;font-size:11px;}

    .as-footer{padding:12px 20px 16px;border-top:1px solid var(--as-border);display:flex;justify-content:space-between;align-items:center;gap:8px;flex-shrink:0;}
    .as-footer-status{font:500 12px var(--as-font);color:var(--as-text2);}
    .as-footer-acts{display:flex;gap:6px;}

    .as-upd-info{background:var(--as-input);border:1px solid var(--as-border);border-radius:var(--as-rs);padding:12px;margin-top:8px;font-size:12px;}
    .as-upd-row{display:flex;justify-content:space-between;align-items:center;padding:3px 0;}
    .as-upd-lbl{color:var(--as-text2);}
    .as-upd-val{font-weight:600;color:var(--as-text);}
    .as-upd-val.new{color:var(--as-red);}
    .as-upd-val.ok{color:var(--as-green);}
    .as-upd-bar{height:3px;background:var(--as-border);border-radius:2px;margin-bottom:8px;overflow:hidden;}
    .as-upd-bar-fill{height:100%;background:var(--as-accent);border-radius:2px;width:0%;transition:width .5s;}
    .as-upd-bar.ck .as-upd-bar-fill{width:100%;animation:as-ind 1.5s infinite;}
    @keyframes as-ind{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}

    .as-banner{position:fixed;top:20px;right:20px;width:380px;max-width:calc(100vw - 40px);z-index:2147483645;background:var(--as-bg);backdrop-filter:var(--as-glass);-webkit-backdrop-filter:var(--as-glass);border:1px solid var(--as-accent);border-radius:var(--as-r);box-shadow:0 16px 48px rgba(0,0,0,.5),0 0 0 1px rgba(91,140,255,.15);font:13px var(--as-font);color:var(--as-text);opacity:0;visibility:hidden;transform:translateY(-20px) scale(.95);transition:all .4s cubic-bezier(.2,.8,.2,1);overflow:hidden;}
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

    /* FIX #1: Toast container doesn't block clicks */
    .as-toasts{position:fixed;bottom:68px;left:50%;transform:translateX(-50%);z-index:2147483647;display:flex;flex-direction:column-reverse;align-items:center;gap:8px;pointer-events:none;}
    .as-toast{background:var(--as-bg-solid);color:var(--as-text);border:1px solid var(--as-border);border-radius:12px;padding:10px 22px;font:600 13px var(--as-font);box-shadow:0 8px 28px rgba(0,0,0,.45);opacity:0;transform:translateY(16px) scale(.92);transition:all .3s cubic-bezier(.2,.8,.2,1);pointer-events:none;white-space:nowrap;}
    .as-toast-in{opacity:1;transform:translateY(0) scale(1);}
    .as-toast-out{opacity:0;transform:translateY(-8px) scale(.92);}

    .as-cs-overlay{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.65);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .3s;}
    .as-cs-show{opacity:1;}
    .as-cs-box{background:var(--as-bg-solid);border:1px solid var(--as-border);border-radius:20px;padding:32px 40px;min-width:340px;max-width:90vw;box-shadow:0 20px 60px rgba(0,0,0,.5);}
    .as-cs-title{font:700 22px var(--as-font);color:var(--as-text);margin-bottom:24px;text-align:center;}
    .as-cs-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid var(--as-border);}
    .as-cs-row:last-of-type{border-bottom:none;}
    .as-cs-key{font:700 13px 'JetBrains Mono',monospace;color:var(--as-accent);background:var(--as-input);border:1px solid var(--as-input-border);border-radius:6px;padding:5px 12px;min-width:80px;text-align:center;}
    .as-cs-lbl{font:500 14px var(--as-font);color:var(--as-text);margin-left:24px;}
    .as-cs-hint{font:400 12px var(--as-font);color:var(--as-text2);text-align:center;margin-top:20px;}
    `;
    document.head.appendChild(s);
  }

  /* ─── Panel Builder ────────────────────────────────────── */
  function mkRow(label, input) {
    return el("div", "as-row", {}, [el("div", "as-row-lbl", {}, [label]), input]);
  }
  function mkToggle(key) {
    const i = el("input", "as-toggle", { type: "checkbox", checked: !!S[key] });
    i.dataset.sk = key;
    i.setAttribute("role", "switch");
    i.setAttribute("aria-label", key);
    i.addEventListener("change", () => {
      save({ [key]: i.checked });
      if (key === "updateCheckEnabled" && i.checked) checkUpd(true);
    });
      return i;
  }
  function mkNum(key, min, max, step = 1) {
    const i = el("input", "as-input", { type: "number", min, max, step, value: String(S[key]) });
    i.dataset.sk = key;
    const sv = (fin) => {
      const v = Number(i.value);
      if (!Number.isFinite(v)) return;
      const val = fin ? Math.min(max, Math.max(min, v)) : v;
      save({ [key]: val });
      if (fin) i.value = String(val);
    };
      i.addEventListener("input", () => sv(false));
      i.addEventListener("change", () => sv(true));
      i.addEventListener("blur", () => sv(true));
      return i;
  }
  function mkSel(key, opts) {
    const s = el("select", "as-input");
    opts.forEach(o => s.appendChild(el("option", "", { value: o.v, textContent: o.l })));
    s.value = S[key]; s.dataset.sk = key;
    s.addEventListener("change", () => save({ [key]: s.value }));
    return s;
  }
  function mkHotkey(key) {
    const i = el("input", "as-input", { type: "text", readOnly: true, value: fmtCombo(S[key] || "") });
    i.style.width = "110px"; i.style.cursor = "pointer";
    i.title = t("keys.click_hint");
    i.dataset.sk = key; i.dataset.cap = "0";
    const exit = () => { i.dataset.cap = "0"; i.value = fmtCombo(S[key] || ""); i.blur(); };
    i.addEventListener("focus", () => { i.dataset.cap = "1"; i.value = t("keys.press"); });
    i.addEventListener("click", () => i.focus());
    i.addEventListener("blur", () => { if (i.dataset.cap === "1") exit(); });
    i.addEventListener("keydown", (e) => {
      if (i.dataset.cap !== "1") return; e.preventDefault(); e.stopPropagation();
      if (e.key === "Escape") { exit(); return; }
      const c = evCombo(e); if (!c) return;
      const f = fmtCombo(c); save({ [key]: f }); i.value = f; exit();
    });
    return i;
  }
  function mkCard(title, rows) {
    const c = el("div", "as-card");
    if (title) c.appendChild(el("div", "as-card-title", { textContent: title }));
    rows.forEach(r => c.appendChild(r));
    return c;
  }

  function refreshUI() {
    if (!panel) return;
    document.documentElement.setAttribute("data-as-theme", S.uiTheme === "light" ? "light" : "dark");
    panel.querySelectorAll("[data-sk]").forEach(e => {
      const k = e.dataset.sk; if (document.activeElement === e) return;
      if (e.type === "checkbox") e.checked = !!S[k];
      else if (e.tagName === "SELECT") e.value = String(S[k]);
      else if (e.type === "text") e.value = fmtCombo(S[k] || "");
      else e.value = String(S[k]);
    });
      if (gear) {
        let txt, dot;
        if (!S.enabled) { txt = t("gear.off"); dot = "off"; }
        else if (isPaused()) { txt = t("gear.paused", { sec: Math.ceil(pauseMs() / 1000) }); dot = "paused"; }
        else { txt = t("gear.on"); dot = ""; }
        if (S.updateCheckEnabled && S.updateAvailable) dot = "update";
        if (gearTxt) gearTxt.textContent = txt;
        if (gearDot) gearDot.className = `as-dot ${dot}`;
      }
      if (pauseLabel) {
        pauseLabel.textContent = isPaused()
        ? t("pause.paused", { sec: Math.ceil(pauseMs() / 1000) })
        : t("pause.active");
      }
      if (sysTabBadge) sysTabBadge.style.display = S.updateCheckEnabled && S.updateAvailable ? "block" : "none";
      refreshUpdInfo();
  }

  function refreshUpdInfo() {
    if (!updInfo) return;

    // FIX #7: Clear children properly
    while(updInfo.firstChild) updInfo.removeChild(updInfo.firstChild);

    const fmtT = ts => { const n = Number(ts || 0); if (!n) return t("sys.never"); try { return new Date(n).toLocaleString(); } catch { return "?"; } };
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

    const acts = el("div", "as-footer-acts"); acts.style.marginTop = "10px";
    const ckB = el("button", "as-btn", { textContent: t("sys.check_now") });
    ckB.addEventListener("click", async () => {
      ckB.disabled = true; ckB.textContent = t("sys.checking");
      try { await checkUpd(true); } finally { ckB.disabled = false; ckB.textContent = t("sys.check_now"); }
    });
    acts.appendChild(ckB);
    if (has) {
      const iB = el("button", "as-btn as-btn-accent", { textContent: t("sys.install") });
      iB.addEventListener("click", installUpd); acts.appendChild(iB);
      if (S.updateReleaseUrl) acts.appendChild(el("a", "as-btn as-btn-link", { textContent: t("sys.release"), href: S.updateReleaseUrl, target: "_blank" }));
    }
    updInfo.appendChild(acts);
  }

  function buildPanel() {
    if (document.getElementById("as-gear")) return;
    injectCSS();

    gear = el("button", "", { id: "as-gear" });
    gearDot = el("span", "as-dot");
    gearTxt = el("span", "", { textContent: t("gear.on") });
    gear.append(gearDot, gearTxt);

    panel = el("div", "", { id: "as-panel" });

    const hdr = el("div", "as-panel-hdr");
    const titleArea = el("div", "as-panel-title", {}, [
      document.createTextNode(t("panel.title")),
                         el("span", "as-ver", { textContent: `v${SCRIPT_VERSION}` }),
    ]);
    const xBtn = el("button", "as-x", { textContent: "×" });
    xBtn.setAttribute("aria-label", "Close");
    xBtn.addEventListener("click", () => panel.classList.remove("as-open"));
    hdr.append(titleArea, xBtn);

    const tabsBar = el("div", "as-tabs");
    const tabsBody = el("div", "as-tabs-body");

    updInfo = el("div", "as-upd-info");
    const ioActs = el("div", "as-footer-acts", { style: { marginBottom: "8px" } });
    const expB = el("button", "as-btn", { textContent: t("sys.export") }); expB.addEventListener("click", exportS);
    const impB = el("button", "as-btn", { textContent: t("sys.import") }); impB.addEventListener("click", importS);
    ioActs.append(expB, impB);

    const tabs = [
      { label: t("tab.general"), panes: [
        mkCard(null, [
          mkRow(t("general.enable"), mkToggle("enabled")),
               mkRow(t("general.delay"), mkNum("delayMs", 0, 60000, 50)),
               mkRow(t("general.theme"), mkSel("uiTheme", [{ v: "dark", l: "Dark" }, { v: "light", l: "Light" }])),
               mkRow(t("general.pause_duration"), mkNum("pauseMinutes", 1, 180, 1)),
               mkRow(t("general.toasts"), mkToggle("showToasts")),
        ]),
      ]},
 { label: t("tab.skip"), panes: [
   mkCard(null, [
     mkRow(t("skip.intro"), mkToggle("skipIntro")),
          mkRow(t("skip.recap"), mkToggle("skipRecap")),
          mkRow(t("skip.credits"), mkToggle("skipCredits")),
          mkRow(t("skip.next"), mkToggle("skipNextEpisode")),
   ]),
 mkCard(null, [
   mkRow(t("skip.require_player"), mkToggle("requirePlayerContext")),
        mkRow(t("skip.jump_seconds"), mkNum("jumpSeconds", 1, 600, 1)),
 ]),
 ]},
 { label: t("tab.keys"), panes: [
   mkCard(null, [
     mkRow(t("keys.skip_intro"), mkHotkey("introSkipKey")),
          mkRow(t("keys.jump_back"), mkHotkey("introBackKey")),
          mkRow(t("keys.suppress"), mkHotkey("skipCurrentOnceKey")),
          mkRow(t("keys.toggle"), mkHotkey("toggleKey")),
          mkRow(t("keys.pause"), mkHotkey("pauseKey")),
          mkRow(t("keys.cheatsheet"), mkHotkey("cheatsheetKey")),
   ]),
 ]},
 { label: t("tab.system"), badge: true, panes: [
   mkCard(null, [
     mkRow(t("sys.debug"), mkToggle("debug")),
          mkRow(t("sys.update_check"), mkToggle("updateCheckEnabled")),
   ]),
 ioActs, updInfo,
 ]},
    ];

    let aBtn = null, aPane = null;
    tabs.forEach((tab, i) => {
      const btn = el("button", "as-tab", { textContent: tab.label });
      if (tab.badge) { sysTabBadge = el("span", "as-tab-dot"); sysTabBadge.style.display = "none"; btn.appendChild(sysTabBadge); }
      const pane = el("div", "as-pane", {}, tab.panes);
      if (i === 0) { btn.classList.add("active"); pane.classList.add("active"); aBtn = btn; aPane = pane; }
      btn.addEventListener("click", () => {
        aBtn?.classList.remove("active"); aPane?.classList.remove("active");
        btn.classList.add("active"); pane.classList.add("active");
        aBtn = btn; aPane = pane;
      });
      tabsBar.appendChild(btn); tabsBody.appendChild(pane);
    });

    pauseLabel = el("div", "as-footer-status", { textContent: t("pause.active") });
    const pauseB = el("button", "as-btn", { textContent: t("pause.btn") }); pauseB.addEventListener("click", () => doPause(S.pauseMinutes));
    const resB = el("button", "as-btn", { textContent: t("pause.resume") }); resB.addEventListener("click", doResume);
    const rstB = el("button", "as-btn as-btn-ghost", { textContent: t("sys.reset") });
    rstB.addEventListener("click", () => { if (confirm(t("reset.confirm"))) save(DEFAULTS); });
    const footer = el("div", "as-footer", {}, [pauseLabel, el("div", "as-footer-acts", {}, [pauseB, resB, rstB])]);

    panel.append(hdr, tabsBar, tabsBody, footer);
    gear.addEventListener("click", () => panel.classList.toggle("as-open"));
    document.addEventListener("click", e => {
      if (!panel.classList.contains("as-open")) return;
      if (panel.contains(e.target) || gear.contains(e.target)) return;
      panel.classList.remove("as-open");
    });
    document.body.append(gear, panel);
    createBanner();

    // FIX #13: Track timer for cleanup
    refreshTimer = setInterval(refreshUI, 1000);
    window.addEventListener("beforeunload", () => {
      if (refreshTimer) clearInterval(refreshTimer);
    }, { once: true });
      refreshUI();
  }

  /* ─── Hotkeys ──────────────────────────────────────────── */
  function setupKeys() {
    const skipBtn = () => {
      const b = document.querySelector('a[data-testid="skip-intro-button"],button[data-testid="skip-intro-button"]');
      if (!b || !isVis(b) || !canClick(b)) return false;
      const v = findVid(); if (v) lastIntroT = Math.max(0, v.currentTime || 0);
      markClick(b); b.click(); toast("toast.intro"); return true;
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
      suppressedBtn = f.el; toast("toast.suppressed"); updPlayerBtn(); return true;
    };
    const shouldIgnore = (tgt) => {
      if (!(tgt instanceof Element)) return false;
      if (tgt.closest("#as-panel,#as-gear,#as-banner,.as-cs-overlay")) return true;
      return tgt instanceof HTMLInputElement || tgt instanceof HTMLTextAreaElement
      || tgt instanceof HTMLSelectElement || tgt.isContentEditable;
    };

    document.addEventListener("keydown", e => {
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
    }, true);
  }

  /* ─── Boot ─────────────────────────────────────────────── */
  function boot() {
    buildPanel(); startObs(); setupKeys(); setupFS(); startUpdChecker(); scan();
    log("v" + SCRIPT_VERSION, S);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
