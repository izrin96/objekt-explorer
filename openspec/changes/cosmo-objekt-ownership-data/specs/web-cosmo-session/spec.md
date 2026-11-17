# Spec Delta

## MODIFIED Requirements

### Requirement: Collection data section says what is shared
The Collection data section SHALL show, above Connect a Cosmo account and before any sign-in, what the site stores (an encrypted Cosmo sign-in kept until disconnected and 180 days at most, and the Cosmo nickname and wallet address), what it reads and keeps (the held collections' media and colours, and per objekt its serial, transferability, non-transferable reason and grid use, kept by objekt with no account, address or user stored beside them and staying after disconnecting, the last two kept but not shown yet, that anyone with access to these records could match them to the holding wallet through public blockchain data, keeping nothing else), what others see (the media, and the corrected serials and transferability of held objekts, which can hint that their holder connected an account) and how to stop (Disconnect, or deleting the account). It SHALL NOT promise that per-objekt data is deleted.

#### Scenario: Before connecting
- **WHEN** a signed-in user with no connected account opens `/account/collection-data`
- **THEN** the section shows what is stored, read and shown and how to stop, then Connect a Cosmo account, and says no Cosmo account is connected

#### Scenario: Per-objekt details are named
- **WHEN** a signed-in user opens `/account/collection-data`
- **THEN** the section says per-objekt serials, transferability, non-transferable reasons and grid use are kept by objekt without their account, address or user and stay after disconnecting, that grid use and the reason are not shown yet, that the records could be matched to the holding wallet through public blockchain data, and that a corrected objekt can hint its holder connected an account

#### Scenario: Not set up
- **WHEN** the server has no session key configured
- **THEN** the section says Cosmo sign-in is not set up, and Connect a Cosmo account is unavailable
