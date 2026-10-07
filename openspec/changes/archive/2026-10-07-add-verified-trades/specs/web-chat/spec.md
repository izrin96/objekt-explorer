## ADDED Requirements

### Requirement: Trust line in the thread header
The conversation header SHALL show the other party's reputation line (see `web-verified-trades`) below their name.

#### Scenario: Header
- **WHEN** a user opens the conversation with rin.trades, who has 31 completed trades and all positive ratings
- **THEN** the header shows "31 verified · 100% · since Mar 2025"
