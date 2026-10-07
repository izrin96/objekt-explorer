## ADDED Requirements

### Requirement: Bell links to its settings
The bell's popover SHALL offer a Notification settings link opening `/account/notifications`.

#### Scenario: Open settings from the bell
- **WHEN** the user opens the bell and activates Notification settings
- **THEN** the URL is `/account/notifications` and the popover is closed

## MODIFIED Requirements

### Requirement: Notification settings
The Notifications section of the account page (`/account/notifications`) SHALL have one switch per notification type:
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
