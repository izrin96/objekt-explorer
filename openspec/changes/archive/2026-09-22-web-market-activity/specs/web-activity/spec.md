## Purpose

The site-wide transfer feed of `apps/web`: what moved recently, filtered by event type and
collection, updated live.

## ADDED Requirements

### Requirement: Paged transfer feed
`/activity` SHALL list transfers newest first with sender, receiver, objekt and time,
loading older pages on demand, filtered by event type (`all`, `mint`, `transfer`, `spin`)
and by the collection facets, with the type carried on the URL. Nicknames the owner hides
SHALL be shown as addresses.

#### Scenario: Type filter
- **WHEN** the user selects Spin
- **THEN** the URL carries `type=spin` and every row's receiver is the spin address

### Requirement: Live updates
While the page is open the feed SHALL receive new transfers over a WebSocket, prepend them
with a brief highlight, hold them while the pointer is over the table and release them on
leave, and reconnect after a dropped connection without duplicating rows.

#### Scenario: Hover holds
- **WHEN** new transfers arrive while the pointer is over the table
- **THEN** no row moves until the pointer leaves, and then they appear at the top highlighted
