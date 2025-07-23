# Web-Anwendung - Praxisprojekt-2025
## Konzeption, UX-orientierte Gestaltung und prototypische Umsetzung einer Selfie-basierten Webanwendung zur visuellen Selbstbeobachtung mit Rückschaufunktion

Dieses Projekt ist Teil des Praxisprojekts von Christian Noss und hat das Ziel, eine eigenständige Web-Anwendung zu entwickeln, die Nutzer:innen ermöglicht, täglich ein Selfie aufzunehmen und ihren persönlichen Fortschritt über eine visuelle Timeline zu dokumentieren. Nach einer definierten Anzahl an Aufnahmen wird ein animiertes Video erstellt, das die individuelle Entwicklung über Zeit sichtbar macht. Die Lösung verbindet Self-Tracking mit motivierender visueller Rückmeldung und bietet eine einfache, plattformunabhängige Nutzung direkt im Browser. <br>

[Projektseite - Christian Noss](https://cnoss.github.io/thesis/) <br>

## Dokumentation & Ressourcen

Wiki: Detaillierte technische Dokumentation und Anleitungen zur Nutzung der Anwendung findest du im [Projekt-Wiki](https://github.com/cosimazink/praxisprojekt-2025/wiki) <br>
Exposé: [Exposé ‐ Web‐Anwendung zur Selfie-Dokumentation](https://github.com/cosimazink/praxisprojekt-2025/wiki/Exposé) <br>
Weekly Documentation: [Wöchentliche Dokumentation der Arbeit](https://github.com/cosimazink/praxisprojekt-2025/wiki/Weekly-Documentation) <br>
Kanban Board: [Kanban Board mit Issues für das Praxisprojekt](https://github.com/users/cosimazink/projects/1) <br>
Miro-Board: Weitere Details und die visuelle Darstellung des Projekts findest du auf dem [Miro-Board](https://miro.com/welcomeonboard/bFZ4bWxMd0VHU0Fmb3R2K1U0NFpEWjA4ejVSSENLVFhWMm52VVlWbDF6OXpiUnRRVk1sSVJ0aWI1Lzl4VktHbmJHQVU4MkxLUCtEN1ErSzlnZ0tKajcvUFg4SHhoWngyZ0xsVnZrUm9kRFYzTUk1TlU0ek50NUtub0l2VkFkbjRyVmtkMG5hNDA3dVlncnBvRVB2ZXBnPT0hdjE=?share_link_id=965112996615)

## Nutzungsanleitung
### Für die Nutzung von Mira ist es notwenig Node.js inklusive Express.js und FFmpeg zu intallieren. <br>
Installiere die Node.js-Pakete (inkl. Express): <br>
`npm install` <br>
Installiere FFmpeg: <br>
`brew install ffmpeg`<br>

### Den Quellcode kann man nach den Installationen über folgenden Befehl ausführen: 
`node server.js` <br>
Abrufbar im Browser unter: <br>
http://localhost:3000/

## Nutzungshinweise

**Tägliches Selfie aufnehmen** <br>
Auf der Startseite wird über den Button „Heutiges Selfie aufnehmen“ ein Kamerazugriff ausgelöst. Nach Bestätigung wird das Bild im lokalen Uploads-Ordner gespeichert.<br>
**Recap-Video erstellen** <br>
Mit dem Button „Recap-Video erstellen“ lässt sich aus allen Selfies des aktuellen Monats ein Zeitraffer-Video generieren (basierend auf FFmpeg im Backend). Der Monat muss mindestens 15 Selfies enthalten, um ein Video erstellen zu können. <br>
**Selfie-Übersicht anzeigen** <br>
Im Kalenderbereich werden Selfies der ersten Woche angezeigt, optional können durch „Mehr anzeigen“ alle Tage eingeblendet werden. <br>
**Fortschrittsanzeige** <br>
Ein Kreisdiagramm visualisiert den Fortschritt im aktuellen Monat anhand der gespeicherten Selfies.

## Dateiübersicht

Für eine einfache Orientierung im Code folgt eine Übersicht der wichtigsten Dateien. <br>

- **POCs**: Die einzelnen Umsetzungen der Proof-of-Concepts zur Machbarkeitsprüfung einzelner Funktionen (Bildaufnahme, Videoerstellung, Speicherung).
- **src**: Hauptverzeichnis für alle clientseitigen Ressourcen der Webanwendung.
  - **assets**: Logos und Icons für das UI.
  - **fonts**: Einbindung der verwendeten Schriftarten.
  - **scripts**: JavaScript-Funktionen zur Steuerung der Anwendung.
    - **burger-menu.js**: Öffnet und schließt das Menü.
    - **overview.js**: Logik zur Anzeige und Navigation der Selfie-Übersicht.
    - **recapvideo.js**: Erzeugt Recap-Videos aus gespeicherten Bildern.
    - **selfie.js**: Steuerung der Selfie-Aufnahme und -Speicherung.
    - **watch.js**: Anzeige und Wiedergabe von Recap-Videos.
  - **styles**: CSS-Dateien zur Gestaltung der Benutzeroberfläche.
    - **base.css**: Grundlegende Styles.
    - **combined.css**: Zusammengeführte CSS-Datei für den Produktivbetrieb.
    - **fonts.css**: Definitionen für verwendete Schriftarten.
    - **icons.css**: Stile für eingesetzte Icon-Sets.
    - **overview.css, recapvideo.css, selfie.css, watch.css**: Spezifische Styles für die jeweiligen Views.
    - **reset.css**: CSS-Reset für konsistentes Rendering.
    - **variables.css**: Zentrale Definition von CSS-Variablen.
**HTML-Dateien:**
  - **overview.html**: Übersicht aller Selfies.
  - **recapvideo.html**: Benutzeroberfläche zur Erstellung eines Zeitraffervideos.
  - **selfie.html**: Aufnahmefunktion für Selfies.
  - **watch.html**: Galerie zur Betrachtung bereits generierter Videos.
- **uploads**: Serververzeichnis zum Speichern der aufgenommenen Selfies, sortiert nach Nutzer.
- **videos**: Ordner für automatisch generierte Recap-Videos.
- **server.js**: Serverseitiger Code zur Dateiverwaltung, Videoerstellung und Routensteuerung.

## Contributers
[Cosima Hiromi Zink](https://github.com/cosimazink)
