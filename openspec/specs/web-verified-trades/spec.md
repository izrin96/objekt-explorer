# web-verified-trades Specification

## Purpose
Accepted trades verified from on-chain transfers by the worker: each leg ticks off from indexer data, broken trades cancel or fail, stalled trades can be reported, and only verified trades earn feedback and the reputation line shown beside an account's name.

## Requirements

### Requirement: Legs verify from on-chain transfers
Each leg of an in-progress trade SHALL verify on its own, with nobody confirming it by hand, once the indexer records the matching transfer (the receiver can also close a waiting leg by hand, see Receiver confirms a leg):
- **Specific objekt**: that objekt moves from an address of the giver to an address of the receiver, after the offer was sent; or, after the accept, it moves to an address of the receiver from any address, so an objekt routed through another wallet (such as the giver's other account) still delivers.
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

#### Scenario: Through another account's wallet
- **WHEN** after the accept the giver moves HyeRin 301Z #1203 to a wallet linked to their other account, and that wallet sends #1203 to the receiver
- **THEN** the leg verifies with the second transfer and is never marked broken

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
If a reserved objekt in an in-progress trade moves to anyone other than the receiver, and it is still away from both the giver and the receiver 72 hours after it left, as read by the indexer (see Indexer delay), its leg breaks. A leg holding a pending wrong copy sent before the objekt left accepts that copy instead (see Wrong copy sent). When a leg breaks:
- with no leg verified yet and no received wrong copy held (see Wrong copy sent), the trade SHALL be Cancelled with the reason "an objekt left the wallet";
- with a leg already verified, or a received wrong copy held, the trade SHALL be marked Failed.

Either way both parties SHALL be notified, and every reservation of the trade SHALL be released. The break SHALL count from when the objekt left.

If the objekt comes back to an address of the giver, or is delivered to the receiver (see Legs verify from on-chain transfers), within the 72 hours, the leg SHALL not break. A return or delivery after the 72 hours SHALL not undo the break, even when the indexer reads both in one check. A move away before the accept follows the same rule, and a move away and back before the accept SHALL not break the trade.

#### Scenario: Sold elsewhere before sending
- **WHEN** the giver sends a reserved objekt to a third account, no leg was verified, and the objekt is still there 72 hours later
- **THEN** the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Sold just before the accept
- **WHEN** the giver sold a reserved objekt to a third account minutes before the accept, the accept still saw it in their wallet, and it never comes back
- **THEN** 72 hours after the sale, once it is indexed, the trade shows Cancelled with the reason, and both parties are notified

#### Scenario: Received but never returned
- **WHEN** one leg verified, then the other side sends its reserved objekt to someone else, and it stays there for 72 hours
- **THEN** the trade shows Failed, and Report a problem is offered at once

#### Scenario: Moved away and back
- **WHEN** one leg verified, the giver moves the objekt they owe to another wallet, gets it back 2 minutes later and sends it to the receiver
- **THEN** the trade never shows Failed, and Completes when that leg verifies

#### Scenario: Back after a day and a half
- **WHEN** the objekt left the giver 36 hours ago and comes back now
- **THEN** the leg is waiting again, the warning is gone, and the trade carries on

#### Scenario: Back after four days
- **WHEN** the objekt left the giver 96 hours ago and comes back now
- **THEN** the trade already ended at the 72-hour mark, and its return changes nothing

#### Scenario: Sold elsewhere after a wrong copy
- **WHEN** the giver sent a wrong copy that the receiver declined, then sends the asked-for objekt to a third account, and it stays there for 72 hours
- **THEN** the trade shows Failed, and Report a problem is offered at once

#### Scenario: Wrong copy and sale seen together
- **WHEN** the giver sends a wrong copy of #1203, then sells #1203 to a third account, the verifier reads both in one check, and #1203 stays away for 72 hours
- **THEN** the copy is accepted automatically at the 72-hour mark, as if it had been read first, and the trade carries on

#### Scenario: Copy of the sold objekt sent after the sale
- **WHEN** the giver sells #1203 to a third account, then sends another copy of its collection, and #1203 stays away for 72 hours
- **THEN** that copy is not held for #1203's leg, and with nothing else sent the trade shows Cancelled

#### Scenario: Wrong copy on another leg after the sale
- **WHEN** the giver sells the objekt of one leg, then sends a wrong copy for another leg they owe, and the sold objekt stays away for 72 hours
- **THEN** the trade shows Failed: the receiver holds that copy, and Report a problem covers it

#### Scenario: Sold while a wrong copy is pending
- **WHEN** the trade asks for HyeRin 301Z #537, a wrong copy #542 is pending, the giver then sells #537 to a third account, and #537 stays away for 72 hours
- **THEN** #542 is accepted automatically, the leg shows Verified "#542 in place of #537", and the trade carries on

#### Scenario: Indexer behind at the deadline
- **WHEN** the 72 hours pass while the indexer is 2 hours behind, and the objekt came back 1 hour before the deadline
- **THEN** once the indexer catches up the leg is still waiting, and the trade carries on

#### Scenario: Already away when this shipped
- **WHEN** a reserved objekt left the giver 30 hours before the 72-hour grace shipped, and is still away
- **THEN** its leg is still waiting, and it breaks 72 hours after the objekt left unless it is back, delivered or confirmed first

### Requirement: Wrong copy sent
While a specific-objekt leg of an in-progress trade is waiting, the system SHALL record a **wrong copy** for it when the indexer records a transfer that:
- moves an objekt of the leg's collection, other than the leg's own objekt;
- goes from an address of the giver to an address of the receiver (as "Legs verify from on-chain transfers" counts addresses);
- happened no earlier than 10 minutes before the accept;
- has not verified any leg.

A wrong copy SHALL be recorded within 3 minutes of the indexer recording its transfer. One transfer MAY be recorded against several waiting legs, but it SHALL verify at most one.

On the trade page, the leg's card SHALL name the serial sent beside the asked-for serial, with the wrong copy's transaction hash and how long ago it arrived. The next-step banner SHALL carry the decision (see Next-step states):
- **The receiver** SHALL see Accept #542 and Decline. Accept SHALL ask for confirmation first, and SHALL then verify the leg with the wrong copy's transfer exactly as if the leg had asked for it, recording its hash and time. Decline SHALL close the wrong copy, and the leg SHALL keep waiting for its own objekt.
- **The giver** SHALL see that the receiver can accept it. Otherwise they still need to send the asked-for objekt. Once it's declined, the leg's card SHALL show that it was declined.

Only the receiver SHALL be able to accept or decline, and only while the trade is in progress and the leg is waiting. A refused request SHALL leave the trade unchanged. A leg verified through an accepted wrong copy SHALL show the serial that was received, with the asked-for serial beside it.

A pending wrong copy SHALL count as accepted, with nobody pressing Accept, at the first of:
- **its deadline**, 72 hours after it was recorded;
- **the trade's expiry**, `TRADE_EXPIRE_DAYS` after accept;
- **its leg breaking**: the asked-for objekt leaving the giver (see Broken trades).

Each of these SHALL wait until the indexer has read the chain past it (see Indexer delay), so an asked-for objekt sent in time verifies the leg first. Accepting it SHALL verify the leg exactly as Accept does, and mark the leg as accepted automatically. Of several pending copies on one leg, the earliest sent SHALL be accepted. A copy whose transfer has verified another leg SHALL no longer be offered or accepted. Moving the copy on from the receiver's wallet SHALL not stop it.

The receiver SHALL see when the copy counts as accepted ("Counts as accepted on Oct 18 unless you decline"), and the giver that it will be. Decline SHALL stay possible until then, and a declined copy SHALL never be accepted.

A trade with a received wrong copy that is still waiting on the receiver, or was declined, SHALL be treated as one where a transfer was made:
- Cancel trade SHALL show disabled with the locked note, as after a verified transfer.
- With a declined copy, if it is still in progress `TRADE_EXPIRE_DAYS` after accept, it SHALL end Failed, not Cancelled, so Report a problem is offered.
- With a declined copy, if a leg breaks (see Broken trades), it SHALL end Failed, not Cancelled.

A wrong copy SHALL stop being offered once its leg closes: the asked-for objekt verified, another wrong copy was accepted, or the trade ended.

A copy that was already pending when this rule shipped SHALL have its 72 hours counted from then.

#### Scenario: Our serial was off
- **WHEN** the trade asks for HyeRin 301Z #1203, and the giver sends the copy Cosmo shows as #1203, which our index has as #1207
- **THEN** within 3 minutes both parties see "sent #1207, this trade asks for #1203" in the banner, the leg's card shows "Sent #1207 instead" with its hash, and the leg stays Waiting

#### Scenario: Receiver accepts
- **WHEN** the receiver accepts the wrong copy and confirms
- **THEN** the leg shows Verified with that transfer's hash and "#1207 in place of #1203", progress counts it, and the trade completes if it was the last leg

#### Scenario: Receiver declines
- **WHEN** the receiver declines the wrong copy
- **THEN** the leg stays Waiting, the giver's card shows the copy as Declined, and Cancel trade stays locked for both parties

#### Scenario: Right copy arrives after a wrong one
- **WHEN** a wrong copy is waiting on the receiver, and the giver then sends the asked-for objekt
- **THEN** the leg verifies with that transfer, and the wrong copy is no longer offered

#### Scenario: Someone else tries to accept
- **WHEN** the giver, or an account outside the trade, asks to accept the wrong copy
- **THEN** it is refused, and the trade is unchanged

#### Scenario: Expires holding a wrong copy
- **WHEN** a trade with a declined wrong copy and no verified leg reaches its expiry
- **THEN** it ends Failed, both parties are notified, and Report a problem is offered

#### Scenario: No answer
- **WHEN** a wrong copy #1207 has waited on the receiver for 72 hours, and the indexer has read past that time
- **THEN** within 3 minutes the leg shows Verified "#1207 in place of #1203", marked accepted automatically, and the trade completes if it was the last leg

#### Scenario: Deadline while the indexer is behind
- **WHEN** a wrong copy's 72 hours pass while the indexer is 2 hours behind, and the giver sent the asked-for objekt an hour before the deadline
- **THEN** once the indexer catches up the leg verifies with the asked-for objekt, and the wrong copy is no longer offered

#### Scenario: Expiry first
- **WHEN** a wrong copy is recorded on day 13, and the trade reaches its 14-day expiry with that copy still pending
- **THEN** the copy is accepted then, and the trade ends as its legs decide instead of Failed for the copy

#### Scenario: Several copies
- **WHEN** a leg holds pending copies #1207 and #1209, sent in that order, and the deadline passes
- **THEN** #1207 is accepted, and #1209 is no longer offered

#### Scenario: Declined stays declined
- **WHEN** the receiver declined a wrong copy, and 72 hours pass
- **THEN** the leg keeps waiting for its own objekt

### Requirement: Offer upkeep
An open offer SHALL be marked Expired, and both parties notified, within 3 minutes of its 7-day expiry. An open offer whose specific objekt has left its owner's linked addresses SHALL be Cancelled with the reason "an objekt left the wallet", and both parties notified.

#### Scenario: Objekt sold on Market
- **WHEN** an open offer's give objekt is transferred to someone else
- **THEN** the offer shows Cancelled with the reason, and both parties are notified

### Requirement: Verification progress
The trade page SHALL show the trade's progress as a stepper of four steps, along the bottom of the status card (see Next-step banner). Each step is a slim segment with its label and detail on one line:
1. Proposed, with its date;
2. Accepted, with its date;
3. Transfers, with "n of m";
4. Complete, with its date once the trade completes.

While the trade is in progress, Proposed and Accepted SHALL be marked neutral grey, and Transfers SHALL be the only coloured step: indigo, or amber while a different copy waits on a decision, its label in the step's colour. A completed trade marks all four green. On a failed trade the Transfers step is marked red. On a cancelled trade the steps after the last one reached stay unmarked. A step with no detail shows only its label. The current step SHALL be announced as current, and each step as done or not yet, to assistive technology.

The trade page SHALL carry exactly one status chip, in the status card. Its colour follows the card's tone: indigo in progress, amber for a decision or a stuck objekt, green when completed, red when failed and grey when cancelled. On the trade page, "n of m" SHALL appear only in the stepper and the exchange's summary line. The summary "n of m transfers verified" SHALL appear on the accepted offer's card in chat, linking to the trade page. Progress SHALL update in open tabs without a reload, and the change to "n of m" SHALL be announced politely.

From `lg` up, a side panel SHALL sit beside the status card and the exchange, holding the Trading with card and the Timeline. Below `lg` both SHALL follow the exchange.

#### Scenario: One leg in
- **WHEN** the first of two legs verifies while both parties have the trade open
- **THEN** both pages show that leg's card with a green Verified chip and the Transfers step as "1 of 2" without a reload

#### Scenario: In progress colours
- **WHEN** the user opens a trade in progress with no decision pending
- **THEN** Proposed and Accepted are grey, Transfers is indigo, Complete is unmarked, and the only status chip on the page is in the status card

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** all four steps are green, the status chip reads Completed in green, and the side panel shows the Timeline

#### Scenario: Cancelled is grey throughout
- **WHEN** the user opens a cancelled trade
- **THEN** the status card, its chip and the legs' chips are grey, and nothing on the page is red

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** the side panel's cards follow the exchange, the columns stack, and the page doesn't scroll sideways

#### Scenario: Seen up to
- **WHEN** a leg is waiting and the indexer has read the chain up to 40 seconds ago
- **THEN** the leg's card shows its Waiting chip with no "transfers seen up to" line, and no indexer notice shows

### Requirement: Who sends first
The trade page SHALL suggest which party sends first, the same way to both. When only one party gives objekts (a cash buy or sale), that party is suggested. Otherwise:
- the party with more unfinished trades sends first;
- on a tie, the party with fewer verified trades sends first;
- on a tie, the newer account sends first.

When both parties give, the next-step banner SHALL carry the suggestion while it shows Your turn, saying it is a suggestion that stops neither party. In every other in-progress state, the trade's clock SHALL carry it in one line. It SHALL say when the suggested party has already sent ("You did, so it's their turn"). The suggestion SHALL NOT block either party.

#### Scenario: Newer trader
- **WHEN** binary.bin has 31 verified trades and the user has 2, and neither has unfinished trades
- **THEN** the user's banner reads "We suggested you send first", and binary.bin's that the user was suggested to send first

#### Scenario: Unfinished outweighs verified
- **WHEN** binary.bin has 31 verified trades and 1 unfinished, and the user has 2 verified and none unfinished
- **THEN** both see that binary.bin was suggested to send first

#### Scenario: Suggested party sent
- **WHEN** the user was suggested, has sent everything they give, and binary.bin still owes
- **THEN** the user's banner shows Their turn, and the clock reads "We suggested you send first. You did, so it's their turn."

### Requirement: Cancel locks after the first transfer
Either party SHALL be able to cancel an in-progress trade only while none of its legs is verified and it holds no received wrong copy that is waiting on the receiver or was declined (see Wrong copy sent). After that, Cancel trade SHALL show disabled in the actions menu with "Cancelling is locked after the first verified transfer", and the banner SHALL not offer it.

#### Scenario: Locked
- **WHEN** one leg has verified and the other party opens the trade page
- **THEN** Cancel trade can't be used, the menu shows it disabled with the locked note, and the banner doesn't offer it

#### Scenario: Locked by a wrong copy
- **WHEN** the giver has sent a wrong copy that the receiver has not accepted, and no leg is verified
- **THEN** neither party can use Cancel trade, and a request to cancel is refused

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
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded, or, when a transfer is held waiting for its objekt's metadata, the time just before the oldest held transfer, whichever is earlier. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

While the indexer is behind:
- every in-progress trade page SHALL show a notice once, as a neutral strip above the status card: transfers sent after a given time aren't seen yet, and nothing sent is lost;
- a trade SHALL NOT expire, and no stall reminder SHALL be sent, unless the indexer has read the chain past the moment the expiry or reminder was due;
- a request to cancel an in-progress trade SHALL be refused with "We can't see the latest transfers yet. Try again in a few minutes."

The notice SHALL disappear, and these rules SHALL lift, within 3 minutes of the indexer catching up. Any expiry or reminder that was held SHALL then happen as usual.

#### Scenario: Indexer stalled
- **WHEN** the indexer has recorded nothing past 14:02 and it is now 15:30
- **THEN** every in-progress trade page shows, above the status card, that transfers after 14:02 aren't seen yet

#### Scenario: Notice not repeated
- **WHEN** the indexer is behind and the trade is past its expiry
- **THEN** the strip is the only place that explains the delay; the deadline and the Timeline say only that the end is paused

#### Scenario: Expiry held
- **WHEN** a trade reaches 14 days after accept while the indexer is 3 hours behind, and the giver's transfer happened 2 hours ago
- **THEN** the trade doesn't expire; once the indexer catches up, the leg verifies instead

#### Scenario: Cancel while behind
- **WHEN** a party who just received an objekt asks to cancel while the indexer is behind
- **THEN** the cancel is refused with the message, and the trade stays in progress

#### Scenario: Caught up
- **WHEN** the indexer catches up
- **THEN** within 3 minutes the notice is gone, and cancel, expiry and reminders behave as before

#### Scenario: Held transfer holds the expiry
- **WHEN** the indexer has read the chain to 15:30, a giver's send of a fresh mint at 14:10 is held because Cosmo's metadata is down, and the trade's expiry falls at 14:30
- **THEN** the indexer counts as read only to just before 14:10, the trade doesn't expire, and once the send is replayed the leg verifies instead

### Requirement: Feedback
After a trade completes, each party SHALL be able to rate the other Positive, Neutral or Negative, and change that rating for 14 days after completion.

After a trade fails, only a party who **delivered** SHALL be able to rate the other, on the same terms, for 14 days after it ended. A party delivered when every leg they gave verified while the other party still owed at least one transfer. The other party SHALL NOT be able to rate that trade.

Trades in progress, cancelled trades and completed trades with a confirmed leg (see Receiver confirms a leg) SHALL NOT accept feedback. A failed trade with a confirmed leg SHALL take feedback from the party who delivered, as any failed trade does. Single ratings SHALL never be shown to anyone but their author; they count only toward totals.

#### Scenario: Rate a completed trade
- **WHEN** the user rates binary.bin Positive on completed T-1042
- **THEN** the page shows the user's rating, and binary.bin's positive share includes it

#### Scenario: Not completed
- **WHEN** a request rates a trade that is still in progress
- **THEN** it is refused

#### Scenario: Rate the party who never sent
- **WHEN** the user's leg of T-1042 verified, and the trade failed because binary.bin never sent theirs
- **THEN** the user's trade page offers the rating controls, and rating binary.bin Negative counts toward binary.bin's positive share

#### Scenario: The party who didn't deliver
- **WHEN** binary.bin opens that failed trade, or sends a request to rate it
- **THEN** no rating controls show, and the request is refused

#### Scenario: Confirmed trade
- **WHEN** a trade completes because the receiver confirmed one of its legs
- **THEN** neither party sees rating controls on its page, and a request to rate it is refused

#### Scenario: Failed after a confirmation
- **WHEN** the user confirms binary.bin's only leg (it went to the user's friend at the user's request), then the user never sends their own, and the trade fails
- **THEN** binary.bin's trade page offers the rating controls, and the user's shows none

### Requirement: Reputation
An account's reputation SHALL be:
- its count of completed trades with no confirmed leg (see Receiver confirms a leg), as this account;
- its count of **unfinished** trades: failed trades where it still owed at least one transfer while the other party had delivered everything they owed. An objekt that was stuck (see Objekts that can no longer be transferred) still counts as owed. The count also includes such trades where the side at fault was another account, if any address that side had linked when the trade was accepted is linked to this account now. Each trade counts at most once;
- its share of positive ratings among positive and negative ones (neutral ratings don't count), shown once it has at least one;
- the month the account was created.

It SHALL show as one line, for example "31 verified · 2 unfinished · 100% · since Mar 2025". The unfinished count SHALL show only when it is above 0, and SHALL explain itself to screen readers and on hover as failed trades where the account didn't send its part. An account with no completed trades reads "No verified trades yet", or for example "No verified trades · 1 unfinished" when it has unfinished ones. The line SHALL reflect a newly failed trade within 10 minutes. It SHALL show only where the account is already named.

#### Scenario: New trader
- **WHEN** a viewer sees a post by an account with no completed or unfinished trades
- **THEN** its line reads "No verified trades yet"

#### Scenario: Took and never sent
- **WHEN** rin.trades has 31 completed trades and 2 failed ones where they received and never sent back
- **THEN** their line reads "31 verified · 2 unfinished · …", with the positive share and month

#### Scenario: Same wallet, new account
- **WHEN** rin.trades has 1 unfinished trade, deletes the account, and 7 days later links the same Cosmo wallet to a new account
- **THEN** the new account's line reads "No verified trades · 1 unfinished"

#### Scenario: Good history stays behind
- **WHEN** an account with 31 completed trades unlinks a wallet, and another account links it once the 7-day wait is over
- **THEN** the other account's verified count doesn't change

#### Scenario: Stuck objekt
- **WHEN** a trade fails while the objekt rin.trades still owed was stuck, and the other party had delivered
- **THEN** rin.trades's unfinished count goes up by one, as for any trade they didn't deliver

#### Scenario: Both still owed
- **WHEN** a trade fails while both parties still owed at least one transfer
- **THEN** neither party's unfinished count changes

#### Scenario: Staff move
- **WHEN** an admin moves the wallet rin.trades failed to deliver from in T-1042 from rin.trades to rin.trades2
- **THEN** rin.trades2's line counts T-1042 as unfinished and none of rin.trades's verified trades, and rin.trades's line still counts T-1042

#### Scenario: Confirmed trade
- **WHEN** rin.trades has 31 completed trades, and a 32nd completes because the receiver confirmed one of its legs
- **THEN** rin.trades's line still reads "31 verified", and the partner's verified count doesn't change either

### Requirement: Objekts that can no longer be transferred
Within 3 minutes of the indexer recording that a specific objekt became non-transferable:
- **Open offer:** an open offer naming it on either side SHALL be Cancelled with the reason "an objekt can no longer be transferred", and both parties notified.
- **In-progress trade, nothing sent yet:** a trade giving it in a leg that hasn't verified, with no leg verified yet, SHALL be Cancelled with the same reason. Both parties SHALL be notified, and every reservation of the trade SHALL be released.
- **In-progress trade, something already sent:** both parties SHALL be notified once that the objekt can't be sent right now. The trade SHALL stay in progress. While the objekt stays non-transferable, its leg is **stuck**: the trade page SHALL say so on that leg's card for both parties, and in the next-step banner (see Next-step states). A stuck leg is still owed: if the trade fails, it counts toward its giver's unfinished trades, since the owner can make an objekt non-transferable themselves by gridding it.

If the objekt becomes transferable again, its leg SHALL stop being stuck.

#### Scenario: Before anything was sent
- **WHEN** an objekt the user gives in T-1042 becomes non-transferable, and no leg has verified
- **THEN** T-1042 shows Cancelled with "an objekt can no longer be transferred", and both parties are notified

#### Scenario: After the other side sent
- **WHEN** binary.bin's leg verified, and then the objekt the user still owes becomes non-transferable
- **THEN** both parties are notified, the trade stays in progress, the leg's card shows it's stuck, and the user's banner says it can't be sent right now

#### Scenario: Open offer
- **WHEN** an objekt named in open offer O-882 becomes non-transferable
- **THEN** O-882 shows Cancelled with the reason, and both parties are notified

### Requirement: Trade page header
A trade's own page SHALL open with a breadcrumb in place of the Trade page header and tabs: Trade, My trades, then the trade number in monospace. Trade SHALL link to `/trade` and My trades to `/trade/mine`. Beside it, the page SHALL name the offer the trade came from, as a link to the conversation that holds it. The partner SHALL be shown in the Trading with card, not in a header row.

#### Scenario: Breadcrumb
- **WHEN** the user opens `/trade/mine/88`, accepted from offer O-250
- **THEN** the page starts with "Trade / My trades / T-88" and "from offer O-250", with no Trade page title or tab bar above it

#### Scenario: Address-only partner
- **WHEN** the user opens a trade with 0x9ca6…8b0d, who has no image and no nickname
- **THEN** the Trading with card shows the person placeholder avatar and "0x9ca6…8b0d" on one line, and no header row repeats the partner

#### Scenario: Copy address
- **WHEN** the user presses the copy button beside the partner's name in the Trading with card
- **THEN** the partner's full address is copied, and "Address copied" shows

#### Scenario: Back to My trades
- **WHEN** the user follows My trades in the breadcrumb
- **THEN** `/trade/mine` opens

### Requirement: Trade actions menu
The Trading with card's menu, and on phones the bottom bar's, SHALL hold Report a problem and, while the trade is in progress, Cancel trade. An action that can't be used yet SHALL show disabled with its reason:
- Report a problem, with the date it opens;
- Cancel trade, with "Cancelling is locked after the first verified transfer", or, while the indexer is behind, its refusal.

A disabled action SHALL stay reachable by keyboard with its reason read out. With no action left, the menu SHALL not show.

#### Scenario: Cancel locked
- **WHEN** one leg has verified and the user opens the menu
- **THEN** Cancel trade shows disabled with "Cancelling is locked after the first verified transfer"

#### Scenario: Report not open yet
- **WHEN** a trade accepted 3 days ago on Oct 10 is still in progress
- **THEN** Report a problem shows disabled with "Opens on Oct 17"

#### Scenario: Cancel while the indexer is behind
- **WHEN** no leg has verified and the indexer is behind
- **THEN** Cancel trade shows disabled with "We can't see the latest transfers yet. Try again in a few minutes."

#### Scenario: Completed trade
- **WHEN** the user opens a completed trade
- **THEN** no actions menu shows

### Requirement: Next-step banner
Under the breadcrumb (and the indexer strip, when shown), the trade page SHALL show one status card with a tone, the status chip, a title, one line of body, a deadline, the action its state names, and the stepper. The card SHALL be the only place on the page that states the ended reason, and Accept and Decline for a different copy. Its tone SHALL be indigo for your turn and their turn, amber for a different copy or a stuck objekt, green when completed, red when failed, and grey when cancelled. The page SHALL fill at most one button as primary: Open chat is filled only when the card has no primary action. Trades are sent in the Cosmo app, to a nickname. On your turn the card SHALL say where to send: "Send to", the nickname of the partner's default profile and "in Cosmo", then "or" and the nickname of each of their other linked profiles, since a transfer to any of them verifies the leg. A profile with no nickname SHALL show its shortened address. The card SHALL not offer to copy an address.

#### Scenario: Ended reason once
- **WHEN** the user opens a trade cancelled because an objekt left the wallet
- **THEN** the grey card reads "Trade cancelled" with the reason, and no other line on the page repeats it

#### Scenario: Indexer behind once
- **WHEN** the indexer is behind and two legs are waiting
- **THEN** the notice shows once, in the strip above the card, and neither the card nor any leg repeats when transfers were last seen

#### Scenario: One primary
- **WHEN** the user opens a trade where it is their turn
- **THEN** the card has no filled button, and Open chat is the only filled button on the page

#### Scenario: Partner with two profiles
- **WHEN** it is the user's turn, and binary.bin also has the linked profile binary_b
- **THEN** the card reads "Send to binary.bin in Cosmo" and "or binary_b", with no button to copy anything

#### Scenario: Make a new offer
- **WHEN** the user opens a cancelled trade
- **THEN** the card offers Make a new offer, which opens the offer builder for the same partner

### Requirement: Next-step states
While a trade is in progress, the banner SHALL show the first state that applies:
1. A different copy the viewer received and must decide on.
2. Your turn: the viewer owes a transfer they can send.
3. Stuck: an objekt the viewer owes can't be sent.
4. A different copy the viewer sent, awaiting the partner.
5. Their turn.

An ended trade SHALL show completed, failed or cancelled.

#### Scenario: Your turn, suggested first
- **WHEN** neither party has sent, and the user was suggested to send SeoAh 203Z #722 first
- **THEN** the card reads "Your turn: send SeoAh 203Z #722 to binary.bin", then "We suggested you send first. It's a suggestion: nothing stops either of you.", shows "Send to binary.bin in Cosmo", and offers Cancel trade

#### Scenario: Their turn
- **WHEN** every leg the user gives is verified, and binary.bin's leg is waiting
- **THEN** the banner reads "Waiting on binary.bin to send their part" and "Nothing to do on your side."

#### Scenario: Their turn after a week
- **WHEN** the same trade is still in progress 7 days after accept
- **THEN** the banner also offers Report a problem

#### Scenario: Different copy, you decide
- **WHEN** binary.bin sent #1188 for a leg asking for #722, and the copy is pending
- **THEN** the amber banner reads "binary.bin sent #1188, this trade asks for #722", shows the asked and sent copies side by side and when it counts as accepted, and offers Decline and Accept #1188, Accept asking for confirmation first

#### Scenario: A decision outranks your turn
- **WHEN** the user still owes a leg, and a different copy for a leg they receive is pending
- **THEN** the banner shows the decision, and once it is made, shows Your turn

#### Scenario: Different copy, they decide
- **WHEN** the user's only waiting leg holds a pending copy they sent
- **THEN** the amber banner reads "You sent #1188, this trade asks for #722", says binary.bin can accept it or the user can send #722, and when it counts as accepted, with no action

#### Scenario: Stuck
- **WHEN** binary.bin's leg verified, and the only objekt the user owes reads as non-transferable
- **THEN** the amber banner says the objekt can't be sent right now, and that the trade waits and ends as failed at its expiry if it still hasn't arrived

#### Scenario: Stuck beside a sendable leg
- **WHEN** the user owes two legs, one stuck and one they can send
- **THEN** the banner shows Your turn for the sendable one, with a warning line that the other can't be sent right now

#### Scenario: Completed
- **WHEN** the user opens a completed trade they can still rate
- **THEN** the green banner reads "Trade complete. How did it go?" with the rating controls

#### Scenario: Failed, delivered
- **WHEN** the user's leg verified, and the trade failed because binary.bin never sent theirs
- **THEN** the red banner reads "Trade failed" with the failed reason, the rating controls, and Report a problem

#### Scenario: Failed, not delivered
- **WHEN** binary.bin opens that same failed trade
- **THEN** their banner shows the failed reason and Report a problem, and no rating controls

#### Scenario: Cancelled by the partner
- **WHEN** binary.bin cancelled the trade
- **THEN** the grey banner reads "Trade cancelled" and "binary.bin cancelled this trade.", with Make a new offer

### Requirement: Next-step deadline
The card's deadline SHALL sit at its trailing edge as a label over a value, with a short note under it:
- while in progress, "Ends", the time left until the trade's expiry, and its date;
- for a different copy, "Decide", the time left until it counts as accepted, and its date;
- on an ended trade that can be rated, "Rate by <date>" until the viewer has rated, then the date until which the rating can change;
- otherwise, "Ended" and when the trade ended.

Past the expiry while the indexer is behind, it SHALL read "Paused" with the date it was due, never a negative count.

#### Scenario: Ends in
- **WHEN** a trade accepted on Oct 8 is open on Oct 17
- **THEN** the deadline reads "Ends", "in 5 days", "Oct 22"

#### Scenario: Expiry held
- **WHEN** a trade passed its 14 days on Oct 22 while the indexer is behind
- **THEN** the deadline reads "Ends", "Paused", "Was Oct 22"

#### Scenario: Copy deadline
- **WHEN** a pending copy counts as accepted in 2 days
- **THEN** the receiver's deadline reads "Decide", "2 days left" and its date

### Requirement: You give and You get
The trade page SHALL show the legs in one card, The exchange, with a summary line and two sides, You give and You get, side by side from `sm` and stacked below it; on an ended trade, a side that moved reads You gave or You got. Each side SHALL say where it stands: Sent · verified, Waiting on them, You owe this, After you send, Different copy, Verified or Not sent. Each objekt SHALL be a small card in a grid that fits as many cards a row as the side's width allows, at least four, with:
- its art, carrying a status mark;
- the member;
- the collection code with the serial, or "any copy".

The status mark SHALL name the leg's status to assistive technology: Verified, Waiting, Send this (a leg the viewer owes and can send), Different copy, or Not sent (once the trade ended without it). A verified card's art SHALL be dimmed. A waiting leg whose objekt can no longer be transferred, or is away from its giver, SHALL carry a warning mark, and its warning SHALL show with the card when it is selected (see Selected objekt).

Within a side, cards SHALL group under a heading with a count, in this order: Send these, Decide on these (a different copy waits on the viewer), Can't be sent (an objekt the viewer owes that can't be transferred, which waits on nobody), Waiting on them, Verified, Not sent. A group with no card is left out.

Transaction hashes SHALL appear in the Timeline, not on the cards. A side with no objekt SHALL read "Nothing".

#### Scenario: Swap in progress
- **WHEN** the user's SeoAh 203Z #722 has verified and binary.bin still owes any copy of SeoAh 203Z
- **THEN** You give reads "Sent · verified" with #722 under Verified, dimmed with a Verified mark, You get reads "Waiting on them" with "any copy" under Waiting on them, and neither card shows a hash

#### Scenario: Your turn
- **WHEN** the user owes SeoAh 203Z #722 and has not sent it
- **THEN** You give reads "You owe this" with #722 under Send these, and You get reads "After you send"

#### Scenario: Forty objekts
- **WHEN** the user opens a trade where they give 18 objekts and get 22, at 1440 px
- **THEN** every card of both sides fits in about one screen of The exchange, each side grouped by status with what needs the user first

#### Scenario: Cash buy
- **WHEN** the user buys an objekt for a top-up paid outside
- **THEN** You give shows the top-up, marked paid outside and not verified, and You get shows the objekt

#### Scenario: Note
- **WHEN** the offer carried a note
- **THEN** the note is quoted at the foot of The exchange

#### Scenario: Owed but can't be sent
- **WHEN** the user owes Kotone 301A and it reads as non-transferable
- **THEN** its card sits under Can't be sent with its warning mark, and neither Needs you nor Waiting counts it

#### Scenario: Art opens the drawer
- **WHEN** the user picks an objekt's card and chooses View objekt
- **THEN** the objekt drawer opens for that collection

#### Scenario: Away mark
- **WHEN** Kotone 301A, which binary.bin owes, is away from binary.bin's wallet
- **THEN** its card under Waiting on them carries the warning mark, and selecting it shows that it left and when the trade breaks

#### Scenario: Ended
- **WHEN** the user opens a completed trade
- **THEN** the sides read You gave and You got

#### Scenario: Cancelled before anything moved
- **WHEN** the user opens a trade cancelled before any leg verified
- **THEN** the sides still read You give and You get, each "Not sent", with every card under Not sent, since a side counts as moved only once one of its legs verified, or its top-up on a completed trade

### Requirement: Rating on the trade page
Rating controls SHALL show only in the status card of a completed or failed trade that the viewer can rate, with the date until which the rating can change. While the trade is in progress, no rating control SHALL show, and the Timeline's last row SHALL say rating opens once every transfer verifies.

#### Scenario: In progress
- **WHEN** the user opens an in-progress trade
- **THEN** no rating control shows, disabled or not

#### Scenario: Window closed
- **WHEN** the user opens a trade that completed 20 days ago
- **THEN** the card reads "Trade complete" with "Feedback for this trade has closed."

### Requirement: Trade page on phones
Below `sm`:
- the stepper SHALL keep all four steps with their labels;
- You give and You get SHALL be two toggle buttons, one pressed at a time, each naming its count, with the exchange's filters under them and four cards a row; the tab opens on the side holding what needs the viewer, else You give;
- the Trading with card and the Timeline SHALL follow the exchange, the Timeline folded behind a disclosure that reads "Timeline", the next event as "Next: …", and a chevron;
- a bar held at the bottom of the screen SHALL carry the state's primary action (Decline and Accept for a different copy, otherwise Open chat), plus Open chat when it is not the primary, and the actions menu, each at least 44 px tall;
- the status card SHALL not repeat a button the bar carries.

The page SHALL not scroll sideways.

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** You give and You get are tabs over four cards a row, the bottom bar holds the primary action and the menu, and the page doesn't scroll sideways

#### Scenario: Tab with what needs you
- **WHEN** the user opens at 390 px a trade where a different copy from binary.bin waits on them and they owe nothing
- **THEN** the You get tab is open

#### Scenario: Your turn on a phone
- **WHEN** it is the user's turn at 390 px
- **THEN** the card shows "Send to binary.bin in Cosmo" with nothing to copy, and the bottom bar holds Open chat, filled, and the menu

#### Scenario: Folded timeline
- **WHEN** the user opens the Timeline disclosure at 390 px
- **THEN** every Timeline row shows, and the chevron cue was visible before it opened

### Requirement: Trading with
The side panel SHALL open with a Trading with card: the partner's avatar as it shows elsewhere (their image, else the person placeholder or initial), their name on one line linking to their profile, a button that copies their address, and when they started trading. Reputation SHALL show as three figures (verified, unfinished, positive), with unfinished in amber when above zero. The card SHALL end with Open chat, View profile and the actions menu.

#### Scenario: Reputation figures
- **WHEN** the partner has 5 verified trades, 1 unfinished and 67% positive ratings
- **THEN** the card shows Verified 5, Unfinished 1 in amber, and Positive 67%

#### Scenario: New trader
- **WHEN** the partner has no verified trades and nothing unfinished
- **THEN** the figures give way to the same "New" mark the reputation line uses

### Requirement: Trade timeline
The side panel SHALL hold one Timeline for every trade state, in time order: Proposed, Accepted, the verified transfers, and each different copy's arrival and deadline. Transfers by one party verified on the same day SHALL fold into one row ("You sent 14 of 18", "binary.bin sent 7 of 22") that opens to each transfer with its objekt, serial and hash; a day with a single transfer from that party shows it as its own row with its hash. While in progress it adds the reminder, Report a problem opening, Today, the expiry (saying how it would end) and rating, undated. Once ended it adds how it ended and when rating closes. Past rows are done, Today indigo, later rows hollow.

#### Scenario: Mid-trade
- **WHEN** a trade accepted 4 days ago has one verified transfer, by the user
- **THEN** the Timeline lists Accepted, "You sent …" with its hash, the reminder, Today, Report a problem opens, the expiry and Rate the trade, past rows done, Today indigo and later rows hollow

#### Scenario: Many transfers in a day
- **WHEN** the user's 14 transfers verified on Oct 25
- **THEN** the Timeline shows one row "You sent 14 of 18" dated Oct 25, which opens to the 14 transfers, each with its serial and hash

#### Scenario: Expiry would fail
- **WHEN** one leg has verified, or a different copy is held
- **THEN** the expiry row reads "Ends as failed if still unfinished"

#### Scenario: Expiry would cancel
- **WHEN** no leg has verified and no different copy is held
- **THEN** the expiry row reads "Ends as cancelled if still unfinished"

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** the Timeline lists Proposed, Accepted, the transfers by day with their hashes, and Completed with its date

#### Scenario: Paused expiry
- **WHEN** the expiry has passed while the indexer is behind
- **THEN** the expiry row is marked paused, not done, and sits before Today

#### Scenario: Full rules
- **WHEN** the user opens the Timeline's How trades work link
- **THEN** the rules for reminders, different copies, Report a problem and expiry show

### Requirement: Objekt away from the giver
When the indexer first records that a reserved objekt of a waiting leg left the giver for someone other than the receiver, both parties SHALL be notified once, naming it by serial and giving when the trade breaks (72 hours after it left). While it stays away, its leg card and the next-step banner SHALL show that time to both parties. When it comes back, is delivered or is confirmed, the warning SHALL go away with no new notification.

While a leg the viewer receives is away, the trade page SHALL also tell the receiver that a Cosmo profile they link before the deadline counts as theirs, linking to their profiles page, and SHALL offer Mark as received (see Receiver confirms a leg) for a delivery made somewhere else. The giver SHALL see neither.

#### Scenario: Told when it leaves
- **WHEN** binary.bin's leg verified, and the user moves Kotone 301A, which they owe, to another wallet at 01:16
- **THEN** within 3 minutes the user is notified that their #301 left their wallet and to bring it back or send it by 01:16 three days later, and binary.bin that the user's #301 left their wallet and the trade ends unless it's back or delivered by then

#### Scenario: Warning on the trade page
- **WHEN** binary.bin opens that trade while Kotone 301A is away
- **THEN** the leg's card and the banner say it left the user's wallet and give the deadline

#### Scenario: Back in time
- **WHEN** Kotone 301A returns to the user's wallet 2 minutes later
- **THEN** the warning disappears from the trade page within 3 minutes, and no one is notified again

#### Scenario: Left twice
- **WHEN** Kotone 301A leaves, comes back, then leaves again an hour later
- **THEN** both parties are notified again, and the new deadline counts from the second move

#### Scenario: Sent to the receiver's other profile
- **WHEN** the user receives Kotone 301A, binary.bin sends it to a Cosmo profile of the user's that isn't linked yet, and the user links that profile before the deadline
- **THEN** within 3 minutes the leg shows Verified, and the warning is gone

#### Scenario: Link or confirm hint
- **WHEN** the user opens a trade where Kotone 301A, which they receive, is away from binary.bin
- **THEN** the page says a profile they link before the deadline counts, with a link to their profiles page, and offers Mark as received; binary.bin's page shows neither

### Requirement: Narrowing the exchange
The exchange SHALL offer, above its sides, filter chips with counts (All, Needs you, Waiting, Verified), a Grid or List switch, and a find box. Needs you keeps legs the viewer owes and can send and different copies waiting on them. Find keeps cards whose member or collection code holds the text. List shows one line per objekt: art, member, code, serial and status. Narrowing changes only what shows; it SHALL reset when the page is opened again.

#### Scenario: Needs you
- **WHEN** the user owes 4 objekts and 2 different copies wait on them, among 40 legs
- **THEN** the Needs you chip reads 6, and picking it leaves the 4 under Send these and the 2 under Decide on these

#### Scenario: Find
- **WHEN** the user types "seoah" in the find box
- **THEN** only SeoAh cards show on both sides, grouped as before

#### Scenario: Nothing left
- **WHEN** the filters leave a side empty
- **THEN** that side says nothing matches, and offers to show all

#### Scenario: List
- **WHEN** the user switches to List
- **THEN** each objekt is one line with its serial and status, in the same groups

### Requirement: Send these by profile
When the viewer has more than one linked Cosmo profile and the specific objekts they still owe sit on more than one of them, Send these SHALL split into one group per profile, headed with the profile's name and its count, so the viewer sends from one account at a time. An any-copy leg, which no single profile holds, stays in a group of its own after them.

#### Scenario: Two accounts
- **WHEN** the user owes 4 objekts, 3 held by izrin96 and 1 by izrin96_b
- **THEN** Send these shows "From izrin96 · 3" and "From izrin96_b · 1"

#### Scenario: One account
- **WHEN** the user owes 4 objekts, all held by izrin96
- **THEN** Send these is one group with no profile heading

### Requirement: Selected objekt
Picking a card SHALL select it and show it in a Selected panel at the top of the side panel from `lg`, and in a sheet below it: its art, member, code and serial, the side, its status, a line on what happens next (a different copy names the serial sent instead; an away objekt says when the trade breaks; a stuck one says it can't be sent), and View objekt, which opens the objekt drawer. A selected card SHALL be marked as pressed.

#### Scenario: Pick a different copy
- **WHEN** the user picks SeoAh 203Z, for which binary.bin sent #801 instead of #722
- **THEN** the Selected panel shows SeoAh 203Z #722, Different copy, and that #801 was sent instead

#### Scenario: Drawer
- **WHEN** the user picks a card and chooses View objekt
- **THEN** the objekt drawer opens for that collection

#### Scenario: Phone
- **WHEN** the user taps a card at 390 px
- **THEN** a sheet shows the same details, and closing it returns focus to the card

### Requirement: Show what needs you
While the viewer owes a leg they can send or a different copy waits on them, the status card SHALL offer "Show the N that need you", N counting both. It SHALL set the exchange's Needs you filter and move to The exchange.

#### Scenario: Six to do
- **WHEN** the user owes 4 objekts and 2 different copies wait on them
- **THEN** the status card offers "Show the 6 that need you", and choosing it shows only those 6 in The exchange

#### Scenario: Nothing to do
- **WHEN** it is the partner's turn and nothing waits on the user
- **THEN** the status card offers no such button

### Requirement: Receiver confirms a leg
While a trade is in progress, the receiver of a waiting leg SHALL be able to close it as **confirmed**: received with no transfer the tracker matched. Only the receiver SHALL be able to confirm, only while the leg is waiting with no wrong copy on it waiting for an answer, and only after confirming in a dialog that says the trade won't count as verified or, once it completes, take feedback. A refused request SHALL leave the trade unchanged. A confirmation SHALL not be undone.

#### Scenario: Confirm a leg
- **WHEN** the user receives Kotone 113Z from binary.bin, it went to a friend's profile at the user's request, and the user chooses Mark as received and confirms
- **THEN** the leg closes as confirmed, progress counts it, and its objekt is no longer reserved

#### Scenario: Last leg
- **WHEN** the user confirms the only leg still waiting
- **THEN** the trade shows Completed, and both parties are notified

#### Scenario: Not the receiver
- **WHEN** the giver, or an account outside the trade, asks to confirm the leg
- **THEN** it is refused, and the trade is unchanged

#### Scenario: Already closed
- **WHEN** the user asks to confirm a leg that verified, broke or ended with its trade a moment earlier
- **THEN** it is refused, and the trade page shows the leg as it now stands

#### Scenario: A wrong copy waits on the leg
- **WHEN** binary.bin sent a different copy for the leg and the user hasn't accepted or declined it
- **THEN** Mark as received doesn't show, and a request to confirm the leg is refused until the copy is decided

#### Scenario: Dismissed dialog
- **WHEN** the user chooses Mark as received and then cancels the dialog
- **THEN** nothing changes

### Requirement: What a confirmed leg counts as
A confirmed leg SHALL count as a verified transfer for progress ("n of m"), completion, the cancel lock and the unfinished count. A trade with a confirmed leg SHALL not count toward either party's verified trades, and a completed one SHALL take no feedback (see Reputation, Feedback). The giver SHALL be notified when a leg they give is confirmed; once the trade completes, both parties SHALL get the completed note instead, with no Leave feedback action.

#### Scenario: Cancel after a confirmation
- **WHEN** the user confirms one leg of a trade where nothing else verified
- **THEN** Cancel trade shows disabled with the locked note for both parties

#### Scenario: Giver told
- **WHEN** the user confirms one of two waiting legs binary.bin gives
- **THEN** binary.bin is notified that the user marked it as received, and the trade stays in progress

#### Scenario: Unfinished still counts
- **WHEN** the user confirms binary.bin's only leg, then never sends their own, and the trade fails at its expiry
- **THEN** the user's unfinished count goes up by one, as if binary.bin's leg had verified on-chain

### Requirement: Confirmed legs on the trade page
A confirmed leg's card SHALL sit under Verified, dimmed, with the status mark Confirmed. The Selected panel and the Timeline SHALL read "Confirmed by {receiver}" with when it was confirmed, and no transaction hash. The status card of a completed trade with a confirmed leg SHALL say it won't count toward verified trades, in place of the rating controls.

#### Scenario: Confirmed card
- **WHEN** binary.bin opens a trade where the user confirmed Kotone 113Z
- **THEN** its card is under Verified with the Confirmed mark, and selecting it shows "Confirmed by" the user's name and the time, with no hash

#### Scenario: Timeline
- **WHEN** the user opens a trade with one leg verified on-chain and one confirmed
- **THEN** the Timeline shows the transfer with its hash, and a separate "Confirmed by" row with no hash

#### Scenario: Completed with a confirmation
- **WHEN** the user opens a trade that completed with a confirmed leg
- **THEN** the green status card reads that the trade is complete and won't count toward verified trades, with no rating controls
