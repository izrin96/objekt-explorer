# Spec Delta

## MODIFIED Requirements

### Requirement: Partner identity
A partner card SHALL be headed by the Cosmo nickname of the address their best-matching list is bound to. When that address has no nickname it SHALL be headed by the shortened address, and only when no matched list is bound to an address SHALL it use the account's default profile, else the account's display name (see `web-cosmo-link` Default profile). Want-list alerts SHALL name a partner the same way. When the partner's matched lists are bound to more than one address, the card SHALL name the others as well. The card SHALL show the account's avatar. Its name SHALL link to the partner's profile, followed by Discord and Twitter badges when the partner has chosen to show socials.

#### Scenario: Bound nickname
- **WHEN** a partner's matched list is bound to the Cosmo address with nickname "rinrin"
- **THEN** the card is headed "rinrin"

#### Scenario: Bound address without a nickname
- **WHEN** a partner's best-matching list is bound to an address whose Cosmo profile has no nickname
- **THEN** the card is headed by that address shortened, as in `0x9ca6…8b0d`, and links to its profile

#### Scenario: No bound address
- **WHEN** a partner's matched lists are bound to no address, and their default profile is "rin.alt"
- **THEN** the card is headed "rin.alt"

#### Scenario: No profile at all
- **WHEN** a partner has no linked Cosmo profile
- **THEN** the card is headed by the account's display name

#### Scenario: No bound address and a private default
- **WHEN** a partner's matched lists are bound to no address, and their default profile was private before this change
- **THEN** the card is headed by that default profile
