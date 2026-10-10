## ADDED Requirements

### Requirement: Estimated serials are marked
A serial for an objekt minted at or after Cosmo's v1 metadata cutoff (2026-06-04 08:07:02 UTC) is one the system estimated, not one Cosmo supplied. Wherever a trade surface shows a specific objekt's serial, an estimated serial SHALL read with a leading "~", as in "HyeRin 301Z ~#1203", and its accessible name SHALL say it is an estimate. A serial from before the cutoff SHALL read as today ("#1203"). An objekt not yet numbered SHALL show its name with no serial.

The trade surfaces are:
- the offer builder's pickers and its chosen items;
- offer cards in chat;
- My trades rows;
- the trade page's legs, including a wrong copy's serial (see `web-verified-trades`).

When any objekt shown in the builder, or any waiting leg on the trade page, has an estimated serial, the surface SHALL say once that "~" marks an estimated number which Cosmo may show differently, and to check the objekt in Cosmo before sending.

#### Scenario: New collection
- **WHEN** the user adds a copy of a collection minted last month to You give
- **THEN** the picker tile and the chosen item read "~#88", and the builder shows the note about estimated numbers once

#### Scenario: Older objekt
- **WHEN** an offer holds an objekt minted in 2025
- **THEN** its serial reads "#537" with no mark, and no note shows for it

#### Scenario: Not numbered yet
- **WHEN** an offer holds an objekt minted a minute ago, before the worker numbered it
- **THEN** the item shows its collection name with no serial
