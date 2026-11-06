# worker-offline-serials Specification

## Purpose
Numbers offline objekts minted after the v1 cutoff, when Cosmo no longer reports serials, and lets an operator correct those estimates with serials that collectors report from the Cosmo app.

## Requirements

### Requirement: Manual anchors pin their batch
A manual anchor is a reported `(tokenId, serial)` pair stored on the objekt's collection. When the worker computes offline serials, it SHALL treat a manual anchor exactly as it treats a pre-cutoff v1 serial: inside the reserved batch that holds the anchor's token, an objekt's serial is the nearest anchor's serial plus the tokenId distance to it, and a later batch with no anchor chains its serials from the anchored batch.

#### Scenario: One report corrects the whole batch
- **WHEN** a collection's only batch starts at token 29519229, its objekts were numbered from that start, and an anchor says token 29519351 is serial 38
- **THEN** token 29519351 gets serial 38, token 29519329 gets serial 16, and every other objekt in the batch moves by the same amount

#### Scenario: A later anchorless batch follows the anchored one
- **WHEN** a collection has two batches, only the first holds a manual anchor, and the second has no anchor
- **THEN** the second batch's first serial is one more than the first batch's last serial as pinned by the anchor

#### Scenario: Anchors in other batches are unaffected
- **WHEN** a collection has three batches and a manual anchor sits in the second
- **THEN** serials in the first batch are computed as they were before the anchor existed

### Requirement: V1 serials stay authoritative
A pre-cutoff objekt's v1 serial SHALL never be overwritten by a computation that includes manual anchors, and a manual anchor SHALL NOT be accepted for a pre-cutoff objekt.

#### Scenario: Anchor and v1 serial in the same batch
- **WHEN** a batch holds a v1-serialed objekt and a manual anchor
- **THEN** the v1 objekt keeps its serial, and each post-cutoff objekt takes its serial from whichever anchor is nearer by tokenId

#### Scenario: Anchoring a pre-cutoff objekt is refused
- **WHEN** an operator tries to anchor a token minted before the v1 cutoff
- **THEN** no anchor is stored, and the operator is told the objekt's v1 serial is already authoritative

### Requirement: No serial write reverts an anchor
Every process that writes offline serials SHALL include the collection's manual anchors: the periodic populate job, the weekly batch-boundary verifier (including when it rediscovers a collection's batches), and the maintenance scripts that recompute serials.

#### Scenario: Populate job after a new mint
- **WHEN** a new objekt mints in an anchored collection and the populate job recomputes that collection
- **THEN** the anchored objekt keeps the reported serial, and the new objekt is numbered from the anchor

#### Scenario: Verifier rediscovers an anchored collection
- **WHEN** the weekly verifier detects drift in a collection that has a manual anchor and rewrites its batches
- **THEN** the serials it writes are computed with the anchor, and the anchored objekt still has the reported serial

### Requirement: Manually anchored batches are shielded from drift checks
The weekly verifier SHALL treat a batch holding a manual anchor as anchored, the same as a batch holding a v1 serial, and SHALL NOT probe its boundaries or rediscover it on their account.

#### Scenario: Only the anchored batch is shielded
- **WHEN** a collection has an unanchored batch and a manually anchored batch
- **THEN** the verifier probes only the unanchored batch

### Requirement: Operator manages anchors with a dry-run-first script
An operator SHALL be able to add an anchor (token, serial, note), list a collection's anchors, and remove an anchor by token. Without `APPLY=1` the script SHALL change nothing and SHALL report the collection, the objekt's current serial, how many of the collection's serials would change, and the range of the changes. With `APPLY=1`, storing or removing the anchor and rewriting that collection's serials SHALL happen in the same run.

#### Scenario: Dry run of a new anchor
- **WHEN** the operator adds anchor token 29519351 = 38 without `APPLY=1`
- **THEN** the script prints the collection `cream02-hayeon-348a`, the current serial 123, that 292 serials would change by −85, and writes nothing

#### Scenario: Applying an anchor
- **WHEN** the operator runs the same command with `APPLY=1`
- **THEN** the anchor is stored with its note and the date added, and the collection's serials are rewritten so token 29519351 shows serial 38

#### Scenario: Removing a wrong anchor
- **WHEN** the operator removes the anchor for a token with `APPLY=1`
- **THEN** the anchor is gone and the collection's serials are recomputed without it

#### Scenario: Re-adding an anchor for the same token
- **WHEN** an anchor already exists for the token and the operator adds a new serial for it
- **THEN** the new anchor replaces the old one, and the dry run shows both values

### Requirement: Impossible anchors are refused
The script SHALL refuse, writing nothing, an anchor whose token is not in the indexer, belongs to an online collection that is not pre-assigned, was minted before the v1 cutoff, has a serial below 1, or would give any objekt in its batch a serial below 1.

#### Scenario: Anchor pushes a neighbour below 1
- **WHEN** an anchor says token 1000 is serial 5 and the same batch holds a minted token 990
- **THEN** the script refuses, naming token 990 and the serial it would get

#### Scenario: Unknown token
- **WHEN** the token is not in the indexer
- **THEN** the script refuses and says the token was not found

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

### Requirement: The verifier checks the indexer daily
The batch-boundary verifier SHALL run every day. A run that is not a probe run SHALL make no Cosmo API call. It SHALL check each unanchored batch against the indexer: a foreign token minted inside the batch, or a batch edge token whose indexer owner shows the range too big or too small. On drift it SHALL rediscover and rewrite the collection as a probe run does.

#### Scenario: A foreign mint inside a range, found the next day
- **WHEN** a foreign token mints on Wednesday inside an unanchored batch
- **THEN** Thursday's run reports drift for that collection and rewrites its ranges and serials, without waiting for Monday

#### Scenario: A quiet day
- **WHEN** no indexer check finds drift
- **THEN** the run ends having made no Cosmo API call

### Requirement: Probes skip tokens the indexer has
A probe run SHALL judge every edge token the indexer has as minted by its indexer owner, and SHALL ask the Cosmo API only about edge tokens the indexer has not seen.

#### Scenario: A settled edge
- **WHEN** the token just past a batch's end is a minted token of another collection in the indexer
- **THEN** the run treats that edge as foreign without calling the Cosmo API for it

#### Scenario: A token the indexer lacks
- **WHEN** the token just past a batch's end is not in the indexer
- **THEN** the run probes it through the Cosmo API, as before

### Requirement: Probe runs cover recent collections weekly and all monthly
The run on each Monday SHALL probe the unanchored batches of collections with a mint in the last 8 weeks. The run on the first Monday of a month SHALL probe the unanchored batches of every collection. Anchored and grid-fitted batches SHALL stay unprobed.

#### Scenario: An old collection on an ordinary Monday
- **WHEN** a collection's newest mint is 10 weeks old and the run is on the second Monday of the month
- **THEN** the run checks it against the indexer only and makes no Cosmo API call for it

#### Scenario: The first Monday of the month
- **WHEN** the run is on the first Monday of the month
- **THEN** it probes that same collection's unanchored batches

### Requirement: A manual run chooses its probe scope
A manual verifier run SHALL take a probe scope of none, recent or all, and SHALL default to the scope that day's scheduled run would use. A dry run SHALL write nothing whatever the scope.

#### Scenario: A manual dry run of every collection
- **WHEN** an operator runs the verifier with `DRY_RUN=1` and `PROBES=all` on a Thursday
- **THEN** it probes every unanchored collection's batches and writes nothing
