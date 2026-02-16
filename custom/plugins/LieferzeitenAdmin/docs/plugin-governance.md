# Verbindliche Plugin-Governance für Lieferzeit

Stand: `2026-02-16`

## 1) Fachlich führendes Plugin (Single Source of Truth)

**Verbindlich:** Für den Lieferzeit-Fachprozess ist **`LieferzeitenAdmin`** das fachlich führende Plugin.

Das umfasst insbesondere:
- Statuslogik und Business-Regeln rund um Lieferzeit, Versanddatum, Tracking und Aufgaben.
- Definition der Integrations- und Fallback-Regeln.
- Autoritative Entscheidung, welche Felder/Events für den Prozess als fachlich relevant gelten.

`ExternalOrders` und `Lieferzeit` sind in diesem Kontext **nachgelagerte Konsumenten/Integrationspartner** und dürfen keine konkurrierende Fachlogik als Primärquelle etablieren.

## 2) Pflegeorte für Lieferzeit-Datenmodelle und APIs

### 2.1 Datenmodelle

**Verbindlich:** Persistente Lieferzeit-Datenmodelle werden in **`LieferzeitenAdmin`** gepflegt.

Konkret:
- Datenbankschema (Migrationen) unter `custom/plugins/LieferzeitenAdmin/src/Migration/`.
- DAL-Definitionen, Services und Business-Validierung im Plugin `LieferzeitenAdmin`.
- Änderungen an Tabellen wie `lieferzeiten_*` erfolgen ausschließlich über Migrationen dieses Plugins.

### 2.2 APIs

**Verbindlich:** Die führenden Lieferzeit-APIs liegen in **`LieferzeitenAdmin`** unter dem Namespace:
- `/api/_action/lieferzeiten/...`

Konkret:
- Request-/Response-Verträge und Integrationsregeln werden in
  `custom/plugins/LieferzeitenAdmin/docs/integration-contract.md` gepflegt.
- Erweiterungen bestehender Endpunkte oder neue Lieferzeit-Endpunkte werden zuerst in `LieferzeitenAdmin` spezifiziert und umgesetzt.

`ExternalOrders` darf ergänzende Integrations- oder Export-Endpunkte bereitstellen, ist jedoch **nicht** die führende Quelle für Lieferzeit-Kernverträge.

## 3) Vorgehen für künftige pluginübergreifende Erweiterungen

**Verbindlicher Ablauf für alle Teams:**

1. **Fachliche Entscheidung in `LieferzeitenAdmin`**
   - Neue Regel, neues Feld oder neuer Status wird zuerst dort fachlich beschrieben.
   - Betroffene API-Verträge und Datenmodelländerungen werden dort versioniert.

2. **Vertragsanpassung dokumentieren**
   - Update von `integration-contract.md` (Version + Änderungsinhalt).
   - Benennung von Kompatibilitätsregeln und Übergangsfristen (deprecation, fallback).

3. **Technische Umsetzung in abhängigen Plugins**
   - `ExternalOrders` und/oder `Lieferzeit` konsumieren die neue vertragliche Definition.
   - Keine semantische Umdeutung der Felder außerhalb von `LieferzeitenAdmin`.

4. **Cross-Plugin-Abnahme vor Merge**
   - Nachweis, dass betroffene Endpunkte und Integrationen konsistent bleiben.
   - Mindestens ein dokumentierter Integrations-Check über Plugin-Grenzen hinweg.

5. **Release-Reihenfolge**
   - Zuerst `LieferzeitenAdmin` (Vertrag + Backend), danach abhängige Plugins.
   - Breaking Changes nur mit dokumentierter Migrationsstrategie.

## 4) Entscheidungsregel bei Konflikten

Bei widersprüchlichen Implementierungen zwischen Plugins gilt **immer**:
1. `LieferzeitenAdmin` (führend)
2. Konsumenten-Plugins (`ExternalOrders`, `Lieferzeit`)

Abweichungen von dieser Governance sind nur mit expliziter, versionierter Änderung dieses Dokuments zulässig.
