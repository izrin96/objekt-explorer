# Spec Delta

## ADDED Requirements

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
