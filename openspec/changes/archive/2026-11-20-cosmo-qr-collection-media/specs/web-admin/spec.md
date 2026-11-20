# Spec Delta

## ADDED Requirements

### Requirement: Cosmo media summary
The Collections tab SHALL show one line about the Cosmo sessions users connected (see `web-cosmo-session`): how many are live, how many are signed out, when the latest sync finished, and how many collections have recorded media. It SHALL carry counts and that one time only, never a nickname, address or user. Only admins SHALL see it.

#### Scenario: Summary
- **WHEN** 12 sessions are live, 2 are signed out, the latest sync finished 5 minutes ago and 840 collections have recorded media, and an admin opens `/mod/collections`
- **THEN** the tab reads 12 connected · 2 signed out · last sync 5 minutes ago · 840 collections with media

#### Scenario: None connected
- **WHEN** no user has connected a Cosmo account
- **THEN** the line says no Cosmo account is connected

#### Scenario: Moderator's request
- **WHEN** a moderator who isn't an admin sends a request for the summary
- **THEN** it is refused, and no count is returned
