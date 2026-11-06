## ADDED Requirements

### Requirement: Member runs are found in token order
A member run SHALL be two or more offline A collections of one member and one block season, ordered by their lowest token, where no other A collection's minted token lies between one collection's highest token and the next one's lowest, and the two lie at most 5000 tokens apart. The run SHALL start at the lower of its first collection's lowest token and the start of that collection's first stored range.

#### Scenario: Another member's slot splits a member's collections
- **WHEN** Cream02 KaeDe's 307A and 305A are followed by a minted token of `cream02-yubin-307a`, then KaeDe's 306A and 304A
- **THEN** KaeDe has two runs, 307A with 305A and 306A with 304A

### Requirement: A fitted member run sets its collections' reserved ranges
When exactly one slot size passes every member-run fit rule, the run is fitted, and each collection's reserved range inside the run SHALL be its slot: its equal share of the run in token order, with foreign minted tokens skipped.

#### Scenario: Cream02 KaeDe 334A to 337A get 500-token slots
- **WHEN** KaeDe's Cream02 334A, 335A, 336A and 337A form a run starting at token 27532650, right after a minted token of `summer26-dohun-107z`, with no foreign minted token inside, and 500 is the only size that fits
- **THEN** `cream02-kaede-336a` holds tokens 27533650 to 27534149, and each of its serials is 37 lower than before

#### Scenario: Unseen tokens after the last slot
- **WHEN** Binary02 DaHyun's 339A and 340A form a run starting at token 21331821, and three unminted tokens follow 2 × 1350 tokens before the first minted foreign token
- **THEN** 1350 fits, `binary02-dahyun-340a` starts at token 21333171, and the three unminted tokens belong to neither collection

#### Scenario: A separator inside a slot is skipped
- **WHEN** a foreign minted token sits inside a collection's slot in a fitted run
- **THEN** the collection's range is split around that token, the token takes no serial, and the slot still holds the full slot size of the collection's own tokens

### Requirement: Member-run fit rules
A slot size SHALL fit a member run only when it is a multiple of 10 from 10 to 5000, every minted token of each collection that falls inside the run lands in that collection's slot, every collection has at least one minted token in its slot, no collection of the run has a minted token between the last slot's end and the first minted foreign token after it, and at most 9 tokens lie between the last slot's end and that foreign token.

#### Scenario: An odd size is never tried
- **WHEN** 1352 tokens per collection would fit a run exactly up to the next minted foreign token
- **THEN** 1352 is not a candidate, and the run fits only if a multiple of 10 passes every rule

#### Scenario: Too much room after the last slot
- **WHEN** 12 unminted tokens lie between a size's last slot and the first minted foreign token
- **THEN** that size does not fit

#### Scenario: Two sizes fit
- **WHEN** both 250 and 260 pass every rule for a run
- **THEN** the run is not fitted and its collections keep their ranges

### Requirement: A member run is fitted only from a pinned start
A member run SHALL be fitted only when the token right before its start is a minted token of a collection whose number ends in Z. Otherwise its collections SHALL keep the ranges they have without the member grid.

#### Scenario: A run that follows a neighbouring A slot
- **WHEN** Cream02 KaeDe's 307A and 305A form a run starting at token 24258715, and token 24258714 is a minted token of `cream02-dahyun-304a`
- **THEN** the run is not fitted, whatever slot sizes pass the fit rules

#### Scenario: A run after an unminted token
- **WHEN** the token right before a run's start has never been minted
- **THEN** the run is not fitted

### Requirement: The drop grid outranks the member grid
A collection that belongs to a grid-fitted drop SHALL take its range from the drop grid. A member run that holds any such collection SHALL NOT be fitted.

#### Scenario: A run across a fitted drop
- **WHEN** Cream02 SeoYeon's 351A and 352A form a run, and Cream02 351A is a grid-fitted drop
- **THEN** the run is not fitted, and both collections keep their drop-grid slots

### Requirement: Member-run ranges outside the run are kept
A fitted run's collection SHALL keep, as discovered, its reserved ranges that lie wholly outside the run, and its serials SHALL continue across them after its slot.

#### Scenario: A restock after the run
- **WHEN** a collection of a fitted 500-token run also holds a 100-token range after the run's end
- **THEN** that range keeps its tokens and its first token gets serial 501

### Requirement: Anchors outrank the member grid
A v1 serial or a manual anchor inside a fitted run's slot SHALL pin that slot's serials exactly as it pins any batch, and SHALL never be overwritten.

#### Scenario: A reported serial inside a fitted slot
- **WHEN** a manual anchor sits in `cream02-kaede-336a` and disagrees with the member grid
- **THEN** the anchored token keeps its reported serial and the slot is numbered from the anchor

### Requirement: Every range write applies the member grid
Every process that writes offline reserved ranges SHALL apply the member grid after the drop grid: the periodic populate job, the daily verifier including its rediscovery, and the maintenance scripts that recompute ranges.

#### Scenario: Verifier rediscovers a fitted run's collection
- **WHEN** the verifier rediscovers the batches of `cream02-kaede-336a` while KaeDe's run is fitted
- **THEN** the range it stores is the collection's slot, and its serials are unchanged

### Requirement: Member-run batches skip edge probes
The verifier SHALL NOT probe the Cosmo API at the edges of a batch that lies inside its collection's fitted run. It SHALL still check the indexer for a foreign token minted inside that batch, and on finding one SHALL rediscover the collection, which fits the run again.

#### Scenario: A fitted run's collection is not probed
- **WHEN** a probe run checks `cream02-kaede-336a` while KaeDe's run is fitted
- **THEN** it makes no Cosmo API call for that collection's slot

### Requirement: Operator reviews member runs with the dry-run-first script
The grid review script SHALL report member runs beside drops. Per run, it SHALL report the member, the collections in token order, the verdict (fitted, ambiguous, unfitted, unpinned, or held by a fitted drop), the slot size, the known serials the stored ranges and the member grid each match with every anchor hidden, and how many serials would change. Without `APPLY=1` it SHALL change nothing; with `APPLY=1` it SHALL store the ranges and rewrite the serials of the runs it reports as fitted.

#### Scenario: Dry run of one season's runs
- **WHEN** the operator runs the script for Cream02 without `APPLY=1`
- **THEN** it reports KaeDe's 334A to 337A run as fitted with slot 500 and 240 serials to change, reports KaeDe's 307A and 305A run as unpinned, and writes nothing

## MODIFIED Requirements

### Requirement: Unfitted drops keep their discovered ranges
When no slot size fits a drop, or more than one does, every member's reserved ranges SHALL be those that discovery, the 100-block refinement and the member grid produce.

#### Scenario: Several slot sizes fit
- **WHEN** both 1080 and 1107 fit Summer25 211A
- **THEN** no member's ranges change through the drop grid

#### Scenario: A one-member drop
- **WHEN** a drop has a single member
- **THEN** its ranges change only through discovery, refinement and the member grid, never through the drop grid

#### Scenario: An unfitted drop whose members form fitted runs
- **WHEN** Cream02 334A does not fit as a drop, and KaeDe's 334A to 337A run is fitted
- **THEN** `cream02-kaede-334a` takes its range from the member grid
