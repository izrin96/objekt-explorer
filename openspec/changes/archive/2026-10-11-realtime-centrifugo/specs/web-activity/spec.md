## MODIFIED Requirements

### Requirement: Live updates
While the page is open the feed SHALL receive new transfers over a live connection, prepend them with a brief highlight, hold them while the pointer is over the table and release them on leave. When the page opens, the feed SHALL also show the most recent live transfers, up to 50, that the first page has not yet loaded. After a dropped connection it SHALL reconnect and add the transfers missed during a drop of up to 5 minutes, without duplicating rows. The live connection SHALL need no session.

#### Scenario: Hover holds
- **WHEN** new transfers arrive while the pointer is over the table
- **THEN** no row moves until the pointer leaves, and then they appear at the top highlighted

#### Scenario: Short drop
- **WHEN** the connection drops for 20 seconds while 4 transfers are indexed
- **THEN** after it reconnects those 4 appear once each, in order

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/activity`
- **THEN** new transfers still arrive live
