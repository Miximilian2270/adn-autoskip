# ADN Auto Skip with Settings

Diese Dokumentation bezieht sich auf:
- Script: `adn-auto-skip-with-settings.user.js`
- Version: `1.1.0`

## Zweck
Das Userscript klickt auf ADN automatisch nur diese bekannten Skip-Buttons:
- `skip-intro-button`
- `skip-recap-button`
- `skip-ending-button`
- `next-video-button`

Damit ist es auf ADN fokussiert (keine Crunchyroll-Funktion).

## Installation (kurz)
1. Tampermonkey Dashboard öffnen.
2. Script öffnen oder neu erstellen.
3. Inhalt aus `adn-auto-skip-with-settings.user.js` einfügen.
4. Speichern (`Ctrl+S`).
5. ADN-Seite neu laden.

## Bedienung
Auf ADN unten rechts:
- `SKIP ON`: Auto-Skip aktiv
- `SKIP OFF`: global deaktiviert
- `SKIP PAUSED`: temporär pausiert

Klick auf den Button öffnet das Einstellungs-Panel.

## Einstellungen im Panel
- `Enable Auto Skip`
  - Aktiviert/deaktiviert Auto-Skip global.
- `Delay (ms)`
  - Verzögerung vor dem Klick auf den Skip-Button.
  - Beispiel: `3500` = 3,5 Sekunden.
- `Pause duration (min)`
  - Dauer für temporäres Pausieren.
  - Wird von `Pause` und `F9` genutzt.
- `Skip Intro`
  - Intro-Button wird automatisch geklickt.
- `Skip Recap`
  - Recap-Button wird automatisch geklickt.
- `Skip Credits/Ending`
  - Outro/Ending-Button wird automatisch geklickt.
- `Skip Next Episode`
  - Nächste-Folge-Button wird automatisch geklickt.
- `Require player context`
  - Zusätzlicher Filter: Button muss in einem typischen Video/Player-Kontext liegen.
  - Für die aktuelle ADN-strict-Variante normalerweise nicht nötig.
- `Debug logs`
  - Schreibt Logs in die Browser-Konsole (`[ADN AutoSkip] ...`).
- `Toggle key`
  - Hotkey für global ON/OFF (Standard: `F8`).
- `Pause key`
  - Hotkey für Pause/Resume (Standard: `F9`).

## Buttons im Panel
- `Reset`
  - Setzt alle Einstellungen auf Standardwerte zurück.
- `Pause`
  - Pausiert Auto-Skip für die eingestellte `Pause duration (min)`.
- `Resume now`
  - Hebt die Pause sofort auf.
- `Close`
  - Schließt das Panel.

## Hotkeys
- `F8` (Standard)
  - Schaltet Auto-Skip global ein/aus.
- `F9` (Standard)
  - Schaltet zwischen temporär pausiert und aktiv um.

Hinweis: Hotkeys greifen nicht, wenn du gerade in ein Eingabefeld tippst.

## Speicherung
Einstellungen werden automatisch gespeichert (kein Save-Button nötig).
Technisch: `localStorage` unter dem Schlüssel:
- `ADN_AUTO_SKIP_SETTINGS_V1`

## Typische Fragen
- Warum springt ein Wert zurück?
  - Sollte mit aktueller Version nicht mehr passieren.
  - Falls doch: Seite neu laden, Wert erneut setzen, Tampermonkey-Script speichern.
- Warum wird nicht geklickt?
  - Prüfen:
    - Script aktiv?
    - `Enable Auto Skip` an?
    - Nicht pausiert (`SKIP PAUSED`)?
    - Kategorie (Intro/Recap/Ending/Next) aktiv?
    - `Delay (ms)` nicht extrem hoch?
- Warum wird zu früh geklickt?
  - `Delay (ms)` erhöhen (z. B. 3500 oder höher).

## Update-Hinweis
Wenn ADN neue `data-testid`-Namen einführt, müssen diese im Script ergänzt werden.
