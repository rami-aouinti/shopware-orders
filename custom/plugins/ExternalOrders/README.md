# External Orders (Externe Bestellungen)

## Verbindliche Lieferzeit-Governance

Für fachliche Lieferzeit-Entscheidungen (Kernregeln, Datenmodelle, API-Verträge) ist `LieferzeitenAdmin` führend.
Die verbindliche Regelung steht in `../LieferzeitenAdmin/docs/plugin-governance.md`.


## Überblick
Das Plugin **External Orders** erweitert die Shopware-Administration um eine zentrale Übersicht für externe Bestellungen aus Marktplätzen. Es bietet Kanalauswahl, Filter und eine Detailansicht, um Bestellungen schnell zu finden und zu analysieren.

## Funktionsumfang
- **Bestellübersicht** mit Suchfeld, Statusanzeige und aggregierten Kennzahlen.
- **Kanalfilter** für verschiedene Marktplätze (z. B. B2B, eBay, Kaufland).
- **Detailansicht** inklusive Kunden-, Zahlungs-, Liefer- und Zusatzdaten.
- **Statushistorie** und Positionen je Bestellung.

## Anforderungen
- Shopware 6 (Platform)

## Installation
1. Plugin in das Verzeichnis `custom/plugins/ExternalOrders` legen.
2. Plugin in der Administration installieren und aktivieren.

## Update & Migration (CLI)
Wenn das Plugin aktualisiert wurde (z. B. neue Version aus dem Repository), können die Schritte per CLI so aussehen:

1. Plugin-Informationen neu einlesen:
   ```bash
   bin/console plugin:refresh
   ```
2. Plugin aktualisieren:
   ```bash
   bin/console plugin:update ExternalOrders
   ```
3. Datenbank-Migrationen ausführen (alle Plugins + Core):
   ```bash
   bin/console database:migrate --all
   ```
   Optional nur für dieses Plugin:
   ```bash
   bin/console database:migrate --identifier ExternalOrders
   ```

## Nutzung
Nach der Aktivierung erscheint in der Administration unter **Bestellungen** ein neuer Menüpunkt. Dort können externe Bestellungen eingesehen und nach Kanal oder Suchbegriff gefiltert werden.

### SAN6 Versandstrategie `filetransferurl`
- Bei der Strategie `filetransferurl` erzeugt das Plugin für jeden Export eine signierte Download-URL (`api.external-orders.export.file-transfer`).
- Diese URL ist explizit für Machine-to-Machine-Zugriffe ohne Admin-API-Login freigegeben (`auth_required=false`, keine ACL).
- Der Schutz erfolgt ausschließlich über den signierten Token in der URL (HMAC-Signatur + Ablaufzeit).
- Gültiger Token: Rückgabe `200` mit `Content-Type: application/xml` und Export-XML.
- Ungültiger oder abgelaufener Token: Rückgabe `404`.

## Validierung in Integration / Preprod (SAN6 `filetransferurl`)

Diese Vorgehensweise validiert das Verhalten der signierten URL außerhalb des internen Shopware-Netzwerks.

### 1) Signierte URL über `TopmSan6OrderExportService` erzeugen

1. Sicherstellen, dass in der Plugin-Konfiguration die Versandstrategie `filetransferurl` gesetzt ist.
2. Export über die Admin-API auslösen (ruft `TopmSan6OrderExportService::exportOrder()` auf, erzeugt signierte URL und übermittelt sie an SAN6):
   ```bash
   curl -sS -X POST "https://<shop-domain>/api/_action/external-orders/export/<orderId>"      -H "Authorization: Bearer <admin-api-token>"      -H "Content-Type: application/json"
   ```
3. Signierte URL aus dem Trace der ausgehenden Anfrage an SAN6 entnehmen (Outbound-Proxy/WAF/SAN6-Applikationslog).
   - Erwartetes Format: `https://<shop-domain>/topm-export/<token>`.

CLI-Alternative (direkt über `exportId`):

```bash
bin/console external-orders:export:generate-signed-url <exportId> --validate-exists
```

Optional: benutzerdefinierte TTL für Expiration-Tests:

```bash
bin/console external-orders:export:generate-signed-url <exportId> --expires-in=30 --validate-exists
```

### 2) URL von außen testen (außerhalb internes Shopware-Netz)

Von einem externen Host (z. B. ohne VPN, öffentlicher Runner usw.):

```bash
curl -i "https://<shop-domain>/topm-export/<token>"
```

Erwartetes Ergebnis:
- HTTP `200 OK`
- Header `Content-Type: application/xml; charset=utf-8`
- Nicht-leerer XML-Body (exportierter Payload)

### 3) Ungültigen / abgelaufenen Token testen

#### Ungültiger Token
```bash
curl -i "https://<shop-domain>/topm-export/<token_invalide>"
```

Erwartet: HTTP `404 Not Found`.

#### Abgelaufener Token
Der signierte Token läuft nach ca. 10 Minuten (TTL 600 s) ab. Exakt dieselbe URL nach Ablauf erneut aufrufen:

```bash
curl -i "https://<shop-domain>/topm-export/<token_expire>"
```

Erwartet: HTTP `404 Not Found`.

### 4) Reverse Proxy und Base URL prüfen (`core.basicInformation.shopwareUrl`)

Der Service baut die signierte URL auf Basis von `core.basicInformation.shopwareUrl` (Fallback: `APP_URL`). Dieser Wert muss öffentlich routbar sein.

Konfigurierten Wert prüfen:

```sql
SELECT configuration_value
FROM system_config
WHERE configuration_key = 'core.basicInformation.shopwareUrl';
```

Infra-Konformitätskriterien:
- öffentlich auflösbare Domain (externes DNS),
- gültige TLS-Terminierung am Reverse Proxy (`https`),
- Routing zu Shopware für `GET /topm-export/{token}`,
- konsistente Host/Proto-Weitergabe (`X-Forwarded-Host`, `X-Forwarded-Proto`) passend zur öffentlichen URL,
- keine WAF/CDN-Blockade für diese Machine-to-Machine-Route.

TLS-Prüfung von externem Host:

```bash
openssl s_client -connect <shop-domain>:443 -servername <shop-domain> </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates
```

### 5) Infrastruktur-Voraussetzungen (Checkliste)

- `core.basicInformation.shopwareUrl` zeigt auf die finale öffentliche URL.
- Reverse Proxy veröffentlicht `/topm-export/*` ohne zusätzliche Authentifizierung.
- Ausgehende Verbindungen zu SAN6 sind erlaubt (DNS/443).
- Serverzeit ist per NTP synchronisiert (vermeidet falsche „Token abgelaufen“-Meldungen).
- `APP_SECRET` ist über alle Knoten stabil (bei Multi-Instance), sonst inkonsistente HMAC-Validierung.
- Empfohlenes Monitoring: HTTP-404-Rate auf signierter Route + Alerts für SAN6-Fehler.

## Runbooks
- SAN6-Export-Betrieb: `docs/runbook-export-san6.md`

## Version
- **1.0.0**

## Entwickler
- **Name:** Mohamed Rami Aouinti
- **E-Mail:** mohamed.rami.aouinti@first-medical.de

## Support
Bei Fragen oder Support-Anfragen bitte die oben genannte E-Mail-Adresse verwenden.
