# Auflösung von `salesChannelId` für Benachrichtigungen

## Quellen je Prozessfluss

- **Import von Bestellungen (`LieferzeitenImportService`)**
  - Priorität: eingehendes `payload.salesChannelId` -> Auflösung über `order.order_number` -> Fallback über Custom Field `externalOrderId` -> Konfigurationsmapping `sourceSystem -> salesChannelId`.
  - Das Ergebnis wird in `lieferzeiten_paket.sales_channel_id` persistiert.
- **Vorkasse-Reminders (`VorkassePaymentReminderService`)**
  - Priorität: persistiertes `paket.salesChannelId` -> identische Auflösungsstrategie wie oben.
  - Falls aufgelöst und in der DB fehlend, wird der Wert am Paket nachgeschrieben.
- **Task-Ereignisse (`LieferzeitenPositionWriteService` / `LieferzeitenTaskService`)**
  - Der Task-Kontext erhält `salesChannelId` vom zur Position gehörenden Paket.
  - Bei Task-Übergängen wird der Wert vor `dispatch` nochmals über den Resolver validiert.

## Expliziter globaler Fallback

Wenn kein Kanal bestimmt werden kann:

1. `NotificationToggleResolver::isEnabled(...)` wird mit `salesChannelId = null` aufgerufen.
2. Der Toggle-Resolver wendet dann die globale Konfiguration an (`sales_channel_id IS NULL`).
3. Falls keine globale Zeile existiert, bleibt das Verhalten **standardmäßig aktiviert**.

## Fallback-Mapping

`LieferzeitenAdmin.config.notificationSalesChannelMapping` als JSON-Objekt konfigurieren:

```json
{
  "shopware": "018f4f5f5fe873f9a43b8b0c4d2e6f11",
  "gambio": "018f4f5f6a6e7a41b8f977a11d4e9a22"
}
```

Der Schlüssel wird auf lowercase normalisiert (`sourceSystem/domain`).
