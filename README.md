# Shopware Orders – Projekt-README

Dieses Repository enthält eine Shopware-6-Instanz mit Fokus auf Bestellprozesse, externe Bestellungen (Marktplätze) und Lieferzeit-Management über eigene Plugins.

## Voraussetzungen

- Docker + Docker Compose
- `make`
- optional: `composer` (wenn Befehle außerhalb des Containers ausgeführt werden sollen)

## Schnellstart

Aus dem Projektverzeichnis:

```bash
make up
make setup
```

Danach in den Web-Container wechseln:

```bash
make shell
```

## Verfügbare `make`-Kommandos

Folgende Kommandos sind im `Makefile` hinterlegt:

- `make up` – startet die Container im Hintergrund.
- `make stop` – stoppt die Container, ohne sie zu entfernen.
- `make down` – stoppt und entfernt die Container.
- `make shell` – öffnet eine Bash im `web`-Container.
- `make watch-storefront` – startet den Storefront-Watch-Modus.
- `make watch-admin` – startet den Watch-Modus für die Administration.
- `make build-storefront` – baut die Storefront-Assets.
- `make build-administration` – baut die Admin-Assets.
- `make setup` – installiert Composer-Abhängigkeiten und führt `system:install` mit Datenbank-Neuaufbau aus.

Hinweis: Ein Aufruf von `make` ohne Ziel nutzt die Standard-`help`-Target.

## Enthaltene Plugins (`custom/plugins`)

### 1) ExternalOrders
- **Technischer Name**: `ExternalOrders`
- **Kurzbeschreibung**: Zentrale Administrationsübersicht für externe Bestellungen aus Marktplätzen.
- **Funktionen**: Kanalfilter, Suche, Detailansicht, Statushistorie und aggregierte Kennzahlen.

### 2) LieferzeitenAdmin
- **Technischer Name**: `LieferzeitenAdmin`
- **Kurzbeschreibung**: Administrationsmodul zur Steuerung von Lieferzeiten-Prozessen.
- **Funktionen**: Order-/Task-Übersichten, Sync-Endpoints, Bearbeitungs-Endpunkte, Statistiken, Notifications und Demo-Daten.

### 3) Lieferzeit
- **Technischer Name**: `Lieferzeit`
- **Kurzbeschreibung**: Zusätzliches Lieferzeit-Plugin mit administrativem Schwerpunkt.
- **Funktionen**: Plugin-Grundstruktur und mehrsprachige Admin-Einbindung.

### 4) SwagExtensionStore
- **Technischer Name**: `SwagExtensionStore`
- **Kurzbeschreibung**: Shopware-Store-Anbindung direkt in der Administration.
- **Funktionen**: Erweiterungen/Themes entdecken und verwalten.

### 5) SwagPlatformDemoData
- **Technischer Name**: `SwagPlatformDemoData`
- **Kurzbeschreibung**: Import von Shopware-Demodaten.
- **Wichtig**: Nicht für produktive Systeme empfohlen, da bestehende Daten beeinflusst/überschrieben werden können.

### 6) SwagPayPal
- **Technischer Name**: `SwagPayPal`
- **Kurzbeschreibung**: PayPal-Integration für Shopware 6.
- **Funktionen**: PayPal Checkout inkl. zusätzlicher Zahlungs-/Express-Optionen.

## Screenshots im `docs`-Bereich

Im `docs`-Bereich sind Screenshots zur Orientierung für die Fach- und Admin-Nutzung vorgesehen. Typischerweise zeigen diese Bilder:

- die **Übersichtsseite externer Bestellungen** mit Filtern und Kennzahlen,
- die **Detailansicht einer Bestellung** (Kunde, Zahlung, Versand, Positionen),
- sowie **Lieferzeiten-Ansichten** mit Aufgaben, Status und Statistikbezug.

Damit ist für neue Teammitglieder schnell erkennbar, welche Maske zu welchem Prozess gehört und wo zentrale Funktionen im Admin erreichbar sind.

## Nützliche Plugin-Kommandos

Plugins anzeigen:

```bash
bin/console plugin:list
```

Plugin-Liste aktualisieren + Plugin installieren/aktivieren:

```bash
bin/console plugin:refresh
bin/console plugin:install --activate <TechnischerPluginName>
```

Plugin aktualisieren:

```bash
bin/console plugin:update <TechnischerPluginName>
```

Migrationen ausführen:

```bash
bin/console database:migrate --all
```

## Relevante Verzeichnisse

- `custom/plugins/` – alle projektspezifischen und mitgelieferten Shopware-Plugins
- `bin/` – Build-/Watch-/CLI-Helferskripte
- `config/` – Symfony-/Shopware-Konfiguration
- `public/` – Web-Root / Entry-Point
