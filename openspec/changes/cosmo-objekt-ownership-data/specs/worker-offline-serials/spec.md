# Spec Delta

## ADDED Requirements

### Requirement: Serials confirmed by connected accounts anchor their batch
When enabled, a serial Cosmo showed a connected account for an offline objekt minted after the v1 cutoff, in the collection the read names, SHALL anchor its batch in every serial calculation, read from the site's own per-token records. It SHALL NOT be copied into a collection's anchor list or onto the objekt. The collection's serials SHALL be rewritten within the run that first uses it.

#### Scenario: An estimated batch is confirmed
- **WHEN** anchors are enabled and rin.t's read shows token 51000250 of an offline collection as serial 250, its batch has no manual anchor or v1 serial, and the site already shows 250
- **THEN** no serial moves, and the collection's anchor list is unchanged

#### Scenario: An estimate off by one
- **WHEN** anchors are enabled, a read shows token 51000250 as serial 251, its batch has no manual anchor or v1 serial, and the site computes 250
- **THEN** within 10 minutes every serial in its batch moves up by 1, and the collection's anchor list is unchanged

#### Scenario: Anchors not enabled
- **WHEN** anchors are not enabled
- **THEN** every serial is computed from manual anchors and v1 serials only, and the reads are kept for when anchors are enabled

### Requirement: Manual anchors and v1 serials win over confirmed serials
A confirmed serial SHALL NOT override a manual anchor or v1 serial on its token or in its batch. A confirmed serial that disagrees with one SHALL be left out and reported to the operator by count and token id, and the code SHALL NOT resolve it.

#### Scenario: Disagreeing with a manual anchor
- **WHEN** token 51000250 holds a manual anchor of 249 and a read shows 251
- **THEN** the serials follow the manual anchor, and the run reports one conflict naming token 51000250

#### Scenario: Agreeing with a pinned batch
- **WHEN** a read shows token 51000250 as serial 250, its batch is pinned by a manual anchor, and that anchor gives 51000250 the serial 250
- **THEN** nothing changes and nothing is reported

### Requirement: Only trusted reads become confirmed serials
A read SHALL count as a confirmed serial only when its holder check passed at the read, the token sits in the collection the read names, that collection is offline or pre-assigned, and the token was minted after the v1 cutoff. It SHALL also be left out of a calculation where its token sits outside every stored batch or it would give an objekt of its batch a serial below 1. A read whose token is not yet indexed SHALL be judged again later.

#### Scenario: A token in another collection
- **WHEN** a read names token 51000250 for a collection the site files it under another one
- **THEN** the read never anchors a batch

#### Scenario: Batches not yet discovered
- **WHEN** a read arrives for a collection with no stored batches
- **THEN** no serial moves, and the read anchors the batch once the batches are stored

### Requirement: An operator's exclusion of a confirmed serial sticks
After an operator excludes a confirmed serial, further reads of the same token with the same serial SHALL NOT make it count again.

#### Scenario: Excluded, then read again
- **WHEN** the operator excludes the confirmed serial of token 51000250 and rin.t is synced again, still showing serial 251
- **THEN** token 51000250 anchors nothing

### Requirement: Online and v1 serials are compared, never written from reads
A serial read for an online collection that is not pre-assigned, or for an objekt minted before the v1 cutoff, SHALL NOT change any serial or anchor. Differences SHALL be counted for the operator.

#### Scenario: An online collection
- **WHEN** a read shows a different serial for an objekt of an online collection
- **THEN** its serial is unchanged and the difference is counted

### Requirement: Confirmed serials outlive accounts and indexer rebuilds
Confirmed serials and the serials computed from them SHALL stay when the account that supplied them disconnects, its session ends, or its user is banned, anonymized or deleted. After an indexer rebuild, the serial job SHALL anchor on them again with no step of its own.

#### Scenario: The account disconnects
- **WHEN** token 51000250's confirmed serial of 251 came from rin.t and rin.trades disconnects rin.t
- **THEN** the batch keeps its serials anchored on 51000250 = 251

#### Scenario: After an indexer rebuild
- **WHEN** the indexer is rebuilt and populate numbers the collection of token 51000250 again
- **THEN** its batch is anchored on 51000250 = 251 as before
