# Spec Delta

## Purpose

Keeping connected Cosmo sessions in use between syncs, so Cosmo does not end them for being idle, within the site's fixed load on Cosmo, and recording how long the sessions that end anyway lived.

## ADDED Requirements

### Requirement: Live sessions are kept in use
With keep-alive on, the site SHALL send one light request with each live session whose last use is at least its keep-alive age: 20 to 25 minutes, fixed per session so sessions spread out. A session SHALL NOT be touched before that age, after its 180 days, or while its stored sign-in cannot be read. While runs keep their 5-minute schedule and the cap is not reached, no live session SHALL go more than 35 minutes without use.

#### Scenario: Idle for 24 minutes
- **WHEN** rin.t's keep-alive age is 22 minutes and its last use was 24 minutes ago
- **THEN** the next run sends one request with rin.t's session and records it as used now

#### Scenario: Just synced
- **WHEN** rin.t's sync finished 3 minutes ago
- **THEN** no keep-alive request is sent with rin.t's session in this run

#### Scenario: Just connected
- **WHEN** rin.trades connected rin.t 10 minutes ago and it has not been used since
- **THEN** rin.t is not touched until its keep-alive age has passed since the connect

#### Scenario: Unreadable sign-in
- **WHEN** rin.t's stored sign-in cannot be opened with the current key
- **THEN** no keep-alive request is sent for rin.t, and its row is left as it was

### Requirement: Last use counts only answered requests
A session's last use SHALL be the time Cosmo last answered one of its requests successfully, from a keep-alive or a sync. A request that fails or gets no answer SHALL NOT count as use.

#### Scenario: Sync answered
- **WHEN** Cosmo answers the first request of rin.t's sync
- **THEN** rin.t's last use is the time of that answer

#### Scenario: Sync during an outage
- **WHEN** rin.t's sync request times out
- **THEN** rin.t's last use stays as it was, so the next run touches rin.t once its keep-alive age has passed

### Requirement: Keep-alive stays within the fixed load on Cosmo
Keep-alive requests SHALL count against the same budget as syncs: one request at a time, at least one second apart, 50 in a 5-minute run and 600 in an hour together. A run SHALL send at most 20 keep-alive requests, before any sync, to the sessions longest unused first, leaving at least 30 to syncs.

#### Scenario: More sessions due than a run allows
- **WHEN** 150 sessions are past their keep-alive age at the start of a run
- **THEN** the 20 longest unused are touched, the run's syncs send at most 30 requests, and the rest are touched on later runs, longest unused first

#### Scenario: Due for both
- **WHEN** rin.t is past its keep-alive age and also due for its 72-hour sync
- **THEN** rin.t is touched first, and its sync still runs in the same run when the budget allows

### Requirement: A keep-alive reads and stores nothing else
A keep-alive SHALL read nothing from Cosmo's answer except its status. It SHALL store only the time of last use, and never a nickname, address or other account data. No log line or error report SHALL carry a session's sign-in, nickname or address.

#### Scenario: Touch answered
- **WHEN** Cosmo answers rin.t's keep-alive with its profile
- **THEN** only rin.t's last use changes on its row, and no log line names rin.t's nickname or address

### Requirement: Keep-alive outcomes
A session Cosmo refuses with its own error SHALL be marked signed out exactly as a refused sync marks it. Any other failure SHALL leave the session live, its row unchanged, and its place in the sync queue unchanged, to be touched again on the next run.

#### Scenario: Signed out at Cosmo
- **WHEN** Cosmo answers rin.t's keep-alive as unauthorized with its own error
- **THEN** rin.t's row shows signed out with Reconnect, its stored sign-in is erased, and no further request is sent with it

#### Scenario: Firewall page
- **WHEN** Cosmo answered earlier keep-alives in the run, and rin.t's gets a forbidden answer that is not Cosmo's own error
- **THEN** rin.t stays live, its row shows no new failure, and the next run touches it again

#### Scenario: Server error after other answers
- **WHEN** Cosmo answered 4 keep-alives in a run and then answers rin.t's with a server error
- **THEN** rin.t stays live with its next sync time unchanged, and the next run touches it again

### Requirement: Keep-alive and Cosmo's outages
When a run's first request to Cosmo fails as busy, unavailable or blocked, the run SHALL stop sending, sync nothing and begin the backoff. During a backoff, a run SHALL send at most 5 keep-alive requests, stop at the first failure, and neither end nor extend the backoff; syncs SHALL wait for the backoff to end.

#### Scenario: Cosmo down at the first touch
- **WHEN** the run's first keep-alive request times out and no backoff is running
- **THEN** no further request is sent in that run, nothing is synced, and a 5-minute backoff begins

#### Scenario: During a backoff
- **WHEN** a 20-minute backoff is running and 8 sessions are past their keep-alive age
- **THEN** the run touches the 5 longest unused while Cosmo answers, sends no sync request, and the backoff still ends at its time

#### Scenario: Still down during a backoff
- **WHEN** a backoff is running and the run's first keep-alive request fails
- **THEN** the run sends no other request, and the backoff keeps its end time and length

### Requirement: Keep-alive is switched on by the operator
Keep-alive SHALL be off unless the worker's environment turns it on. With it off, no keep-alive request SHALL be sent and syncs SHALL behave as before. A value other than on or off SHALL be treated as off and logged as a warning once per start.

#### Scenario: Default
- **WHEN** the worker starts with no keep-alive setting
- **THEN** no keep-alive request is sent, and each session is used only by its syncs

#### Scenario: Misspelt value
- **WHEN** the worker starts with the keep-alive setting `yes`
- **THEN** keep-alive stays off and the worker logs one warning

### Requirement: Sessions that end while kept are counted
When a keep-alive finds a session signed out, the run's summary SHALL say how long the session lived since it was connected, and whether its last use was under 45 minutes before (ended while kept) or not, with no session id, nickname or address. The hourly summary SHALL count touches, signed-out finds, sessions the cap left untouched and the longest idle time at a touch.

#### Scenario: Ended while kept
- **WHEN** rin.t, connected 26 hours ago and touched 24 minutes ago, answers its next keep-alive as signed out
- **THEN** the run's summary records one session ended while kept, after 26 hours

#### Scenario: Missed touches
- **WHEN** a session last used 70 minutes ago, after a long backoff, answers its keep-alive as signed out
- **THEN** the run's summary records it as not kept, so it is not counted toward Cosmo's absolute lifetime
