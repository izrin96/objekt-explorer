# web-verified-trades Specification

## Purpose
Accepted trades verified from on-chain transfers by the worker: each leg ticks off from indexer data, broken trades cancel or fail, stalled trades can be reported, and only verified trades earn feedback and the reputation line shown beside an account's name.

## Requirements

### Requirement: Legs verify from on-chain transfers
Each leg of an in-progress trade SHALL verify on its own, with nobody confirming it by hand, once the indexer records the matching transfer:
- **Specific objekt**: that objekt moves from an address of the giver to an address of the receiver, after the offer was sent.
- **Any copy**: an objekt of that collection moves the same way, no earlier than 10 minutes before the accept (the party accepting may have sent it just before pressing Accept).

An address counts for a party if it was linked to them when the trade was accepted, or is linked to them now. A move between two of the giver's own addresses SHALL not count, and SHALL not break the leg.

One transfer SHALL verify at most one leg. A transfer is identified by its transaction hash and token, so this SHALL hold even after the indexer is rebuilt from the chain. When more than one waiting leg could take the same transfer:
- a leg naming that specific objekt SHALL take it before any-copy legs;
- among the rest, the leg of the trade accepted first SHALL take it.

A verified leg SHALL record the transaction hash and time. When the last leg verifies, the trade SHALL become Completed.

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

#### Scenario: Sent with the offer
- **WHEN** the giver sends HyeRin 301Z #1203 right after sending the offer, and the receiver accepts an hour later
- **THEN** the leg verifies with that transfer

#### Scenario: A copy sent before the accept
- **WHEN** binary.bin sends the user a copy of Nien 205Z for another deal, and the user accepts an offer asking binary.bin for any copy of Nien 205Z the next day
- **THEN** that earlier transfer doesn't verify the any-copy leg

#### Scenario: Two trades between the same pair
- **WHEN** T-1040 and T-1042 each ask binary.bin for any copy of Nien 205Z, T-1040 was accepted first, and binary.bin sends one copy
- **THEN** T-1040's leg verifies, and T-1042's stays Waiting

#### Scenario: Indexer rebuilt
- **WHEN** the indexer is rebuilt from the chain while a trade with a verified any-copy leg has another trade's any-copy leg waiting for the same collection
- **THEN** the transfer that already verified the first leg doesn't verify the second

### Requirement: Broken trades
If a reserved objekt in an in-progress trade moves to anyone other than the receiver:
- with no leg verified yet and no received wrong copy held (see Wrong copy sent), the trade SHALL be Cancelled with the reason "an objekt left the wallet";
- with a leg already verified, or a received wrong copy held, the trade SHALL be marked Failed.

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

#### Scenario: Sold elsewhere after a wrong copy
- **WHEN** the giver sent a wrong copy that the receiver declined, then sends the asked-for objekt to a third account
- **THEN** the trade shows Failed, and Report a problem is offered at once

### Requirement: Wrong copy sent
While a specific-objekt leg of an in-progress trade is waiting, the system SHALL record a **wrong copy** for it when the indexer records a transfer that:
- moves an objekt of the leg's collection, other than the leg's own objekt;
- goes from an address of the giver to an address of the receiver (as "Legs verify from on-chain transfers" counts addresses);
- happened no earlier than 10 minutes before the accept;
- has not verified any leg.

A wrong copy SHALL be recorded within 3 minutes of the indexer recording its transfer. One transfer MAY be recorded against several waiting legs, but it SHALL verify at most one.

On the trade page, under the leg, the system SHALL name both serials, the wrong copy's transaction hash and how long ago it arrived:
- **The receiver** SHALL see Accept #542 and Decline. Accept SHALL ask for confirmation first, and SHALL then verify the leg with the wrong copy's transfer exactly as if the leg had asked for it, recording its hash and time. Decline SHALL close the wrong copy, and the leg SHALL keep waiting for its own objekt.
- **The giver** SHALL see that the receiver can accept it. Otherwise they still need to send the asked-for objekt. Once it's declined, they SHALL see that it was declined.

Only the receiver SHALL be able to accept or decline, and only while the trade is in progress and the leg is waiting. A refused request SHALL leave the trade unchanged. A leg verified through an accepted wrong copy SHALL show the serial that was received, with the asked-for serial beside it.

A trade with a received wrong copy that is still waiting on the receiver, or was declined, SHALL be treated as one where a transfer was made:
- Cancel SHALL be replaced by the locked note, as after a verified transfer.
- If it is still in progress `TRADE_EXPIRE_DAYS` after accept, it SHALL end Failed, not Cancelled, so Report a problem is offered.
- If a leg breaks (see Broken trades), it SHALL end Failed, not Cancelled.

A wrong copy SHALL stop being offered once its leg closes: the asked-for objekt verified, another wrong copy was accepted, or the trade ended.

#### Scenario: Our serial was off
- **WHEN** the trade asks for HyeRin 301Z #1203, and the giver sends the copy Cosmo shows as #1203, which our index has as #1207
- **THEN** within 3 minutes both parties see "sent #1207, this trade asks for #1203" under that leg, and the leg stays Waiting

#### Scenario: Receiver accepts
- **WHEN** the receiver accepts the wrong copy and confirms
- **THEN** the leg shows Verified with that transfer's hash and "#1207 in place of #1203", progress counts it, and the trade completes if it was the last leg

#### Scenario: Receiver declines
- **WHEN** the receiver declines the wrong copy
- **THEN** the leg stays Waiting, the giver sees it was declined, and Cancel stays locked for both parties

#### Scenario: Right copy arrives after a wrong one
- **WHEN** a wrong copy is waiting on the receiver, and the giver then sends the asked-for objekt
- **THEN** the leg verifies with that transfer, and the wrong copy is no longer offered

#### Scenario: Someone else tries to accept
- **WHEN** the giver, or an account outside the trade, asks to accept the wrong copy
- **THEN** it is refused, and the trade is unchanged

#### Scenario: Expires holding a wrong copy
- **WHEN** a trade with a declined wrong copy and no verified leg reaches its expiry
- **THEN** it ends Failed, both parties are notified, and Report a problem is offered

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
Either party SHALL be able to cancel an in-progress trade only while none of its legs is verified and it holds no received wrong copy that is waiting on the receiver or was declined (see Wrong copy sent). After that, Cancel SHALL be replaced by "Cancelling is locked after the first verified transfer".

#### Scenario: Locked
- **WHEN** one leg has verified and the other party opens the trade page
- **THEN** there is no Cancel action, and the locked note shows

#### Scenario: Locked by a wrong copy
- **WHEN** the giver has sent a wrong copy that the receiver has not accepted, and no leg is verified
- **THEN** neither party sees Cancel, and a request to cancel is refused

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
