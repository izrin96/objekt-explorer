# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: A manual run chooses its probe scope
A manual verifier run SHALL take a probe scope of none, recent or all, and SHALL default to none. A dry run SHALL write nothing whatever the scope.

#### Scenario: A manual dry run of every collection
- **WHEN** an operator runs the verifier with `DRY_RUN=1` and `PROBES=all` on a Thursday
- **THEN** it probes every unanchored collection's batches and writes nothing

#### Scenario: A manual run with no scope
- **WHEN** an operator runs the verifier without `PROBES`
- **THEN** it checks every collection against the indexer and makes no probe

### Requirement: Every range write applies the member grid
Every process that writes offline reserved ranges SHALL apply the member grid after the drop grid: the periodic populate job, the verifier's passes including their rediscovery, and the maintenance scripts that recompute ranges.

#### Scenario: Verifier rediscovers a fitted run's collection
- **WHEN** the verifier rediscovers the batches of `cream02-kaede-336a` while KaeDe's run is fitted
- **THEN** the range it stores is the collection's slot, and its serials are unchanged

## REMOVED Requirements

### Requirement: The verifier checks the indexer daily
**Reason**: The 15-minute pass over recent mints finds indexer-visible drift within minutes, so a daily full pass only repeats it.
**Migration**: Drift the indexer can show is fixed by the recent pass (see "The verifier checks recent mints every 15 minutes"). A weekly full indexer pass stays as a backstop (see "The verifier makes a full indexer pass weekly").

### Requirement: Probe runs cover recent collections weekly and all monthly
**Reason**: A dry run on 2026-11-08 over every collection with a mint in the last 8 weeks made 14,465 Cosmo calls and found the same 7 drifted collections as the indexer-only pass, nothing more. It also held the `serial-offline` lock for 13 minutes, delaying new serials.
**Migration**: Run the verifier by hand with `PROBES=recent` or `PROBES=all` (see "A manual run chooses its probe scope") when a reported serial suggests a token Cosmo assigned but never minted.
