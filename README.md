# PROJEKT NACHTFALKE

Privates Lagezentrum im Militär-Look. Statische Webseite mit Supabase als Datenbank.

- **Kontakte**: Familie und Freunde mit Adresse, Telefonnummern, Fahrzeugen und Kennzeichen, Geburtstagserinnerung, Suche, JSON-Export und -Import. Die Adresse lässt sich per Klick auf der Lagekarte anzeigen (OpenStreetMap-Suche).
- **Lagekarte**: Live-Flüge (OpenSky), Schiffe (AISStream.io, kostenloser API-Key nötig), Erdbeben (USGS), ISS, Tag/Nacht-Grenze
- **Admin**: eigenes Profil, Kartenmittelpunkt, API-Key, Passwort ändern

## Daten
Die Daten liegen im Supabase-Projekt `nachtfalke` (eu-central-1) in den Tabellen `contacts` und `profiles`.
Row Level Security sorgt dafür, dass jeder angemeldete Benutzer nur seine eigenen Zeilen sieht.
Der Publishable Key in `app.js` ist öffentlich gedacht. Den Schutz übernimmt RLS.

## Deployment (Vercel)
Vercel → Add New → Project → dieses Repo importieren → Framework "Other", kein Build-Befehl → Deploy.

Danach in Supabase → Authentication → URL Configuration die Vercel-URL als Site URL eintragen.
Wenn dein Konto angelegt ist: Authentication → Sign In / Providers → "Allow new users to sign up" ausschalten.
