## MODIFIED Requirements

### Requirement: Trade notifications
Each party SHALL be notified when, in one of their trades:
- a leg verifies;
- the trade completes, with a prompt to leave feedback;
- the trade is cancelled or fails, with the reason;
- a stall reminder is due;
- the other party asks to cancel it (see `web-verified-trades` Ask to cancel);
- the other party declines their request to cancel it.

Withdrawing a request to cancel SHALL notify nobody.

For a wrong copy (see `web-verified-trades` Wrong copy sent):
- its notification SHALL say when it counts as accepted;
- the receiver SHALL be reminded once, 24 hours before, while it is still pending, with the stall reminder's clock;
- both parties SHALL be notified when it is accepted automatically, with the check of a verified transfer.

Notifications for one trade SHALL show as a single row, read or not (see Notification bell and popover), and opening one SHALL go to the trade page.

#### Scenario: Leg verified
- **WHEN** binary.bin's transfer of HyeRin 301Z #1203 to the user is verified
- **THEN** the bell shows "binary.bin's transfer is verified" with the chip T-1042 and "1 of 2", which opens the trade page

#### Scenario: Asked to cancel
- **WHEN** binary.bin asks to cancel T-1042
- **THEN** the user's bell shows "binary.bin asked to cancel" with the chip T-1042, which opens the trade page

#### Scenario: Cancelled by agreement
- **WHEN** the user accepts binary.bin's request to cancel T-1042
- **THEN** binary.bin's bell shows that T-1042 was cancelled by agreement

#### Scenario: Request declined
- **WHEN** the user declines binary.bin's request to cancel T-1042
- **THEN** binary.bin's bell shows that the user declined, and that the trade carries on

#### Scenario: Wrong copy due
- **WHEN** a wrong copy on T-1042 has 24 hours left and the receiver hasn't answered
- **THEN** the receiver's bell shows a reminder that it counts as accepted tomorrow unless they decline, which opens the trade page

#### Scenario: Accepted automatically
- **WHEN** that copy's deadline passes
- **THEN** both parties' bells show that #1207 was accepted in place of #1203 on T-1042
