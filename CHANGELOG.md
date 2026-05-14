# 🛡️ CrowdSec Threat Map — Changelog

---

## v1.4.2 — 14.05.2026

### Image / Metadaten
- `Dockerfile`: `org.opencontainers.image.version` auf **1.4.2** (entspricht Dashboard, Entrypoint und ghcr-Image)
- `org.opencontainers.image.source` auf Repo-URL **crowdsec-threat-map-docker** korrigiert

### Unraid / Community Apps
- Docker-Template: `Registry` auf `https://ghcr.io`, Standard `--group-add 281` statt 999, Hinweis zur GID-Prüfung in `Overview` und Docker-Socket-Beschreibung
- Doppelte `unraid/ca_profile.xml` entfernt (Profil nur noch `ca_profile.xml` im Repo-Root)
- `unraid/README.md`: Raw-URL auf Repo `crowdsec-threat-map-docker` korrigiert, Extra-Params-Doku angepasst
- `README.md` und `docker/docker-compose.yml`: Docker-GID-Beispiele und Kommentare an Unraid-typische Werte angeglichen

---

## v1.4.1 — 22.04.2026

### 〰️ Linien-Toggle
- Neuer **LINIE**-Button in Desktop-Sidebar und Mobile-Tab-Leiste
- Blendet alle Angriffspfeile UND die drei Radar-Ringe um den Serverstandort ein/aus
- Der blaue Serverstandort-Punkt selbst bleibt immer sichtbar
- Bugfix: statische Linien (`ANIM AUS`) wurden durch undefinierte `arcsVisible`-Variable nie gezeichnet — jetzt durch `linesOn=true` ersetzt und korrekt initialisiert

### 🛡️ Dynamische IP-Whitelist (eingebaut im Exporter)
- Neuer Hintergrund-Thread im Exporter — läuft alle 15 Minuten automatisch
- Ermittelt die aktuelle öffentliche IP (ifconfig.me / ipify / amazonaws als Fallback)
- Bei IP-Änderung: Whitelist-YAML neu schreiben → CrowdSec neustarten → alten Ban entfernen
- Bei unveränderter IP: trotzdem prüfen ob ein aktiver Ban existiert und ggf. entfernen
- Neue Konfigurationsvariablen: `WHITELIST_ENABLED`, `WHITELIST_FILE`, `WHITELIST_INTERVAL`
- Neuer Endpunkt `/whitelist-status` gibt aktuellen Status als JSON zurück
- **Whitelist-Badge** im Dashboard: Desktop (Sidebar unten) + Mobile (Stats-Leiste)
  - 🟢 Grün = IP unverändert, ok
  - 🔵 Cyan = IP wurde aktualisiert
  - 🔴 Rot = Fehler
- `ConnectionResetError` (Browser schließt Tab während Request läuft) wird jetzt still unterdrückt

### 📐 Responsive Controls
- Alle Buttons in der Kontrollzeile schrumpfen mit der Fenstergröße (`flex-shrink:1`, `clamp`)
- `THEME:`-Label verschwindet automatisch wenn die Sidebar zu schmal wird (ResizeObserver, < 210px)
- Theme-Buttons füllen die verfügbare Breite gleichmäßig aus
- Font-Größen aller Controls per `clamp` an Viewport-Breite angepasst

---

## v1.4.0 — 21.04.2026

### 🔓 Unban komplett überarbeitet
- Unban löscht jetzt **beide** — `decisions` UND `alerts` (`cscli decisions delete` + `cscli alerts delete`)
- Damit verschwindet die IP auch nach Exporter-Neustart dauerhaft aus dem Feed
- `localUnbanned` Set im Frontend verhindert Wiederanzeige innerhalb der Session

### 🚫📋 Ban-Status-Anzeige im Feed
- Neues `active_ban` Label im Exporter — erkennt ob noch eine aktive Decision existiert
- **🚫** (leuchtend) = aktiver Ban vorhanden — Klick entsperrt Decision + Alert
- **📋** (ausgegraut) = nur Alert/Historie — kein aktiver Ban mehr, nur Eintrag löschen
- Tooltip erklärt was beim Klick passiert
- Beide Icons immer sichtbar, das nicht zutreffende ist transparent ausgegraut

### 🗺️ Karten-Verbesserungen
- **Stadtname-Labels** beim Reinzoomen — erscheinen ab Zoom-Level 2.0, einmal pro Stadt
- **Ländernamen zentriert** in der Landesmitte (statt am Angriffspunkt)
- `city` Label jetzt auch in `cs_attack_flow` Metriken

### ⚙️ Exporter-Verbesserungen
- `active_ban` Field in `cs_lapi_realtime` Metriken
- `city` Field in `cs_attack_flow` Metriken
- Unban-Endpunkt führt jetzt beide Delete-Befehle aus

---

## v1.3.0 — 21.04.2026

### 📱 Mobile komplett überarbeitet
- Karte zoomt beim Laden automatisch auf alle Angriffspunkte (Auto-Fit mit Minimum-Zoom)
- Kein Leerraum mehr zwischen Legende und Feed-Sheet
- Feed-Bereich füllt jetzt den gesamten verfügbaren Platz aus
- Legende zentriert, kompakt in einer Zeile
- `KLICK AUF PUNKT = DETAILS` auf Mobile ausgeblendet

### 🔓 IP-Unban direkt aus dem Feed
- Neuer 🔓-Button bei jedem Feed-Eintrag
- Doppelte Bestätigung vor dem Entsperren
- Unban läuft via `docker exec crowdsec cscli decisions delete --ip`
- Erfolg/Fehler wird direkt im Button angezeigt
- Feed wird nach erfolgreichem Unban automatisch neu geladen

---

## v1.2.5 — 21.04.2026

- Auto-Zoom auf alle sichtbaren Angriffspunkte beim Laden
- Favicon (Shield-Icon in Cyan)
- Version-Badge auf Mobile sichtbar

---

## v1.2.0 — 20.04.2026

### ✨ Neue Features
- 🔍 **Feed-Suche** — Echtzeit-Filter nach IP, Land, Stadt, Szenario, ASN
- ⚡ **Szenario-Filter** — Klick auf Szenario filtert Karte + Feed
- 🌍 **Land-Filter** — Klick in Top 10 filtert alles auf ein Land
- 🏷️ **Filter-Chips** — aktive Filter als klickbare Badges mit ✕ zum Entfernen
- 📊 **Sparkline** — Angriffe/Stunde als Minidiagramm im Feed-Tab
- 🗺️ **Ländernamen auf der Karte** — zoomskaliert, in Akzentfarbe
- 🫧 **Dot-Clustering** — nahe Punkte zusammengefasst, verschwindet beim Reinzoomen
- 🎨 **4 Farbthemen** — Cyan (Standard) / Alarm-Rot / Matrix-Grün / Amber
- 🔊 **Sound-Alarm** — optionaler Piepton bei neuen 20+-Angriffen
- 📥 **CSV-Export** — kompletten Feed als Datei herunterladen

### 🎨 Design
- Header entfernt — Titel und Stats direkt in der Sidebar
- Titel permanent auf der Karte zentriert oben
- Theme-Buttons als eigene Zeile in der Sidebar

---

## v1.1.0 — 20.04.2026

### ✨ Neue Features
- Stadt-Anzeige im Feed, Tooltip und Context-Menü
- Auto-Fit Zoom beim ersten Laden
- ⌂-Reset-Button springt zur Fit-Ansicht zurück
- `scaleExtent` auf `[0.1, 25]` für Weltkarten-Zoom möglich

### 🐛 Bugfixes
- Cluster-Größe beim Reinzoomen korrigiert
- Karte verschwindet beim Reinzoomen nicht mehr

---

## v1.0.0 — Initiale Version

### 🚀 Features
- Weltkarte mit animierten Angriffspfeilen (D3.js NaturalEarth-Projektion)
- Live-Feed mit Pagination (20 Einträge/Seite)
- Top 10 / Alle Länder in der Sidebar
- Zoom, Pan, Dot-Klick mit Context-Menü
- IP-Lookups: CrowdSec CTI, Shodan, Censys, RIPE, RIPEstat, Criminal IP
- Sprache DE/EN umschaltbar
- Animations-Toggle (Arc-Pfeile)
- Farbcodierung nach Angriffsanzahl (Grün / Gelb / Orange / Rot)
- Mobile Bottom-Sheet mit Feed, Top 10, Alle

---

© kabelsalatundklartext | https://github.com/kabelsalatundklartext/crowdsec-threat-map-docker
GPL-3.0
