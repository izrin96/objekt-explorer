## ADDED Requirements

### Requirement: Ratio hint in the builder
In the offer builder, a get-side item drawn from an entry of the partner's have list that carries a ratio, its own or its list's, SHALL show the ratio chip with "They ask N for this", in the picker and once picked. The hint SHALL NOT block sending, change what is added when the builder opens, or warn about the counts on either side.

#### Scenario: Picking an item with a ratio
- **WHEN** the viewer opens the builder with jinsoul.blue, whose have list holds Lynn SCO with ratio 2, and picks it
- **THEN** the tile reads "1:2" with "They ask 2 for this", and the offer can be sent with any number of items on the give side

#### Scenario: No ratio
- **WHEN** a picked item's entry has no ratio
- **THEN** no chip shows
