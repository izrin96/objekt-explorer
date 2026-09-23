# web-live Specification

## Purpose
Cosmo live sessions on `apps/web`: a token-gated list per artist and a player page.

## Requirements

### Requirement: Access gate
`/live` SHALL always show the terms notice. The sessions list and `/live/<id>` SHALL be
available only when the `token` search value matches the server's bypass key; otherwise
the list is hidden and `/live/<id>` redirects to `/live`. Cards SHALL carry the token to
the detail page.

#### Scenario: No token
- **WHEN** a visitor opens `/live/abc` without a valid token
- **THEN** the URL becomes `/live` and only the notice is shown

### Requirement: Sessions list
With access, `/live` SHALL show one tab per selected artist and list that artist's sessions
with thumbnail, title, channel and live or ended state, refreshed no more often than every
five minutes.

#### Scenario: Ended session
- **WHEN** a session in the list has ended
- **THEN** its card shows the ended state and still opens the detail page

### Requirement: Player
`/live/<id>` SHALL play a live session's video with mute, volume and fullscreen controls,
show the channel identity, a running duration in days, hours, minutes and seconds, and the
participant count; an ended session SHALL show the ended layout instead of the player. An
unknown id SHALL show the not-found surface.

#### Scenario: Duration over a day
- **WHEN** a session has run for 25 hours and 3 minutes
- **THEN** the duration reads one day, one hour and three minutes, not 25 hours plus a day
