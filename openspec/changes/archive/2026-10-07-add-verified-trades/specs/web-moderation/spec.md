## ADDED Requirements

### Requirement: Reports with a trade attached
A report filed through Report a problem SHALL carry its trade. It may attach only a trade between the reporter and the reported account. The moderator console's account page SHALL show each attached trade:
- its status;
- when it was accepted;
- each leg's objekt, direction, state, transaction hash and time.

Attaching a trade SHALL add no message text beyond a shared excerpt. The usual once-per-24-hours report limit SHALL apply.

#### Scenario: Moderator sees the trade
- **WHEN** a user reports binary.bin from failed trade T-1042
- **THEN** the console shows T-1042 with one leg Verified (with its hash) and one leg broken

#### Scenario: Someone else's trade
- **WHEN** a request attaches a trade the reporter isn't part of
- **THEN** the report is refused
