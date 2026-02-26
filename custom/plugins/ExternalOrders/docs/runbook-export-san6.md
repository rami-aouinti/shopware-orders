# Betriebs-Runbook — SAN6-Export (`ExternalOrders`)

## 1) Exportstatus (`sent`, `failed`, Retries) und Bedeutung

Exportversuche werden in `external_order_export` historisiert (eine Zeile pro Versuch).

| Status | Operative Bedeutung | Auslöser | Automatische Aktion |
|---|---|---|---|
| `processing` | Versuch läuft. | Ein Versuch wird vor dem SAN6-Aufruf erzeugt. | Nur Übergangszustand. |
| `sent` | Export bei SAN6 akzeptiert (`response_code = 0`). | Gültige SAN6-Erfolgsantwort. | Keine Wiederholung. |
| `failed` | SAN6-Antwort erhalten, aber fachlich fehlgeschlagen (`response_code != 0`). | Funktionaler Fehler von SAN6. | Sofortige Neuplanung via `retry_scheduled`, sofern Retries verbleiben. |
| `retry_scheduled` | Temporärer Fehler, für Retry eingeplant. | Technischer Fehler (Timeout/Transport/Exception) oder geplanter Retry nach `failed`. | Verarbeitung über `external_orders.export_retry`. |
| `failed_permanent` | Endgültiger Fehler. | Retries ausgeschöpft **oder** SAN6-Konfiguration ungültig. | Keine automatische Wiederholung (manuell eingreifen). |

### Retry-Policy
- Maximum: `MAX_RETRIES = 5`
- Backoff: `+5 min`, `+10 min`, `+15 min`, ... (`(attempts + 1) * 5`)
- Retry-Fenster: `status = 'retry_scheduled'` und `next_retry_at <= NOW(3)`
- Batchgröße je Lauf: `LIMIT 20`

---

## 2) Diagnose (Logs, Tabelle `external_order_export`, Retry-Task)

### 2.1 Applikationslogs

```bash
rg "TopM order export response received|TopM order export failed|TopM order export skipped: invalid SAN6 config" var/log -n
```

Interpretation:
- `TopM order export response received.`: Versuch beendet (Erfolg oder fachlicher Fehler).
- `TopM order export failed.`: technischer/runtime Fehler; Retry erwartet.
- `TopM order export skipped: invalid SAN6 config.`: Export wird als `failed_permanent` markiert.

### 2.2 Datenbank `external_order_export`

Statusverteilung:

```sql
SELECT status, COUNT(*) AS total
FROM external_order_export
GROUP BY status
ORDER BY total DESC;
```

Letzte Versuche:

```sql
SELECT
  LOWER(HEX(id)) AS export_id,
  LOWER(HEX(order_id)) AS order_id,
  status,
  attempts,
  response_code,
  response_message,
  last_error,
  next_retry_at,
  correlation_id,
  updated_at,
  created_at
FROM external_order_export
ORDER BY created_at DESC
LIMIT 50;
```

Überfällige Retries:

```sql
SELECT COUNT(*) AS overdue_retries
FROM external_order_export
WHERE status = 'retry_scheduled'
  AND next_retry_at IS NOT NULL
  AND next_retry_at <= NOW(3);
```

### 2.3 Retry-Task

```sql
SELECT name, status, run_interval, last_execution_time, next_execution_time
FROM scheduled_task
WHERE name = 'external_orders.export_retry';
```

Scheduler manuell ausführen (wenn Worker/Cron ausfällt):

```bash
bin/console scheduled-task:run --no-wait
```

> Parallele, unkoordinierte Ausführungen vermeiden.

---

## 3) Metriken, Schwellwerte und Alerts

### 3.0 Priorisierte KPIs

- `failed_exports_total`: Exporte im Status `failed` innerhalb von 15 Minuten
  - **Warning**: `>= 10`
  - **Critical**: `>= 30`
- `retry_pending_total`: Exporte in `retry_scheduled`
  - **Warning**: `> 20`
  - **Critical**: `> 100`
- `oldest_retry_age_minutes`: Alter des ältesten geplanten Retries
  - **Warning**: `> 15 min`
  - **Critical**: `> 30 min`

```sql
SELECT
  SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_exports_total,
  SUM(CASE WHEN status = 'retry_scheduled' THEN 1 ELSE 0 END) AS retry_pending_total,
  ROUND(MAX(CASE
    WHEN status = 'retry_scheduled' AND next_retry_at IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, next_retry_at, NOW(3))
    ELSE NULL
  END), 2) AS oldest_retry_age_minutes
FROM external_order_export
WHERE created_at >= (NOW() - INTERVAL 15 MINUTE);
```

### 3.1 Wiederholte Exportfehler

- **Warning**: `failure_rate_pct > 5%` (15 Min.)
- **Critical**: `failure_rate_pct > 15%` (15 Min.)

```sql
SELECT
  ROUND(
    100.0 * SUM(CASE WHEN status IN ('failed', 'retry_scheduled', 'failed_permanent') THEN 1 ELSE 0 END)
    / NULLIF(COUNT(*), 0),
    2
  ) AS failure_rate_pct,
  COUNT(*) AS total_exports
FROM external_order_export
WHERE created_at >= (NOW() - INTERVAL 15 MINUTE);
```

### 3.2 Retry-Backlog

- **Warning**: `retry_backlog > 20`
- **Critical**: `retry_backlog > 100`
- Zusatzalert: `overdue_retry_backlog > 0` länger als 10 Minuten

```sql
SELECT COUNT(*) AS retry_backlog
FROM external_order_export
WHERE status = 'retry_scheduled';
```

```sql
SELECT COUNT(*) AS overdue_retry_backlog
FROM external_order_export
WHERE status = 'retry_scheduled'
  AND next_retry_at IS NOT NULL
  AND next_retry_at <= NOW(3);
```

### 3.3 Ungültige SAN6-Konfiguration

Sofortiger Alert bei Log:
- `TopM order export skipped: invalid SAN6 config.`

Mindestens folgende Schlüssel überwachen:
- `ExternalOrders.config.externalOrdersSan6BaseUrl`
- `ExternalOrders.config.externalOrdersSan6Authentifizierung`
- `ExternalOrders.config.externalOrdersSan6WriteFunction`
- `ExternalOrders.config.externalOrdersSan6SendStrategy`

```sql
SELECT configuration_key
FROM system_config
WHERE configuration_key IN (
  'ExternalOrders.config.externalOrdersSan6BaseUrl',
  'ExternalOrders.config.externalOrdersSan6Authentifizierung',
  'ExternalOrders.config.externalOrdersSan6WriteFunction',
  'ExternalOrders.config.externalOrdersSan6SendStrategy'
);
```

### 3.4 Alert-Routing (Mail/Slack)

Empfohlene Minimal-Umsetzung:
- **Mail-Alert** für Support und Ops-Bereitschaft (Warning/Critical)
- **Slack-Alert** in `#incident-topm` mit Stufe, Metrik, Wert, Schwellwert, Dashboard-Link und Runbook-Link

Minimaler Alert-Payload:
- `service=ExternalOrders`
- `metric` (`failed_exports_total`, `retry_pending_total`, `oldest_retry_age_minutes`)
- `severity` (`warning`/`critical`)
- `value`, `threshold`
- `timeWindow=15m`
- `runbook=custom/plugins/ExternalOrders/docs/runbook-export-san6.md`

---

## 4) Manuelle Wiederaufnahme eines fehlgeschlagenen Exports

Voraussetzungen: Zugriff auf Admin-API + `orderId` + identifizierte/behobene Root Cause.

1. **Letzten fehlgeschlagenen Versuch identifizieren**

```sql
SELECT
  LOWER(HEX(id)) AS export_id,
  status,
  attempts,
  response_code,
  response_message,
  last_error,
  next_retry_at,
  correlation_id,
  created_at
FROM external_order_export
WHERE order_id = UNHEX(REPLACE('<orderId>', '-', ''))
ORDER BY created_at DESC
LIMIT 5;
```

2. **Root Cause beheben**
- SAN6-Konfiguration
- Konnektivität/Netzwerk
- SAN6-Fachfehler (`response_code`, `response_message`)

3. **Export manuell neu starten (empfohlen)**

```bash
curl -sS -X POST "https://<shop-domain>/api/_action/external-orders/export/<orderId>" \
  -H "Authorization: Bearer <admin-api-token>" \
  -H "Content-Type: application/json"
```

4. **Ergebnis verifizieren**
- HTTP 200 erwartet (sonst Response analysieren)
- Erwarteter letzter Status: `sent` mit `response_code = 0`

```sql
SELECT status, response_code, response_message, attempts, correlation_id, created_at
FROM external_order_export
WHERE order_id = UNHEX(REPLACE('<orderId>', '-', ''))
ORDER BY created_at DESC
LIMIT 5;
```

5. **Alternative (Retry erzwingen)**

> Nur als Ausnahmefall (DBA/Ops mit Freigabe).

```sql
UPDATE external_order_export
SET status = 'retry_scheduled',
    next_retry_at = NOW(3),
    updated_at = NOW(3)
WHERE id = UNHEX(REPLACE('<exportId>', '-', ''));
```

Dann:

```bash
bin/console scheduled-task:run --no-wait
```

6. **Incident abschließen**
- `correlation_id` dokumentieren
- Root Cause dokumentieren
- Gegenmaßnahme dokumentieren
- Wiederherstellungszeit dokumentieren

---

## 5) Support-Schnellansicht für `external_order_export`

- Letzte Zeile pro `order_id` identifizieren (`created_at DESC`)
- `status` prüfen:
  - `sent` => Export erfolgreich
  - `retry_scheduled` => automatische Wiederholung ausstehend
  - `failed_permanent` => manuelle Intervention nötig
- `attempts`, `last_error`, `response_code`, `response_message` auswerten
- `correlation_id` für DB-/Log-Korrelation verwenden

```sql
SELECT
  LOWER(HEX(id)) AS export_id,
  LOWER(HEX(order_id)) AS order_id,
  status,
  attempts,
  response_code,
  response_message,
  last_error,
  correlation_id,
  next_retry_at,
  updated_at
FROM external_order_export
ORDER BY updated_at DESC
LIMIT 100;
```

---

## 6) Eskalation bei längerem TopM-Ausfall

Definition „längerer Ausfall“:
- `retry_pending_total > 100` **oder** `oldest_retry_age_minutes > 30` über 15 Minuten

Eskalationsablauf:
1. **T+0 min (Support L1)**: Incident qualifizieren, Ticket eröffnen, `#incident-topm` informieren.
2. **T+10 min (Ops)**: SAN6-Konnektivität, `external_orders.export_retry` und TopM-API-Verfügbarkeit prüfen.
3. **T+20 min (Dev on-call)**: Degraded Mode aktivieren (nicht-kritische manuelle Retries aussetzen), Wiederanlaufstrategie bestätigen.
4. **T+30 min (Management/PO)**: Fachbereichskommunikation (Bestellauswirkung), ETA und Workarounds.
5. **Wiederherstellung**: blockierte Exporte batchweise erneut senden, Rückgang auf `retry_pending_total < 20` überwachen.

Pflicht nach Incident:
- REX mit Timeline, Root Cause, Korrekturmaßnahmen und ggf. Schwellwert-/Alert-Anpassungen erstellen.

---

## 7) Pflege und Veröffentlichung

Runbook-Pfad:
- `custom/plugins/ExternalOrders/docs/runbook-export-san6.md`

Bei jeder Änderung an Exportlogik (Status, Retry, SAN6-Config, Scheduler) muss dieses Dokument in derselben PR aktualisiert werden.

## 8) Referenz Go-live/Rollback

Für Produktivsetzungen die finale Checkliste nutzen:
- `custom/plugins/ExternalOrders/docs/checklist-bascule-san6.md`
