# Integrationsvertrag — LieferzeitenAdmin

Version: `1.4.1`  
Letzte Aktualisierung: `2026-02-18`

## 1) Ein-/Ausgabe-Verträge der APIs

## 1.1 Shopware API (Kanal: `shopware`)

### Minimale erwartete Eingabe
- `externalId` **oder** `id` **oder** `orderNumber`
- `status`
- `date` **oder** `orderDate`

### Normalisierte Ausgabe im Plugin
- `externalId`
- `orderNumber`
- `status`
- `orderDate`
- `sourceSystem`
- `customerFirstName` (optional)
- `customerLastName` (optional)
- `customerAdditionalName` (optional)

- Kundenname-Mapping (explizit):
  - `customerFirstName` ← `customerFirstName|orderCustomer.firstName|billingAddress.firstName`
  - `customerLastName` ← `customerLastName|orderCustomer.lastName|billingAddress.lastName`
  - `customerAdditionalName` ← `customerAdditionalName|orderCustomer.additionalName|billingAddress.additionalAddressLine1`

### Beispiel-Payload (anonymisiert)
```json
{
  "id": "SW-2026-100045",
  "orderNumber": "100045",
  "status": "5",
  "date": "2026-02-08T09:12:00+00:00",
  "customerEmail": "kunde@example.com",
  "customerFirstName": "Max",
  "customerLastName": "Mustermann",
  "customerAdditionalName": "c/o Praxis Nord",
  "paymentMethod": "prepayment"
}
```

## 1.2 Gambio API (Kanal: `gambio`)

### Minimale erwartete Eingabe
- `externalId` **oder** `id` **oder** `orderNumber`
- `status`
- `date` **oder** `orderDate`

### Normalisierte Ausgabe im Plugin
- `externalId`
- `orderNumber`
- `status`
- `orderDate`
- `sourceSystem`
- `customerFirstName` (optional)
- `customerLastName` (optional)
- `customerAdditionalName` (optional)

- Kundenname-Mapping (explizit):
  - `customerFirstName` ← `customer.firstName|customer.firstname|billingAddress.firstName`
  - `customerLastName` ← `customer.lastName|customer.lastname|billingAddress.lastName`
  - `customerAdditionalName` ← `customer.additionalName|customer.company|billingAddress.additionalAddressLine1`

### Beispiel-Payload (anonymisiert)
```json
{
  "externalId": "GX-556677",
  "orderNumber": "556677",
  "status": "processing",
  "orderDate": "2026-02-08T07:15:22+00:00",
  "customerEmail": "shopper@example.org",
  "customerFirstName": "Erika",
  "customerLastName": "Musterfrau",
  "customerAdditionalName": "Station 3",
  "shippingDate": null
}
```

## 1.3 San6 API

### Minimale erwartete Eingabe
- `orderNumber`
- `shippingDate` **oder** `deliveryDate`

### Ausgabe (Merge) ins Geschäftsmodell
- `shippingDate`
- `deliveryDate`
- `parcels`
- `sourceSystem` (optional; hat Priorität, wenn vorhanden)
- `customerFirstName` / `customerLastName` / `customerAdditionalName` (aus `customer.*`, optional)

- Kundenname-Mapping (explizit aus `customer`):
  - `customerFirstName` ← `customer.firstName|customer.firstname`
  - `customerLastName` ← `customer.lastName|customer.lastname`
  - `customerAdditionalName` ← `customer.additionalName|customer.company`

### Beispiel-Payload (anonymisiert)
```json
{
  "orderNumber": "100045",
  "shippingDate": "2026-02-09",
  "deliveryDate": "2026-02-11",
  "sourceSystem": "san6",
  "customer": {
    "email": "kunde@example.com",
    "firstName": "Max",
    "lastName": "Mustermann",
    "additionalName": "c/o Praxis Nord"
  },
  "payment": {
    "method": "prepayment"
  },
  "parcels": [
    {"trackingNumber": "00340434161234567890", "carrier": "dhl"}
  ]
}
```

## 1.4 DHL / GLS Tracking API

### Minimale erwartete Eingabe
- `trackingNumber`
- `status`
- `eventTime` **oder** `timestamp`

### Normalisierte Ausgabe
- `trackingNumber`
- `status`
- `eventTime`
- `carrier`

### Beispiel-Payload (anonymisiert)
```json
{
  "trackingNumber": "00340434161234567890",
  "status": "in_transit",
  "eventTime": "2026-02-09T15:45:10+01:00",
  "carrier": "dhl"
}
```

## 2) Priorität der Quellen bei Konflikten

Standardregel:
1. `San6`
2. `Tracking (DHL/GLS)`
3. `Shop (Shopware/Gambio)`

Aktuelle Anwendung:
- Persistentes `sourceSystem`: San6 gewinnt, wenn vorhanden.
- `shippingDate` / `deliveryDate`: San6 hat Vorrang vor Shop-Werten.
- Führendes Feld für „spätester Versandzeitpunkt" ist `latestShippingDate` (Legacy-Alias: `shippingDateLatest`, DAL-Zielfeld: `businessDateTo`). Import-Priorität: `latestShippingDate` > `shippingDateLatest` > bestehendes `businessDateTo`. Die Overdue-Task-Regel basiert auf `businessDateTo`, nicht auf `shippingDate` (Ist-Versandzeitpunkt).
- Tracking-Daten (Paketstatus): Tracking gewinnt gegenüber Shop-Events.

## 3) Fallback-Regeln (Quelle nicht verfügbar)

- **San6 nicht verfügbar oder ungültig**: Fluss läuft mit normalisierten Shop-Daten weiter.
- **Tracking nicht verfügbar**: Kein Sync-Abbruch; Paketstatus bleibt bis zum nächsten Zyklus unverändert.
- **Shop-API ungültig**: Datensatz wird verworfen (keine partielle Persistenz) und als Vertragsverletzung geloggt.
- **Fehlendes Zahlungsdatum bei Vorkasse**: Fallback auf `orderDate` (bestehendes Business-Verhalten).

## 4) Pflicht-/Minimalfelder für Persistenz

### 4.1 Datensatz `paket`
- `externalOrderId` **oder** `externalId` **oder** `orderNumber`
- `paketNumber` **oder** `packageNumber` **oder** `orderNumber`
- `sourceSystem`
- optional: `customerFirstName`, `customerLastName`, `customerAdditionalName`

### 4.2 Datensatz `position`
- `positionNumber` **oder** `orderNumber` **oder** `externalId`
- `status`

### 4.3 Datensatz `tracking_history`
- `trackingNumber` **oder** `sendenummer`
- `status`
- `eventTime` **oder** `timestamp`

## 5) Implementierte Validierung

Die Vertragsvalidierung ist zentralisiert in:
- `LieferzeitenAdmin\Service\Integration\IntegrationContractValidator`

Aktive Validierung:
- Eingangsverträge für Shopware/Gambio vor der Verarbeitung.
- San6-Vertrag vor dem Merge.
- Minimaler Persistenzvertrag (`paket`) vor dem Upsert.

## 6) Weiterentwicklung des Vertrags

Jede Vertragsänderung muss:
1. die Dokumentversion erhöhen,
2. die Unit-Tests aktualisieren,
3. Rückwärtskompatibilität von Schlüssel-Aliasen (`externalId|id|orderNumber` usw.) soweit möglich erhalten.


## 7) Statistik-API (Versionierung und Zeitfenster)

- Neuer bevorzugter Endpunkt: `GET /api/_action/lieferzeiten/v1/statistics`
- Bestehender Endpunkt: `GET /api/_action/lieferzeiten/statistics` (**deprecated**, bleibt temporär für Rückwärtskompatibilität verfügbar).

### Zeitfenster-Priorität
1. `from`/`to` (ISO-Datetime)
2. `period` (`7|30|90`)
3. Default: 30 Tage

### Zusätzliche Antwort-Metadaten
Die Statistik-Antwort enthält ein stabiles Fensterobjekt:

```json
{
  "window": {
    "mode": "custom|period",
    "from": "2026-02-01T00:00:00+01:00",
    "to": "2026-02-14T10:15:22+01:00",
    "timezone": "Europe/Berlin"
  }
}
```


## 8) Statusmodell (Quelle je Status)

| Business-Status | Bedeutung | Primäre Lesequellen | Aktiv zurückschreiben |
|---|---|---|---|
| `1` | New | Shopware/Gambio | nein |
| `2` | In clarification | Shopware/Gambio | nein |
| `3` | Awaiting supplier | Shopware/Gambio, San6 | nein |
| `4` | Partially available | Shopware/Gambio, San6 | nein |
| `5` | Ready for shipping | Shopware/Gambio, San6 | nein |
| `6` | Partially shipped | Shopware/Gambio, San6, Trackingdienst | nein |
| `7` | Shipped | Shopware/Gambio, San6, Trackingdienst | ja (Shopware/Gambio) |
| `8` | Closed | Shopware/Gambio, San6, Trackingdienst | ja (Shopware/Gambio) |

## 9) Aggregationsregel „Order Completed"

`Order Completed` (`status=8`) wird nur gesetzt, wenn **alle** Pakete einen finalen Zustellzustand haben.

Finale Zustellzustände (Beispiele):
- `delivered`, `zugestellt`, `ablageort`
- `paketshop_retire`, `paketshop_collected`
- `completed`, `8`

Blockierende Sonderfälle (führen zu **nicht completed**):
- Paketshop nicht abgeholt: `paketshop_non_retire`, `paketshop_not_collected`
- Retouren: `retoure`
- Verweigerung: `refus`, `verweigert`
- Zollablehnung: `douane`, `zoll_abgelehnt`
- Sonstige unzustellbar: `nicht_zustellbar`

Ausnahme: SAN6-intern zugestellte Aufträge ohne Tracking dürfen weiterhin über die vorhandenen SAN6-Flags als completed interpretiert werden.

## 10) Explizite Sync-Strategie

### 10.1 Nur lesen (kein Push zurück)
- Status `1` bis `6`
- Trackingereignisse (DHL/GLS) inkl. Sonderfälle
- SAN6-Kontextdaten für Matching und Datumsauflösung

### 10.2 Aktiv zurückschreiben
- Nur Status `7` und `8`
- Zielsysteme: Shopware/Gambio (kanalabhängiger Push-Endpunkt)
- Trigger: nur LMS-initiierte manuelle Statusänderungen (`user_lms`/`lms_user`)

### 10.3 Fehler- und Retry-Verhalten beim API-Sync
- Exponentieller Backoff pro Queue-Item (`2^attempts * 60s`, max. 24h)
- Nach `6` Fehlversuchen wird ein Queue-Item auf `failed` gesetzt (`failedReason = max_attempts_exceeded`)
- Bei fehlender Push-Konfiguration wird der Push protokolliert und beim nächsten Versuch erneut verarbeitet
- Import-Sync bleibt robust: fehlerhafte Teilquellen (z. B. Tracking temporär nicht verfügbar) blockieren den Gesamtzyklus nicht
