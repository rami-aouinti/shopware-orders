# SAN6 Schule – Validierung von Import-/Export-Grenzfällen

## Abgedeckte Fälle
- Varianten `Gr`: `01`, `1`, leer.
- Artikelreferenzen: `ART.01` und `ART      01`.
- Anhänge: kurzer Text-Payload und großer Payload.
- Sonderzeichen: Umlaute/Akzente, Apostrophe und `&`.

## TopM-Response und Plugin-Persistenz
- Simulierte TopM-XML-Antwort erfolgreich validiert: `response_code=0`, `response_message=OK Schule Edge Cases`.
- Persistenz in `external_order_export` geprüft:
  - `request_xml` vollständig gespeichert,
  - `response_xml` gespeichert,
  - `response_code` als Integer gemappt,
  - `response_message` als Text gemappt.

## Beobachtete Abweichungen
- Keine blockierenden Abweichungen festgestellt.
- Bestätigtes Mapping:
  - `ART.01` und `ART      01` ⇒ `Referenz=ART`, `Gr=01`.
  - `Gr=1` ⇒ Normalisierung auf `01`.
  - `Gr` leer ⇒ Fallback `00`.
  - Sonderzeichen bleiben im XML durch korrektes Escaping erhalten.
  - Großer Anhang wird akzeptiert und als Base64 kodiert.

## Korrekturmaßnahme
- Keine Mapping-Korrektur notwendig.
- Dedizierte Nicht-Regressionstests wurden ergänzt, um dieses Verhalten zu fixieren.
