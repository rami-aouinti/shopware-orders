# Finale Checkliste — SAN6-Go-live (`ExternalOrders`)

## 1) Exakte Reihenfolge beim Deployment

1. **DB-Migration**
   - Code ausrollen und Plugin-Migrationen ausführen (zuerst nicht-destruktiv, anschließend destruktiv innerhalb des Wartungsfensters).
   - Logs auf SQL-Fehler prüfen und Verfügbarkeit der erwarteten Tabellen/Felder verifizieren.
2. **SAN6-Konfiguration**
   - Schlüssel setzen/prüfen:
     - `ExternalOrders.config.externalOrdersSan6BaseUrl`
     - `ExternalOrders.config.externalOrdersSan6Authentifizierung`
     - `ExternalOrders.config.externalOrdersSan6WriteFunction`
     - `ExternalOrders.config.externalOrdersSan6SendStrategy`
   - Sicherstellen, dass die Zielumgebung korrekt abgebildet ist (URL, Authentifizierung, Versandstrategie).
3. **Geplante Aufgaben aktivieren**
   - Prüfen, dass `external_orders.export_retry` auf `scheduled` steht.
   - Sicherstellen, dass Worker/Cron `scheduled-task:run` tatsächlich ausführt.
4. **Smoke-Test nach Deployment**
   - Manuellen Export für eine Testbestellung starten.
   - Prüfen, dass ein Versuch in `external_order_export` erzeugt wurde.
   - Erwarteter Endstatus: `sent` und `response_code = 0`.

---

## 2) Go-live-Fenster

- **Dediziertes Go-live-Fenster planen** (Ops + Dev + Fachbereich), mit Freeze für nicht-kritische Änderungen.
- **Go/No-Go vor Start**:
  - Migrationen sind vorbereitet,
  - SAN6-Konfiguration ist validiert,
  - Monitoring/Logs sind verfügbar.
- **Pflichtvalidierung direkt nach Aktivierung**:
  - innerhalb von 5 Minuten einen **Testexport** ausführen,
  - erwarteter Erfolg: `sent` + `response_code = 0`,
  - bei Fehler: sofort operativen Rollback starten.

---

## 3) Operativer Rollback (strikte Reihenfolge)

1. **Export deaktivieren**
   - Versandstrategie auf neutralen Wert umstellen (oder Funktion per Config/Feature-Flag deaktivieren).
   - Ziel: sofort alle neuen SAN6-Sendungen stoppen.
2. **Retries pausieren/stoppen**
   - Geplante Aufgabe `external_orders.export_retry` pausieren (oder Scheduler-Worker stoppen).
   - Retries kontrolliert puffern oder gemäß Incident-Policy bereinigen.
3. **Vorherige Konfiguration wiederherstellen**
   - Vorher gesicherte, stabile SAN6-Werte zurücksetzen.
   - Kritische Schlüssel validieren und vor Wiederaufnahme erneut einen Testexport ausführen.

---

## 4) Abschluss-Checkliste

- [ ] DB-Migrationen wurden fehlerfrei ausgeführt.
- [ ] SAN6-Schlüssel sind korrekt gesetzt und geprüft.
- [ ] Task `external_orders.export_retry` ist aktiv und geplant.
- [ ] Testexport nach Umschaltung erfolgreich (`sent`, `response_code = 0`).
- [ ] Rollback-Plan ist vorbereitet und mit Ops/Dev/Support geteilt.
- [ ] Go-live-Protokoll ist vollständig (Zeit, Beteiligte, Ergebnis, Abweichungen).
