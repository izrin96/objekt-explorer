# Spec Delta

## ADDED Requirements

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
