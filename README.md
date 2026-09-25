# PROJECT BLACKWING

Privates Command Center im Militär-Look. Statische Webseite mit Supabase als Datenbank.

- **Kontakte**: Familie und Freunde mit Adresse, Telefonnummern, Fahrzeugen und Kennzeichen, Geburtstagserinnerung, Suche, JSON-Export und -Import. Die Adresse lässt sich per Klick auf der Lagekarte anzeigen (OpenStreetMap-Suche).
- **Lagekarte**: Live-Flüge (adsb.lol), Schiffe (AISStream.io, kostenloser Key nötig), Erdbeben (USGS), ISS, Tag/Nacht-Grenze. Flüge, Schiffe, ISS und Adresssuche laufen über Vercel-Funktionen in `api/`.
- **Admin**: eigenes Profil, Heimatbasis per Adresssuche (Startpunkt der Karte), AIS-Key

## Daten und Zugang
Die Daten liegen im Supabase-Projekt `nachtfalke` (eu-central-1) in den Tabellen `bw_contacts` und `bw_config`.
Direkt kommt niemand an die Tabellen heran. Zugriff gibt es nur über Datenbankfunktionen (`bw_load`, `bw_save_contact` …), die den Zugangscode prüfen.
Der erste eingegebene Code wird als bcrypt-Hash gespeichert und gilt dauerhaft. Nach 10 Fehlversuchen ist der Zugang 15 Minuten gesperrt.
Code vergessen? Im Supabase SQL-Editor `delete from bw_config;` ausführen. Das löscht auch Profil und Einstellungen, die Kontakte bleiben erhalten. Danach setzt die nächste Eingabe einen neuen Code.

## Deployment (Vercel)
Vercel → Add New → Project → dieses Repo importieren → Framework "Other", kein Build-Befehl → Deploy.

AIS-Key alternativ als Vercel-Umgebungsvariable `AISSTREAM_KEY` setzen (Settings → Environment Variables).
