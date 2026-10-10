## ADDED Requirements

### Requirement: Reputation on a profile
A profile whose header shows the linked account SHALL show that account's reputation line (see `web-verified-trades`). A profile that hides its user, or whose address no account has linked, SHALL show none.

#### Scenario: Hidden user
- **WHEN** a visitor opens the profile of an address whose owner has Hide User on
- **THEN** no reputation line is shown
