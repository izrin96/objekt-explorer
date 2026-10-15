## MODIFIED Requirements

### Requirement: Reports with a trade attached
A report filed through Report a problem SHALL carry its trade. It may attach only a trade between the reporter and the reported account. The moderator console's account page SHALL show each attached trade:
- its status;
- when it was accepted;
- each leg's objekt, direction, state, transaction hash and time;
- for a leg verified through a wrong copy, the serial received, and whether the receiver accepted it or it was accepted automatically.

Attaching a trade SHALL add no message text beyond a shared excerpt. The usual once-per-24-hours report limit SHALL apply.

#### Scenario: Moderator sees the trade
- **WHEN** a user reports binary.bin from failed trade T-1042
- **THEN** the console shows T-1042 with one leg Verified (with its hash) and one leg broken

#### Scenario: Someone else's trade
- **WHEN** a request attaches a trade the reporter isn't part of
- **THEN** the report is refused

#### Scenario: Copy accepted automatically
- **WHEN** a moderator opens a report from T-1042, whose leg verified through a wrong copy nobody answered
- **THEN** that leg shows the serial received beside the asked-for one, marked accepted automatically
