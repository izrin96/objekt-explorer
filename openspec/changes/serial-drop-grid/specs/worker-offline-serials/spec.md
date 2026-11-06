# Spec Delta

## ADDED Requirements

### Requirement: A fitted drop grid sets its members' reserved ranges
An A drop is the offline collections of one season, collection number ending in "A", and artist, from a block season, with at least two members. Members are ordered by their lowest token. When exactly one slot size passes every fit rule, the drop is grid-fitted, and each member's reserved range inside the drop SHALL be its slot: the tokens of its equal share of the drop, with foreign minted tokens skipped.

#### Scenario: Cream02 356A members get their slots
- **WHEN** Cream02 356A has 24 members starting at token 29549511, foreign minted tokens sit at 29553111, 29556712 and 29557113, the token after 29559113 is foreign, and 400 is the only slot size that fits
- **THEN** `cream02-yooyeon-356a` holds tokens 29551111 to 29551510, and token 29551197 gets serial 87

#### Scenario: Slot sizes need not be whole hundreds
- **WHEN** every member of Binary02 304A takes 180 tokens and no other slot size fits
- **THEN** each member's range is its 180-token slot

#### Scenario: A separator inside a slot is skipped
- **WHEN** a foreign minted token sits inside a member's slot
- **THEN** the member's range is split around that token, the token takes no serial, and the slot still holds the full slot size of the member's own tokens

### Requirement: Grid fit rules
A slot size SHALL fit a drop only when every minted token of each member that falls inside the drop lands in that member's slot, every member has at least one minted token in its slot, and the first token after the drop's end is a minted token of another collection. Slot sizes from 1 to 5000 SHALL be tried.

#### Scenario: A member's mint lands in a neighbour's slot
- **WHEN** a slot size would place one of member 3's minted tokens inside member 4's slot
- **THEN** that slot size does not fit

#### Scenario: A drop with an unminted tail
- **WHEN** the token right after the drop's end is unminted or belongs to the drop
- **THEN** that slot size does not fit

### Requirement: Unfitted drops keep their discovered ranges
When no slot size fits a drop, or more than one does, every member's reserved ranges SHALL be those that discovery and the 100-block refinement produce today.

#### Scenario: Several slot sizes fit
- **WHEN** both 1080 and 1107 fit Summer25 211A
- **THEN** no member's ranges change

#### Scenario: A one-member drop
- **WHEN** a drop has a single member
- **THEN** its ranges change only through discovery and refinement, never through the grid

### Requirement: Ranges outside the drop are kept
A grid-fitted member's reserved ranges that lie wholly outside the drop SHALL be kept as discovered, and its serials SHALL continue across them after its slot.

#### Scenario: A restock after the drop
- **WHEN** a member of a grid-fitted 400-token drop also holds a 100-token batch after the drop's end
- **THEN** the batch keeps its range and its first token gets serial 401

### Requirement: Anchors outrank the grid
A v1 serial or a manual anchor inside a grid-fitted slot SHALL pin that slot's serials exactly as it pins any batch, and SHALL never be overwritten.

#### Scenario: A manual anchor disagrees with the grid
- **WHEN** Cream02 348A is grid-fitted and token 29519351 holds a manual anchor of 38 that the grid would number 32
- **THEN** token 29519351 keeps serial 38 and its slot is numbered from the anchor

### Requirement: Every range write applies the grid
Every process that writes offline reserved ranges SHALL apply the drop grid after refinement: the periodic populate job, the weekly verifier including its rediscovery, and the maintenance scripts that recompute ranges.

#### Scenario: Verifier rediscovers a grid-fitted member
- **WHEN** the weekly verifier rediscovers the batches of a member of a grid-fitted drop
- **THEN** the ranges it stores are the member's slot, and its serials are unchanged

#### Scenario: A new mint in a grid-fitted drop
- **WHEN** a member of a grid-fitted drop mints a new token inside its slot
- **THEN** the populate job numbers it from the slot's start

### Requirement: Grid-fitted batches skip edge probes
The weekly verifier SHALL NOT probe the Cosmo API at the edges of a batch that lies inside its collection's grid-fitted drop. It SHALL still check the indexer for a foreign token minted inside that batch, and on finding one SHALL rediscover the collection, which applies the grid again.

#### Scenario: A grid-fitted member is not probed
- **WHEN** the verifier checks `cream02-yooyeon-356a` while Cream02 356A is grid-fitted
- **THEN** it makes no Cosmo API call for that collection's slot

#### Scenario: A foreign mint inside a slot
- **WHEN** a foreign token mints inside a grid-fitted member's slot
- **THEN** the verifier reports drift from the indexer check and rediscovers that collection

### Requirement: Operator reviews the grid with a dry-run-first script
An operator SHALL be able to run a script over every A drop, or one named drop, that changes nothing without `APPLY=1`. Per drop, it SHALL report the verdict (fitted, ambiguous or unfitted), the slot size, the known serials it matches, and how many serials would change. With `APPLY=1`, it SHALL store the ranges and rewrite the serials of the drops it reports as fitted.

#### Scenario: Dry run of one drop
- **WHEN** the operator runs the script for Cream02 356A without `APPLY=1`
- **THEN** it prints fitted, slot 400, the count of serials that would change, and that `cream02-yooyeon-356a`'s serials move by −266 (token 29551197 from 353 to 87), and writes nothing

#### Scenario: Ambiguous drop under APPLY
- **WHEN** the operator runs the script with `APPLY=1` over a drop where more than one slot size fits
- **THEN** that drop's ranges and serials are left as they were
