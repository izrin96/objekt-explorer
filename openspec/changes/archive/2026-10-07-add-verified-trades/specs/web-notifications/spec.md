## ADDED Requirements

### Requirement: Trade notifications
Each party SHALL be notified when, in one of their trades:
- a leg verifies;
- the trade completes, with a prompt to leave feedback;
- the trade is cancelled or fails, with the reason;
- a stall reminder is due.

Notifications for one trade SHALL group into a single unread row, and opening one SHALL go to the trade page.

#### Scenario: Leg verified
- **WHEN** binary.bin's transfer of HyeRin 301Z #1203 to the user is verified
- **THEN** the bell shows "Transfer verified · T-1042 1 of 2", which opens the trade page

## MODIFIED Requirements

### Requirement: Offer notifications
A user SHALL be notified when an offer:
- is received;
- is countered;
- they sent is accepted or declined;
- sent to them is withdrawn;
- expires;
- either way is cancelled, with the reason.

Notifications for one conversation SHALL group into a single unread row. Opening one SHALL go to the conversation, or to the trade page once the offer is accepted.

#### Scenario: Countered
- **WHEN** rin.trades counters the user's offer
- **THEN** the bell shows "rin.trades countered your offer O-881", which opens the conversation

#### Scenario: Expired
- **WHEN** an offer the user sent goes unanswered for 7 days
- **THEN** both parties are notified that it expired

### Requirement: Notification settings
The account dialog SHALL have a Notifications section with one switch per notification type:
- Want-list matches, on by default;
- Someone wants what you have, off by default;
- Offers, on by default;
- Trades, on by default.

Turning a type off SHALL stop new notifications of that type. Notifications already created SHALL stay.

#### Scenario: Turn off want-list matches
- **WHEN** the user turns Want-list matches off and a matching objekt is listed afterwards
- **THEN** no new notification is created for it

#### Scenario: Turn off offers
- **WHEN** the user turns Offers off and then receives an offer
- **THEN** no notification is created, and the offer still appears in the conversation and in My trades

#### Scenario: Turn off trades
- **WHEN** the user turns Trades off and a leg of their trade verifies
- **THEN** no notification is created, and the trade page still shows the leg Verified
