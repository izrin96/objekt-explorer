# Spec Delta

## ADDED Requirements

### Requirement: Cosmo connection expiry notices
When a live Cosmo session (see `web-cosmo-session`) has fewer than 14 days left, its owner SHALL get one notification that their Cosmo connection expires in N whole days, counted from the notice's creation. It SHALL be sent at most once per session per connect: a renew or reconnect SHALL allow one more before the new expiry, and a renew SHALL mark the unread one read. A session that ends first SHALL get none.

#### Scenario: Fourteen days out
- **WHEN** rin.t's session, connected by rin.trades, comes within 14 days of its expiry
- **THEN** within 10 minutes rin.trades's bell shows one unread row reading "Your Cosmo connection expires in 13 days. Renew it to keep sharing." with a Renew label, and it does not name rin.t

#### Scenario: Only once
- **WHEN** the worker runs again the next day and rin.t has not been renewed
- **THEN** no second notification is created for rin.t

#### Scenario: Renewed, then near the end again
- **WHEN** rin.trades renews rin.t while its notice is unread, and 166 days later rin.t comes within 14 days of its new expiry
- **THEN** the first notice is marked read at the renew, and a second notice is created for the new expiry

#### Scenario: Several accounts
- **WHEN** rin.trades's sessions rin.t and rin.second both come within 14 days of their expiry
- **THEN** rin.trades gets two notices, one per session

#### Scenario: Signed out first
- **WHEN** rin.t is signed out at Cosmo 20 days before its expiry and never reconnected
- **THEN** no expiry notice is created for it

### Requirement: Expiry notice in the bell
The expiry notice SHALL name no Cosmo nickname or address, and SHALL have its own wording for 1 day and for today. It SHALL lead with the clock tile, carry the verb label Renew, show under All only, and never be grouped with others. Activating it SHALL mark it read and open `/account/collection-data`. It SHALL have no setting in Notifications, as sanction notices have none.

#### Scenario: Open the notice
- **WHEN** rin.trades activates the notice
- **THEN** it is marked read and the URL is `/account/collection-data`, where rin.t's row offers Renew

#### Scenario: Not in the Trades tab
- **WHEN** rin.trades opens the Trades or Lists tab of the bell
- **THEN** the expiry notice is not listed there, and All lists it
