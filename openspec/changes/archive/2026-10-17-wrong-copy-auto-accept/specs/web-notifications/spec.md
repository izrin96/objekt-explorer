## MODIFIED Requirements

### Requirement: Trade notifications
Each party SHALL be notified when, in one of their trades:
- a leg verifies;
- the trade completes, with a prompt to leave feedback;
- the trade is cancelled or fails, with the reason;
- a stall reminder is due.

For a wrong copy (see `web-verified-trades` Wrong copy sent):
- its notification SHALL say when it counts as accepted;
- the receiver SHALL be reminded once, 24 hours before, while it is still pending, with the stall reminder's amber clock;
- both parties SHALL be notified when it is accepted automatically, with the green check of a verified transfer.

Notifications for one trade SHALL group into a single unread row, and opening one SHALL go to the trade page.

#### Scenario: Leg verified
- **WHEN** binary.bin's transfer of HyeRin 301Z #1203 to the user is verified
- **THEN** the bell shows "Transfer verified · T-1042 1 of 2", which opens the trade page

#### Scenario: Wrong copy due
- **WHEN** a wrong copy on T-1042 has 24 hours left and the receiver hasn't answered
- **THEN** the receiver's bell shows a reminder that it counts as accepted tomorrow unless they decline, which opens the trade page

#### Scenario: Accepted automatically
- **WHEN** that copy's deadline passes
- **THEN** both parties' bells show that #1207 was accepted in place of #1203 on T-1042
