# Spec Delta

## MODIFIED Requirements

### Requirement: Holder data freshness
Holder figures SHALL reflect ownership no more than five minutes old.

#### Scenario: Privacy change applies immediately
- **WHEN** a holder had a private profile before this change and another viewer opens the tab
- **THEN** that holder's row shows its address link and lowest serial

#### Scenario: New copy shows within five minutes
- **WHEN** a holder receives another copy and a viewer reopens the tab six minutes later
- **THEN** that holder's copy count includes it

## REMOVED Requirements

### Requirement: Holder privacy
**Reason**: Profiles no longer have private-profile, private-serial or Hide Cosmo ID settings.
**Migration**: Every holder row shows its address link, its nickname (else the shortened address) and its lowest serial to every viewer; no row reads "Private collector".
