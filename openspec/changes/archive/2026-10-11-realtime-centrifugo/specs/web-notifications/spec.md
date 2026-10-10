## MODIFIED Requirements

### Requirement: Open tabs stay current
While a signed-in page is open, a new notification or a change in read state SHALL appear in the bell within 5 seconds when the per-user live connection is open. Without the connection, it SHALL appear when the window regains focus or within 60 seconds. The live connection SHALL require a valid session and SHALL refuse a connection whose `Origin` is not the site's own origin. It SHALL only deliver events for the account whose session opened it, and its credentials SHALL expire within 15 minutes unless renewed by a still-valid session. A dropped connection SHALL reconnect with backoff; events missed during a drop of up to 5 minutes SHALL be replayed, and after a longer drop the client SHALL refetch, so nothing missed while disconnected is lost. When the account's sessions are revoked, its open connections SHALL close and the tabs SHALL not reconnect.

#### Scenario: Live arrival
- **WHEN** a want-list alert is created for a user with the site open
- **THEN** the bell's count rises within 5 seconds without user action

#### Scenario: Cross-site page
- **WHEN** a page on another origin tries to open the per-user connection with the user's cookies
- **THEN** the connection is refused and no event is delivered

#### Scenario: No session
- **WHEN** the per-user connection is requested without a valid session
- **THEN** it is refused

#### Scenario: Signed out elsewhere
- **WHEN** the user signs out in another tab and this tab's connection credentials come up for renewal
- **THEN** renewal is refused, the connection closes and no further events are delivered

#### Scenario: Banned
- **WHEN** a moderator bans a user who has two tabs open
- **THEN** both tabs lose their connection within 5 seconds, do not reconnect, and show the signed-out state
