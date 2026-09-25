# PROJEKT NACHTFALKE

Privates Lagezentrum im Militär-Look. Läuft komplett im Browser, ohne Server. Alle Daten bleiben in `localStorage`.

- **Kontakte**: Familie und Freunde mit Adresse, Telefonnummern, Fahrzeugen und Kennzeichen, Geburtstagserinnerung, Suche, JSON-Export und -Import, Adresse per Klick auf der Lagekarte anzeigen (OpenStreetMap-Suche)
- **Lagekarte**: Live-Flüge (OpenSky), Schiffe (AISStream.io, kostenloser API-Key nötig), Erdbeben (USGS), ISS, Tag/Nacht-Grenze
- **Admin**: eigenes Profil, Kartenmittelpunkt, API-Key, Passphrase ändern

Start: `index.html` öffnen oder `python3 -m http.server` ausführen und `http://localhost:8000` aufrufen.
Hinweis: Die Passphrase ist nur eine Sichtsperre, die Daten werden nicht verschlüsselt. Mach regelmäßig einen Export als Backup.
