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
