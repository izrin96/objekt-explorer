# indexer-objekts Specification

## Purpose
Defines how the indexer and worker record objekts and their transfers when Cosmo's metadata is missing, so every recorded objekt belongs to a real collection and no transfer is lost.

## Requirements

### Requirement: Only real collections are recorded
Every recorded objekt and transfer SHALL belong to a collection described by Cosmo's metadata. The system SHALL NOT create a placeholder collection for objekts whose metadata is missing.

#### Scenario: Mint while Cosmo is down
- **WHEN** token 50123 is minted and Cosmo's metadata request for it fails
- **THEN** no objekt 50123 and no transfer of it are recorded, and no collection is created for it

### Requirement: Transfers without metadata are held
A transfer of a token that has no recorded objekt SHALL be held, with its sender, receiver, time, transaction and position in the chain, when its metadata cannot be fetched. Held transfers SHALL be kept until replayed and never dropped.

#### Scenario: Held mint
- **WHEN** the metadata request for newly minted token 50123 fails
- **THEN** its mint is held with the receiver, the block time and the transaction hash

### Requirement: A held token stays held until replayed
Once a token has a held transfer, every later transfer of it SHALL be held too, even when its own metadata request succeeds, until the held transfers are replayed.

#### Scenario: Metadata returns on the next transfer
- **WHEN** token 50123's mint is held and, an hour later, its owner sends it on and that metadata request succeeds
- **THEN** the send is held as well, and objekt 50123 is not recorded from the send

#### Scenario: Mint and send in one batch
- **WHEN** token 50123 is minted and sent on within the same indexed batch, and only the mint's metadata request fails
- **THEN** both transfers are held

### Requirement: Known objekts keep their collection
A transfer of an objekt that is already recorded SHALL be recorded under the objekt's collection when its metadata request fails, and SHALL NOT be held.

#### Scenario: Send while Cosmo is down
- **WHEN** recorded objekt 40001 of collection atom01-seoyeon-101z is sent and the metadata request fails
- **THEN** the transfer is recorded under atom01-seoyeon-101z and the owner changes as usual

### Requirement: Held transfers are replayed
The system SHALL retry held tokens at least hourly. Once a token's metadata is available and every held transfer of it is final on chain, the system SHALL record the collection if new, the objekt, every held transfer in chain order, and the list events for each non-mint transfer, then release the held rows, all at once.

#### Scenario: Replay after Cosmo recovers
- **WHEN** Cosmo recovers and token 50123 has a held mint to wallet A and a held send from A to B
- **THEN** objekt 50123 is recorded with its mint time from the mint, owner B and received time from the send, both transfers are recorded, and one list event is recorded for the send

#### Scenario: Cosmo still down
- **WHEN** the hourly retry finds Cosmo still failing for token 50123
- **THEN** its transfers stay held and the next retry tries again

#### Scenario: Not yet final
- **WHEN** token 50123's metadata is available but its held send is in a block that is not yet final
- **THEN** nothing of token 50123 is replayed until that block is final

### Requirement: Replay applies held transferability
A transferability change recorded for a token before its objekt existed SHALL be applied when the objekt is replayed, the latest change winning.

#### Scenario: Transferability changed while held
- **WHEN** token 50123 is held and a transferability change marks it not transferable
- **THEN** the replayed objekt 50123 is not transferable

### Requirement: Held transfers are never reported as seen
Reads that hide unresolved objekts SHALL need no filter of their own: an objekt or transfer without metadata SHALL NOT appear in collection, objekt, ownership, activity, trade or offer results until it is replayed.

#### Scenario: Profile while held
- **WHEN** wallet A's mint of token 50123 is held
- **THEN** A's profile does not list objekt 50123, and lists it after the replay
