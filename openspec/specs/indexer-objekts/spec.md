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

### Requirement: Transferability at mint comes from the chain
A newly recorded objekt's transferability SHALL be the objekt contract's own value for that token at the mint's block. It SHALL NOT be inferred from the objekt's class or from Cosmo's metadata.

#### Scenario: First objekt minted non-transferable
- **WHEN** token 30938969, a First-class objekt, is minted and the contract reports it not transferable at that block
- **THEN** objekt 30938969 is recorded as not transferable

#### Scenario: Welcome objekt minted transferable
- **WHEN** a Welcome objekt is minted and the contract reports it transferable at that block
- **THEN** it is recorded as transferable

#### Scenario: Change after the mint
- **WHEN** token 30938969 is minted not transferable and a later transferability change marks it transferable
- **THEN** objekt 30938969 is transferable after the change is indexed

### Requirement: Held mints keep their chain transferability
When a mint is held for missing metadata, its transferability at the mint's block SHALL be recorded with it, and the replayed objekt SHALL take that value unless a later transferability change replaces it.

#### Scenario: Replay of a non-transferable mint
- **WHEN** token 50123 is minted not transferable, its mint is held, and Cosmo later recovers
- **THEN** the replayed objekt 50123 is not transferable

#### Scenario: Change while held
- **WHEN** token 50123 is minted not transferable, its mint is held, and a later change marks it transferable before the replay
- **THEN** the replayed objekt 50123 is transferable

### Requirement: A failed chain read is retried
When the transferability of a minted token cannot be read from the chain, the system SHALL NOT record that token's objekt with a guessed value: indexing SHALL stop at that point and retry.

#### Scenario: RPC down during a mint
- **WHEN** token 50123 is minted and the chain read for it fails
- **THEN** no objekt 50123 is recorded from that attempt, and the mint is indexed once the read succeeds
