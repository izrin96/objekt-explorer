# Spec Delta

## ADDED Requirements

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
- **WHEN** the daily verifier finds Cream02 356A fitted again a day after it was first marked
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
