# KPI- & Aktivitätskatalog — Lieferzeiten Statistics

## KPI-Katalog

| KPI | Definition | Datenquellen | Domain-/Kanalfilter |
|---|---|---|---|
| `openOrders` | Anzahl nicht abgeschlossener Pakete (offene Positionen > 0) im Zeitraum. | `lieferzeiten_paket`, `lieferzeiten_position` | `domain`/`channel` über `source_system` |
| `overdueShipping` | Überfällige Versand-Tasks gemäß PDMS-Schwellen (Werktage/Cutoff). | `lieferzeiten_paket`, `lieferzeiten_position`, PDMS-Settings | `domain`/`channel` über `source_system` |
| `channels[]` | Verteilung der Paketvolumina nach Quelle. | `lieferzeiten_paket` | konsistente `domain`/`channel`-Filter |
| `timeline[]` | Tägliche Zählung aller konsolidierten Ereignisse. | siehe Aktivitätsmatrix unten | `domain`/`channel` auf `sourceSystem` |

## Einheitliches Aktivitätsschema

Jede Aktivität in `activitiesData` folgt diesem Schema:

- `eventType`: fachlicher Ereignistyp,
- `status`: kompakter Status,
- `message`: operatives Label,
- `eventAt`: effektiver Ereigniszeitpunkt,
- `sourceSystem`: normalisiertes Quellsystem (auch für Filter genutzt),
- `orderNumber`: Bestellbezug (falls vorhanden).

## Matrix der enthaltenen Entitäten / Events

| Quelle | `eventType` | Statusfeld | Message/Label | Zeitfeld |
|---|---|---|---|---|
| `lieferzeiten_paket` (Erstellung) | `paket` | `status` | `payload.sourceSystem` / `paket_created` | `created_at` |
| `lieferzeiten_paket` (Update) | `paket_update` | `status` | `payload.sourceSystem` / `paket_updated` | `updated_at` (falls != `created_at`) |
| `lieferzeiten_position` (Erstellung) | `position` | `status` | `payload.type` / `position_created` | `created_at` |
| `lieferzeiten_position` (Update) | `position_update` | `status` | `payload.type` / `position_updated` | `updated_at` (falls != `created_at`) |
| `lieferzeiten_audit` | `audit` | `status` | `payload.action` / `audit_event` | `created_at` |
| `lieferzeiten_task` (Erstellung) | `task` | `status` | `payload.taskType` / `task_created` | `created_at` |
| `lieferzeiten_task` (Transition) | `task_transition` | `status` | `transition:{status}` | `updated_at` (falls != `created_at`) |
| `lieferzeiten_dead_letter` | `dead_letter` | `status` | `payload.reason` / `dead_letter` | `created_at` |

## Entscheidung zur statistischen Inklusion

- In **timeline** enthalten: alle Quellen oben (globale Volumensicht).
- In **activitiesData** enthalten: dieselben Quellen, sortiert nach `eventAt` absteigend.
- Ereignisse ohne `orderNumber` bleiben für Observability sichtbar (z. B. Dead-Letter/Audit).

## API-Zeitfenster (`period`, `from`, `to`)

Der Statistik-Endpunkt (`/api/_action/lieferzeiten/statistics` und `/v1/statistics`) bleibt rückwärtskompatibel:

- `period`: positive Ganzzahl (Tage), mit erweitertem Support (z. B. `7`, `30`, `90`, `180`, `365`),
- `from` und `to`: serverseitig parsebare ISO-/Datumsgrenzen.

Prioritätsregeln:

1. Wenn `from` und/oder `to` gesetzt sind, wird ein **custom**-Fenster verwendet; diese Grenzen haben Vorrang vor `period` (mit kontrolliertem Fallback bei nur einer Grenze).
2. Wenn `from`/`to` fehlen, wird **period** mit `period` verwendet (serverseitig begrenzt).
3. Legacy-Clients mit ausschließlich `period` bleiben ohne Änderungen kompatibel.
