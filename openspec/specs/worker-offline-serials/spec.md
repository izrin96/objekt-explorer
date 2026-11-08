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
Every process that writes offline reserved ranges SHALL apply the member grid after the drop grid: the periodic populate job, the verifier's passes including their rediscovery, and the maintenance scripts that recompute ranges.

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

### Requirement: Probes skip tokens the indexer has
A probe run SHALL judge every edge token the indexer has as minted by its indexer owner, and SHALL ask the Cosmo API only about edge tokens the indexer has not seen.

#### Scenario: A settled edge
- **WHEN** the token just past a batch's end is a minted token of another collection in the indexer
- **THEN** the run treats that edge as foreign without calling the Cosmo API for it

#### Scenario: A token the indexer lacks
- **WHEN** the token just past a batch's end is not in the indexer
- **THEN** the run probes it through the Cosmo API, as before

### Requirement: A manual run chooses its probe scope
A manual verifier run SHALL take a probe scope of none, recent or all, and SHALL default to none. A dry run SHALL write nothing whatever the scope.

#### Scenario: A manual dry run of every collection
- **WHEN** an operator runs the verifier with `DRY_RUN=1` and `PROBES=all` on a Thursday
- **THEN** it probes every unanchored collection's batches and writes nothing

#### Scenario: A manual run with no scope
- **WHEN** an operator runs the verifier without `PROBES`
- **THEN** it checks every collection against the indexer and makes no probe

### Requirement: A grid fit is recorded on the collections it sets
A collection SHALL carry the time its stored ranges were first written from a fitted grid (a drop fit that is start-pinned with its whole roster minted, or a run fit). A write that stores one collection's ranges SHALL mark only that collection; a write that stores every member's slot SHALL mark them all. A mark SHALL keep its time while later writes still fit. An unfitted, ambiguous, unpinned or roster-short fit SHALL leave it unset.

#### Scenario: The last member of a drop mints
- **WHEN** Cream02 355A has 21 of its 24 members minted, then the remaining three mint and the populate job's open-drop step finds the drop grid-fitted
- **THEN** it writes all 24 slots and all 24 collections of Cream02 355A carry the time of that run

#### Scenario: A rediscovery fits one member's drop
- **WHEN** a rediscovery of `cream02-kaede-355a` finds Cream02 355A grid-fitted and start-pinned, and the other members still hold their discovered ranges
- **THEN** only `cream02-kaede-355a` carries a fit time, so the drop still reads open until the open-drop step writes every slot

#### Scenario: A drop still minting
- **WHEN** the populate job processes `cream02-sullin-355a` while Cream02 355A does not fit
- **THEN** no collection of Cream02 355A carries a fit time

#### Scenario: The first member has not minted
- **WHEN** a drop's first member in token order has not minted, the grid fits the other members from the second member's first mint, and the token right before that start is unminted
- **THEN** no collection of the drop carries a fit time

#### Scenario: A fitted member run
- **WHEN** KaeDe's Cream02 334A to 337A run is fitted and `cream02-kaede-336a` is rediscovered
- **THEN** `cream02-kaede-336a` carries the fit time, and the run's other collections carry one once their own writes store their slots

#### Scenario: A later fit keeps the first time
- **WHEN** the weekly verifier pass finds Cream02 356A fitted again days after it was first marked
- **THEN** its collections keep the first time

### Requirement: A lost fit clears the collection's fit time
When a range write for a collection that carries a fit time finds neither its drop grid-fitted, start-pinned and roster-complete nor its member run fitted, the write SHALL store the discovered ranges, as it does today, and clear that collection's fit time.

#### Scenario: A rediscovery no longer fits
- **WHEN** `cream02-kaede-355a` carries a fit time, a new mint sends it to rediscovery, and Cream02 355A no longer fits
- **THEN** the collection takes its discovered ranges and its fit time is cleared, while the other members keep theirs until their own next write

#### Scenario: A rediscovery that still fits
- **WHEN** a marked collection is rediscovered and its drop still fits and is start-pinned
- **THEN** it keeps its slot and its first fit time

### Requirement: A drop is start-pinned by a foreign mint before it
A grid-fitted drop SHALL count as start-pinned only when the token right before its start is a minted token of another collection. A drop whose first member has not minted starts inside that member's unminted slot, so the token before it is unminted.

#### Scenario: A complete drop
- **WHEN** Cream02 356A is grid-fitted from token 29549511 and token 29549510 is a minted 107Z token
- **THEN** the drop is start-pinned

#### Scenario: An unminted token before the start
- **WHEN** Atom02 350A is grid-fitted and the token right before its start is unminted
- **THEN** the drop is not start-pinned, and its ranges still follow the grid as before

### Requirement: A drop is roster-complete when its largest sibling has no more members
A grid-fitted drop SHALL count as roster-complete only when it has at least as many minted members as the largest other A drop of the same season and artist, counting each drop's collections. A drop with no other A drop in its season SHALL not count as roster-complete. A drop that is not roster-complete SHALL be left unsettled and unmarked.

#### Scenario: A middle member has not minted
- **WHEN** a drop's members A and C have minted, member B between them has not, the drop fits a single slot size and is start-pinned, and the season's other A drops of the artist have 3 members
- **THEN** the drop is not roster-complete, so the populate run writes nothing for it and no collection carries a fit time

#### Scenario: Every member has minted
- **WHEN** all 24 members of Cream02 355A have minted and the largest other Cream02 A drop of tripleS has 24 members
- **THEN** the drop is roster-complete

#### Scenario: A subunit drop
- **WHEN** a 12-member A drop fits and is start-pinned in a season whose largest other A drop of the artist has 24 members
- **THEN** it is not roster-complete and carries no fit time

#### Scenario: The first A drop of a season
- **WHEN** a drop is the only A drop of its season and artist
- **THEN** it is not roster-complete

### Requirement: The populate job re-fits recent open drops
Each populate run SHALL fit the drop grid of every A drop in a block season whose earliest collection is less than 7 days old and at least one of whose collections carries no fit time. When the drop fits, is start-pinned and is roster-complete, the run SHALL write every member's grid ranges and serials, as the operator script's `APPLY=1` does, and record the fit time. Otherwise the run SHALL change nothing.

#### Scenario: A foreign mint closes the drop after the last member
- **WHEN** all 24 members of a drop have minted, no member is rediscovered afterwards, and a foreign token then mints right after the drop's end
- **THEN** the next populate run fits the drop, writes its members' slots and serials, and records the fit time

#### Scenario: A drop still minting
- **WHEN** Cream02 355A has 21 of 24 members minted
- **THEN** the populate run fits nothing for it and writes nothing

#### Scenario: A drop whose fit was lost fits again
- **WHEN** one collection of a 4-day-old drop lost its fit time and the drop fits and is start-pinned again
- **THEN** the next populate run writes the slots and gives every collection without a fit time the time of that run

#### Scenario: A fit with the first member missing
- **WHEN** Binary02 304A's first member had not minted and the grid fits the other members from the second member's first mint
- **THEN** the populate run writes nothing for the drop, because the token before that start is unminted

#### Scenario: An old unfitted drop
- **WHEN** a drop's earliest collection is 7 days old or more and it carries no fit time
- **THEN** the populate run does not try to fit it

### Requirement: The operator script records fits under APPLY
`script/drop-grid.ts` under `APPLY=1` SHALL record the fit time on every collection of each start-pinned drop and each run it reports as fitted that does not carry one yet, including those whose ranges and serials need no change. Its report SHALL say which fitted drops it leaves unmarked, and why: not start-pinned, or members still to mint. A dry run SHALL record nothing.

#### Scenario: Backfill of an already applied drop
- **WHEN** the operator runs the script with `APPLY=1` over Cream02, where 356A is fitted and has 0 serials to change
- **THEN** every collection of Cream02 356A carries a fit time

#### Scenario: Dry run
- **WHEN** the operator runs the script without `APPLY=1`
- **THEN** no fit time is written

### Requirement: The verifier checks recent mints every 15 minutes
Every 15 minutes, the verifier SHALL check every token minted in the last 24 hours against the stored offline ranges of all collections. A token with a collection that falls inside a stored range of another collection SHALL make that collection a candidate. A token whose collection is unknown SHALL make none, as the verifier's own checks ignore it. The window SHALL cover mint times, so an objekt the held-transfer replay inserts late is still checked.

#### Scenario: A foreign mint inside a range
- **WHEN** a token of `cream02-kaede-336a` mints inside a stored range of `cream02-kaede-337a`
- **THEN** the next pass makes `cream02-kaede-337a` a candidate

#### Scenario: A held transfer replayed late
- **WHEN** the held-transfer replay inserts, 3 hours late, an objekt with its original mint time, and its token sits inside another collection's stored range
- **THEN** the next pass makes that other collection a candidate

#### Scenario: A mint inside its own range
- **WHEN** a token mints inside a stored range of its own collection
- **THEN** no collection becomes a candidate on its account

#### Scenario: A mint with no collection yet
- **WHEN** an objekt with no collection sits inside a stored range
- **THEN** no collection becomes a candidate on its account

### Requirement: A recent-pass candidate is checked and fixed in the same pass
Each candidate SHALL get the verifier's indexer checks: a foreign token minted inside an unanchored batch, and the batch edge tokens judged by their indexer owners. Anchored batches SHALL stay shielded. On drift, the pass SHALL rediscover the collection and rewrite its ranges, fit marks and serials as the weekly pass does. A candidate whose checks find no drift SHALL be left unchanged.

#### Scenario: A candidate with drift
- **WHEN** `cream02-kaede-337a` is a candidate and a foreign token sits inside one of its unanchored batches
- **THEN** the pass rediscovers it and rewrites its ranges and serials

#### Scenario: A foreign mint inside an anchored batch
- **WHEN** a collection is a candidate only because of a foreign token inside a batch that holds a v1 serial or a manual anchor
- **THEN** the pass leaves the collection unchanged

#### Scenario: A failed fix
- **WHEN** the Cosmo API fails while the pass rediscovers a candidate
- **THEN** the pass logs it, and a later pass checks the candidate again while its token is under 24 hours old

### Requirement: A drift rediscovery cannot fix is not retried within the window
When a candidate's rediscovery gives back its stored ranges, or no ranges, the worker SHALL not rediscover it again for 24 hours while every foreign token it holds is one already tried. A foreign token not tried before SHALL make it a candidate again at once; a tried token aging out of the window SHALL not.

#### Scenario: Rediscovery gives back the stored ranges
- **WHEN** a candidate drifts, its rediscovery returns the batches already stored, and the next pass finds the same foreign token inside them
- **THEN** that pass skips the candidate without calling the Cosmo API

#### Scenario: A tried token ages out of the window
- **WHEN** a skipped candidate held foreign tokens 510 and 520, and 510 is now more than 24 hours old
- **THEN** the next pass still skips it, since 520 was already tried

#### Scenario: Another foreign token lands in the range
- **WHEN** a skipped candidate's range then takes a second foreign mint
- **THEN** the next pass checks and, on drift, rediscovers it

### Requirement: A skipped recent pass is visible
When a recent pass finds the `serial-offline` lock held by another run, it SHALL log a warning, so a run of skipped passes during a busy drop shows in the log. A pass that fixes a collection SHALL log one summary line with the collections fixed and its duration, and the passes SHALL add their counts to an hourly heartbeat line. A candidate whose check throws SHALL count as failed without stopping the rest of the pass.

#### Scenario: One candidate's check throws
- **WHEN** a database error interrupts the check of the second of five candidates
- **THEN** the pass counts it as failed and still checks the other four

#### Scenario: Populate holds the lock
- **WHEN** the populate job still holds the lock at the start of a recent pass
- **THEN** the pass is skipped with a warning, and the pass 15 minutes later runs as usual

### Requirement: The verifier makes a full indexer pass weekly
Once a week, at Sunday 19:08 UTC, the verifier SHALL check and fix every collection's unanchored batches against the indexer, as the recent pass does its candidates. No scheduled run SHALL call the Cosmo API except to rediscover a drifted collection. It SHALL never share a minute with a recent pass, SHALL warn when it finds the lock held, and SHALL run again at 19:38 when skipped or failed at 19:08.

#### Scenario: A drift older than the recent window
- **WHEN** a foreign token inside an unanchored batch is more than 24 hours old and was never caught
- **THEN** the next weekly pass reports drift for that collection and rewrites it

#### Scenario: The weekly pass finds the lock held
- **WHEN** a populate run still holds the lock at 19:08 UTC on Sunday
- **THEN** the weekly pass is skipped with a warning, and runs at 19:38 instead

#### Scenario: The weekly pass completed at 19:08
- **WHEN** the weekly pass finished after starting at 19:08 UTC on Sunday
- **THEN** nothing runs at 19:38

#### Scenario: No scheduled probes
- **WHEN** the weekly pass judges a batch edge token the indexer has not seen
- **THEN** it leaves that token unknown and makes no Cosmo API call for it
