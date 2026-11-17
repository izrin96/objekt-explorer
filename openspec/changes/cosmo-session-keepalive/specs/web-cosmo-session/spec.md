# Spec Delta

## ADDED Requirements

### Requirement: Collection data section says the sign-in is kept active
The Collection data section's account of what is stored SHALL say, beside how long the sign-in is kept, that the site uses the sign-in about two to three times an hour to keep it active at Cosmo. It SHALL say so in every locale the site offers, before any sign-in.

#### Scenario: Before connecting
- **WHEN** a signed-in user with no connected account opens `/account/collection-data`
- **THEN** the "What we store" line says the sign-in is kept until disconnected, for 180 days at most, and is used about two to three times an hour to keep it active

#### Scenario: Korean
- **WHEN** rin.trades opens `/account/collection-data` with the site in Korean
- **THEN** the same line says, in Korean, that the sign-in is used about two to three times an hour to keep it active
