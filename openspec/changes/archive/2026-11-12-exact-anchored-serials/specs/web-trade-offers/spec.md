# Spec Delta

## MODIFIED Requirements

### Requirement: Estimated serials are marked
A serial is exact when Cosmo supplied it or when it follows from one Cosmo supplied. That holds for an objekt minted before Cosmo's v1 metadata cutoff (2026-06-04 08:07:02 UTC), and for a later objekt that sits in an anchored range: a reserved token range of its collection that also holds a pre-cutoff objekt's serial or a reported serial recorded as a manual anchor. Every other serial of an objekt minted at or after the cutoff is one the system estimated. That covers an offline objekt in a range with no anchor, an objekt outside every stored range, and every post-cutoff objekt of an online collection.

Wherever a trade surface shows a specific objekt's serial, an estimated serial SHALL read with a leading "~", as in "HyeRin 301Z ~#1203", and its accessible name SHALL say it is an estimate. An exact serial SHALL read as today ("#1203"). An objekt not yet numbered SHALL show its name with no serial.

The trade surfaces are:
- the offer builder's pickers and its chosen items;
- offer cards in chat;
- My trades rows;
- the trade page's legs, including a wrong copy's serial (see `web-verified-trades`).

When any objekt shown in the builder, or any waiting leg on the trade page, has an estimated serial, the surface SHALL say once that "~" marks an estimated number which Cosmo may show differently, and to check the objekt in Cosmo before sending.

#### Scenario: New collection
- **WHEN** the user adds a copy of an offline collection first minted last month, none of whose ranges holds an anchor, to You give
- **THEN** the picker tile and the chosen item read "~#88", and the builder shows the note about estimated numbers once

#### Scenario: Older objekt
- **WHEN** an offer holds an objekt minted in 2025
- **THEN** its serial reads "#537" with no mark, and no note shows for it

#### Scenario: New mint in an anchored range
- **WHEN** an offer holds an offline objekt minted last week whose reserved range also holds objekts minted before the cutoff
- **THEN** its serial reads "#1203" with no mark, and no note shows for it

#### Scenario: Reported serial anchors a range
- **WHEN** a range of a post-cutoff offline collection holds a manual anchor, and an offer holds another objekt of that range
- **THEN** that objekt's serial reads with no mark, while an objekt in a range of the same collection with no anchor reads with "~"

#### Scenario: New mint of an online collection
- **WHEN** an offer holds an objekt of an online collection minted after the cutoff
- **THEN** its serial reads with "~"

#### Scenario: Not numbered yet
- **WHEN** an offer holds an objekt minted a minute ago, before the worker numbered it
- **THEN** the item shows its collection name with no serial
