# Spec Delta

## REMOVED Requirements

### Requirement: Holder data freshness
**Reason**: The five-minute limit made nearly every visit of a scraper that re-reads all pages every five minutes rebuild the ranking; replaced by "Holder data refresh" with a fifteen-minute limit that also covers nicknames.
**Migration**: None for clients: the request and response are unchanged, and figures may now be up to fifteen minutes old.

## ADDED Requirements

### Requirement: Holder data refresh
Holder figures SHALL reflect ownership no more than fifteen minutes old, and each holder's nickname SHALL be no more than fifteen minutes old.

#### Scenario: Privacy change applies immediately
- **WHEN** a holder had a private profile before this change and another viewer opens the tab
- **THEN** that holder's row shows its address link and lowest serial

#### Scenario: New copy shows within fifteen minutes
- **WHEN** a holder receives another copy and a viewer reopens the tab sixteen minutes later
- **THEN** that holder's copy count includes it

#### Scenario: Rename shows within fifteen minutes
- **WHEN** a holder changes their nickname and a viewer reopens the tab sixteen minutes later
- **THEN** that holder's row shows the new nickname
