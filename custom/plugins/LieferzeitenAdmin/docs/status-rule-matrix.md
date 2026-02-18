# Ticket-Status-Regelmatrix (1–8)

Diese Matrix dokumentiert pro Geschäftsstatus:

- erlaubte Quelle für die Statusentscheidung (`Shopware`, `Gambio`, `SAN6`, `Tracking`)
- Write-back-Regel (ob Rückschreiben zu Shopware/Gambio erlaubt ist)

| Status | Name | Erlaubte Quelle | Write-back-Regel |
|---|---|---|---|
| 1 | Neu | Shopware, Gambio | Kein Write-back (read-only) |
| 2 | In Klärung | Shopware, Gambio | Kein Write-back (read-only) |
| 3 | Warten auf Lieferanten | Shopware, Gambio | Kein Write-back (read-only) |
| 4 | Teilweise verfügbar | Shopware, Gambio | Kein Write-back (read-only) |
| 5 | Versandbereit | Shopware, Gambio | Kein Write-back (read-only) |
| 6 | Teilversendet | Shopware, Gambio | Kein Write-back (read-only) |
| 7 | Versendet | SAN6 (Gate: SAN6-Freigabe) | Write-back nach Shopware und Gambio erlaubt |
| 8 | Bestellung abgeschlossen | Tracking, fallback SAN6 ohne Tracking (Gate: Tracking + Sonderfälle) | Write-back nach Shopware und Gambio erlaubt |

## Entscheidungsregeln

- **Status 1–6**: reine Lesestatus aus den Quellsystemen, kein Rückschreiben.
- **Status 7**: wird über die SAN6-Versandfreigabe gesteuert.
- **Status 8**: wird primär über Tracking-Abschlusszustände und definierte Sonderfälle gesteuert, mit SAN6-Fallback wenn kein Tracking vorhanden ist (z. B. Paketshop-Abholung/Retoure-Regeln je Carrier-Mapping).
