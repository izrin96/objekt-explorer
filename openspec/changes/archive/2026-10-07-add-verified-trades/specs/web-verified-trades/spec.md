## ADDED Requirements

### Requirement: Legs verify from on-chain transfers
Each leg of an in-progress trade SHALL verify on its own, with nobody confirming it by hand, once the indexer records the matching transfer:
- **Specific objekt**: that objekt moves from an address of the giver to an address of the receiver.
- **Any copy**: an objekt of that collection moves the same way.

An address counts for a party if it was linked to them when the trade was accepted, or is linked to them now. Only transfers made after the offer was sent SHALL count. A move between two of the giver's own addresses SHALL not count, and SHALL not break the leg. One transfer SHALL verify at most one leg. A verified leg SHALL record the transaction hash and time. When the last leg verifies, the trade SHALL become Completed.

A leg SHALL verify within 3 minutes of the indexer recording its transfer, even if a live update was missed.

#### Scenario: Both legs verify
- **WHEN** the user sends HyeRin 301Z #1203 to binary.bin, and binary.bin sends a copy of Nien 205Z back
- **THEN** both legs show Verified with their transaction hashes, and T-1042 shows Completed

#### Scenario: Own wallets first
- **WHEN** the giver moves the objekt from one of their linked addresses to another, then to the receiver
- **THEN** the leg verifies on the second transfer and is never marked broken

#### Scenario: Worker restarted
- **WHEN** the transfer happens while the worker is restarting
- **THEN** the leg still verifies within 3 minutes of the worker coming back

### Requirement: Broken trades
If a reserved objekt in an in-progress trade moves to anyone other than the receiver:
- with no leg verified yet, the trade SHALL be Cancelled with the reason "an objekt left the wallet";
- with a leg already verified, the trade SHALL be marked Failed.

Either way both parties SHALL be notified, and every reservation of the trade SHALL be released.

#### Scenario: Sold elsewhere before sending
- **WHEN** the giver sends a reserved objekt to a third account, and no leg was verified
- **THEN** the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Received but never returned
- **WHEN** one leg verified, then the other side sends its reserved objekt to someone else
- **THEN** the trade shows Failed, and Report a problem is offered at once

### Requirement: Offer upkeep
An open offer SHALL be marked Expired, and both parties notified, within 3 minutes of its 7-day expiry. An open offer whose specific objekt has left its owner's linked addresses SHALL be Cancelled with the reason "an objekt left the wallet", and both parties notified.

#### Scenario: Objekt sold on Market
- **WHEN** an open offer's give objekt is transferred to someone else
- **THEN** the offer shows Cancelled with the reason, and both parties are notified

### Requirement: Verification progress
The trade page SHALL show, for each leg:
- Waiting, with when the transfers were last checked;
- or Verified, with a shortened transaction hash and how long ago.

It SHALL also show the summary "n of m transfers verified". The accepted offer's card in chat SHALL show the same summary, linking to the trade page. Progress SHALL update in open tabs without a reload.

#### Scenario: One leg in
- **WHEN** the first of two legs verifies while both parties have the trade open
- **THEN** both pages show that leg Verified and "1 of 2 transfers verified" without a reload

### Requirement: Who sends first
The trade page SHALL suggest which party sends first, the same way to both:
- the party with fewer verified trades sends first;
- on a tie, the newer account sends first.

It SHALL say when the suggested party has already sent ("You did, so it's their turn"). The suggestion SHALL NOT block either party.

#### Scenario: Newer trader
- **WHEN** binary.bin has 31 verified trades and the user has 2
- **THEN** both see "We suggested you send first"

### Requirement: Cancel locks after the first transfer
Either party SHALL be able to cancel an in-progress trade only while none of its legs is verified. After that, Cancel SHALL be replaced by "Cancelling is locked after the first verified transfer".

#### Scenario: Locked
- **WHEN** one leg has verified and the other party opens the trade page
- **THEN** there is no Cancel action, and the locked note shows

### Requirement: Stalled trades
72 hours after accept, each party who still owes a transfer SHALL be reminded once. A trade SHALL offer Report a problem in either case:
- it is still in progress 7 days after accept;
- it has failed.

Report a problem files a report against the other party, with the trade attached.

#### Scenario: Reminder
- **WHEN** 72 hours pass after accept and the user's leg is still waiting
- **THEN** the user gets one reminder notification for that trade

#### Scenario: Report after a week
- **WHEN** a trade is still in progress 7 days after accept
- **THEN** its page offers Report a problem, which opens the report dialog with the trade attached

### Requirement: Feedback
After a trade completes, each party SHALL be able to rate the other Positive, Neutral or Negative, and change that rating for 14 days after completion. Only Completed trades SHALL accept feedback. Single ratings SHALL never be shown to anyone but their author; they count only toward totals.

#### Scenario: Rate a completed trade
- **WHEN** the user rates binary.bin Positive on completed T-1042
- **THEN** the page shows the user's rating, and binary.bin's positive share includes it

#### Scenario: Not completed
- **WHEN** a request rates a trade that is still in progress
- **THEN** it is refused

### Requirement: Reputation
An account's reputation SHALL be:
- its count of completed trades;
- its share of positive ratings among positive and negative ones (neutral ratings don't count), shown once it has at least one;
- the month the account was created.

It SHALL show as one line, for example "31 verified · 100% · since Mar 2025", or "No verified trades yet". It SHALL show only where the account is already named.

#### Scenario: New trader
- **WHEN** a viewer sees a post by an account with no completed trades
- **THEN** its line reads "No verified trades yet"
