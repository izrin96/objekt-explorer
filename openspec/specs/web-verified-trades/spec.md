# web-verified-trades Specification

## Purpose
Accepted trades verified from on-chain transfers by the worker: each leg ticks off from indexer data, broken trades cancel or fail, stalled trades can be reported, and only verified trades earn feedback and the reputation line shown beside an account's name.

## Requirements

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

A move away shortly before the accept counts too when the objekt never came back, since the accept's ownership check can trail the chain. A move away and back before the accept SHALL not break the trade.

#### Scenario: Sold elsewhere before sending
- **WHEN** the giver sends a reserved objekt to a third account, and no leg was verified
- **THEN** the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Sold just before the accept
- **WHEN** the giver sold a reserved objekt to a third account minutes before the accept, and the accept still saw it in their wallet
- **THEN** once the sale is indexed, the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Received but never returned
- **WHEN** one leg verified, then the other side sends its reserved objekt to someone else
- **THEN** the trade shows Failed, and Report a problem is offered at once

### Requirement: Offer upkeep
An open offer SHALL be marked Expired, and both parties notified, within 3 minutes of its 7-day expiry. An open offer whose specific objekt has left its owner's linked addresses SHALL be Cancelled with the reason "an objekt left the wallet", and both parties notified.

#### Scenario: Objekt sold on Market
- **WHEN** an open offer's give objekt is transferred to someone else
- **THEN** the offer shows Cancelled with the reason, and both parties are notified

### Requirement: Verification progress
The trade page SHALL show the trade's progress as a stepper of four steps:
1. Proposed, with its time;
2. Accepted, with its time;
3. Transfers, with "n of m";
4. Complete, with its time once the trade completes.

A done step is marked green and the current step indigo. On a failed trade the Transfers step is marked red; on a cancelled trade the steps after the last one reached stay unmarked.

Below the stepper, a table SHALL list each leg with three columns:
- **Objekt**: the thumbnail, the name, and the serial or "any copy";
- **Direction**: from whom to whom, as "You → rin.trades";
- **Status**, one of:
  - a green Verified chip with a check, the shortened transaction hash and how long ago;
  - an amber Waiting chip with a clock, and how recent the transfers the site has seen are ("transfers seen up to 1 minute ago");
  - a red Closed chip for a leg of an ended trade that never verified.

Below `sm` each row SHALL stack, with the status beside the objekt.

The trade's status chip SHALL be indigo in progress, green when completed and red when cancelled or failed. The summary "n of m transfers verified" SHALL also appear on the accepted offer's card in chat, linking to the trade page. Progress SHALL update in open tabs without a reload.

From `lg` up, a side panel SHALL sit beside the table; below `lg` it SHALL follow it. It holds, in order:
- **Who sends first?**, tinted indigo, while the trade is in progress (see Who sends first);
- **Rating**: before completion, what a rating counts toward, with the rating controls disabled; once completed, Rate this trade with the controls live (see Feedback);
- **If it stalls**, while the trade is in progress: the 72-hour reminder and when Report a problem becomes available.

#### Scenario: One leg in
- **WHEN** the first of two legs verifies while both parties have the trade open
- **THEN** both pages show that leg as a green Verified chip, the Transfers step as "1 of 2", and "1 of 2 transfers verified" without a reload

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** all four steps are green, the status chip reads Completed in green, and the side panel shows Rate this trade with the controls live

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** the side panel follows the transfers table, each leg's row stacks, and the page doesn't scroll sideways

#### Scenario: Seen up to
- **WHEN** a leg is waiting and the indexer has read the chain up to 40 seconds ago
- **THEN** its Waiting chip reads "transfers seen up to 40 seconds ago", worded as other relative times are

### Requirement: Who sends first
The trade page SHALL suggest which party sends first, the same way to both. When only one party gives objekts (a cash buy or sale), that party is suggested. Otherwise:
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

### Requirement: Indexer delay
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

While the indexer is behind:
- every in-progress trade page SHALL show a notice above the transfers table: transfers sent after a given time aren't seen yet, and nothing sent is lost;
- a trade SHALL NOT expire, and no stall reminder SHALL be sent, unless the indexer has read the chain past the moment the expiry or reminder was due;
- a request to cancel an in-progress trade SHALL be refused with "We can't see the latest transfers yet. Try again in a few minutes."

The notice SHALL disappear, and these rules SHALL lift, within 3 minutes of the indexer catching up. Any expiry or reminder that was held SHALL then happen as usual.

#### Scenario: Indexer stalled
- **WHEN** the indexer has recorded nothing past 14:02 and it is now 15:30
- **THEN** every in-progress trade page shows that transfers after 14:02 aren't seen yet

#### Scenario: Expiry held
- **WHEN** a trade reaches 14 days after accept while the indexer is 3 hours behind, and the giver's transfer happened 2 hours ago
- **THEN** the trade doesn't expire; once the indexer catches up, the leg verifies instead

#### Scenario: Cancel while behind
- **WHEN** a party who just received an objekt asks to cancel while the indexer is behind
- **THEN** the cancel is refused with the message, and the trade stays in progress

#### Scenario: Caught up
- **WHEN** the indexer catches up
- **THEN** within 3 minutes the notice is gone, and cancel, expiry and reminders behave as before

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
