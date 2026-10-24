# Spec Delta

## MODIFIED Requirements

### Requirement: Profile layout and privacy
`/@<nickname>` SHALL resolve a nickname or address to a profile, show its banner, identity,
linked socials when the owner allows, four summary counts and tabs for Collection, Activity
History (at `/@<nickname>/trades`), Progress, Statistics and Lists. Every profile SHALL show in full to every visitor. The owner SHALL see an Edit action opening the profile edit dialog.
An unknown nickname SHALL show the not-found surface.

#### Scenario: Private profile
- **WHEN** a visitor opens a profile that was marked private before this change
- **THEN** the full profile shows, with its objekts, pins and transfers

### Requirement: Trades, progress and statistics
The Activity History tab SHALL list the profile's transfers by type (all, mint, received, sent, spin)
with paging, to every visitor. The Progress tab SHALL
show per member and season how many of each class are owned versus total, excluding the
Welcome and Zero classes, with a chart per member. The Statistics tab SHALL chart the owned
collection by member and by season.

#### Scenario: Hidden transfers
- **WHEN** a visitor opens Activity History of a profile that hid its transfers before this change
- **THEN** the tab lists its transfers

#### Scenario: Progress excludes Welcome
- **WHEN** an address owns Welcome-class objekts
- **THEN** Progress totals do not count them

