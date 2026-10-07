## MODIFIED Requirements

### Requirement: Account menu reaches Cosmo and account settings
The account menu SHALL include a My Cosmo item whose manage entry opens `/account/profiles`, and an Account item opening
`/account`. The primary nav's My Cosmo link SHALL open `/account/profiles` and SHALL show as current on any `/account/profiles` or `/link` route.

#### Scenario: My Cosmo
- **WHEN** a signed-in user picks My Cosmo's manage entry
- **THEN** the URL is `/account/profiles`

#### Scenario: Account
- **WHEN** a signed-in user picks Account
- **THEN** the URL is `/account` and the General section is open
