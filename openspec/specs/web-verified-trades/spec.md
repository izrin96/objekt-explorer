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
If a reserved objekt in an in-progress trade moves to anyone other than the receiver, and its leg holds no pending wrong copy (see Wrong copy sent, which accepts that copy instead):
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

#### Scenario: Wrong copy and sale seen together
- **WHEN** the giver sends a wrong copy of #1203, then sells #1203 to a third account, and the verifier reads both in one check
- **THEN** the copy is accepted automatically, as if it had been read first, and the trade carries on

#### Scenario: Copy of the sold objekt sent after the sale
- **WHEN** the giver sells #1203 to a third account, then sends another copy of its collection, and the verifier reads both in one check
- **THEN** that copy is not held for #1203's leg, and with nothing else sent the trade shows Cancelled

#### Scenario: Wrong copy on another leg after the sale
- **WHEN** the giver sells the objekt of one leg, then sends a wrong copy for another leg they owe, and the verifier reads both in one check
- **THEN** the trade shows Failed: the receiver holds that copy, and Report a problem covers it

#### Scenario: Sold while a wrong copy is pending
- **WHEN** the trade asks for HyeRin 301Z #537, a wrong copy #542 is pending, and the giver then sells #537 to a third account
- **THEN** #542 is accepted automatically, the leg shows Verified "#542 in place of #537", and the trade carries on

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
The trade page SHALL show the trade's progress as a stepper of four steps. Each step is a slim segment with its label and detail on one line:
1. Proposed, with its date;
2. Accepted, with its date;
3. Transfers, with "n of m";
4. Complete, with its date once the trade completes.

While the trade is in progress, Proposed and Accepted SHALL be marked neutral grey, and Transfers SHALL be the only coloured step: indigo, its label a filled chip. A completed trade marks all four green. On a failed trade the Transfers step is marked red. On a cancelled trade the steps after the last one reached stay unmarked. A step with no detail shows only its label.

The trade's status chip SHALL be indigo in progress, green when completed and red when cancelled or failed. On the trade page, "n of m" SHALL appear only in the stepper. The summary "n of m transfers verified" SHALL appear on the accepted offer's card in chat, linking to the trade page. Progress SHALL update in open tabs without a reload.

From `lg` up, a side panel SHALL sit beside the objekts; below `lg` it SHALL follow them. It holds the trade's clock while the trade is in progress, and its History once it has ended (see The trade's clock and Trade history).

#### Scenario: One leg in
- **WHEN** the first of two legs verifies while both parties have the trade open
- **THEN** both pages show that leg's card with a green Verified chip and the Transfers step as "1 of 2" without a reload, and no other line repeats "1 of 2"

#### Scenario: In progress colours
- **WHEN** the user opens a trade in progress
- **THEN** Proposed and Accepted are grey, Transfers is indigo with its label in a filled chip, and Complete is unmarked

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** all four steps are green, the status chip reads Completed in green, and the side panel shows History

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** the side panel follows the objekts, the columns stack, and the page doesn't scroll sideways

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
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

While the indexer is behind:
- every in-progress trade page SHALL show a notice once, inside the next-step banner: transfers sent after a given time aren't seen yet, and nothing sent is lost;
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
After a trade completes, each party SHALL be able to rate the other Positive, Neutral or Negative, and change that rating for 14 days after completion.

After a trade fails, only a party who **delivered** SHALL be able to rate the other, on the same terms, for 14 days after it ended. A party delivered when every leg they gave verified while the other party still owed at least one transfer. The other party SHALL NOT be able to rate that trade.

Trades in progress and cancelled trades SHALL NOT accept feedback. Single ratings SHALL never be shown to anyone but their author; they count only toward totals.

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

### Requirement: Reputation
An account's reputation SHALL be:
- its count of completed trades, as this account;
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
Above the trade, the trade page SHALL link back to My trades. The header SHALL show the partner's avatar, or, when they have no image, an identicon drawn from their address, so two address-only partners look different. The partner's name SHALL stay on one line, cut with an ellipsis, beside a button that copies their address. The header SHALL also hold the reputation line, the status chip, Open chat, and a menu of further actions.

#### Scenario: Address-only partner
- **WHEN** the user opens a trade with 0x9ca6…8b0d, who has no image and no nickname
- **THEN** the avatar is an identicon drawn from that address, not a letter or "0", and the name reads "0x9ca6…8b0d" on one line

#### Scenario: Copy address
- **WHEN** the user presses the copy button beside the partner's name
- **THEN** the partner's full address is copied, and "Address copied" shows

#### Scenario: Back to My trades
- **WHEN** the user follows the My trades link above the trade
- **THEN** `/trade/mine` opens

### Requirement: Trade actions menu
The header's menu SHALL hold Report a problem and, while the trade is in progress, Cancel trade. An action that can't be used yet SHALL show disabled with its reason:
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
Directly under the header, the trade page SHALL show one next-step banner with a tone, a title, one line of body, a deadline, and the action its state names. The banner SHALL be the only place on the page that states the ended reason, the indexer delay, and Accept and Decline for a different copy. Its tone SHALL be indigo for your turn and their turn, amber for a different copy or a stuck objekt, green when completed, red when failed, and grey when cancelled.

#### Scenario: Ended reason once
- **WHEN** the user opens a trade cancelled because an objekt left the wallet
- **THEN** the grey banner reads "Trade cancelled" with the reason, and no other line on the page repeats it

#### Scenario: Indexer behind once
- **WHEN** the indexer is behind and two legs are waiting
- **THEN** the notice shows once, inside the banner, and no leg repeats when transfers were last seen

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
- **THEN** the banner reads "Your turn: send SeoAh 203Z #722 to binary.bin", then "We suggested you send first. It's a suggestion: nothing stops either of you.", with Cancel trade

#### Scenario: Their turn
- **WHEN** every leg the user gives is verified, and binary.bin's leg is waiting
- **THEN** the banner reads "Waiting on binary.bin to send their part" and "Nothing to do on your side."

#### Scenario: Their turn after a week
- **WHEN** the same trade is still in progress 7 days after accept
- **THEN** the banner also offers Report a problem

#### Scenario: Different copy, you decide
- **WHEN** binary.bin sent #1188 for a leg asking for #722, and the copy is pending
- **THEN** the amber banner reads "binary.bin sent #1188, this trade asks for #722", shows the copy's thumbnail and when it counts as accepted, and offers Decline and Accept #1188, Accept asking for confirmation first

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
- **THEN** the grey banner reads "Trade cancelled" and "binary.bin cancelled this trade.", with no action

### Requirement: Next-step deadline
The banner's deadline SHALL read:
- while in progress, the time left until the trade's expiry and its date, as "Ends in 5 days, Oct 22";
- for a different copy, the time left until it counts as accepted;
- on an ended trade that can be rated, the date until which the rating can change;
- otherwise, when the trade ended.

Past the expiry while the indexer is behind, it SHALL say the trade ends once the chain is caught up, never a negative count.

#### Scenario: Ends in
- **WHEN** a trade accepted on Oct 8 is open on Oct 17
- **THEN** the deadline reads "Ends in 5 days, Oct 22"

#### Scenario: Expiry held
- **WHEN** a trade passed its 14 days while the indexer is behind
- **THEN** the deadline reads "Ends once we catch up on the chain"

#### Scenario: Copy deadline
- **WHEN** a pending copy counts as accepted in 2 days
- **THEN** the receiver's deadline reads "2 days left to decide"

### Requirement: You give and You get
The trade page SHALL show the legs in two columns, You give and You get, or You gave and You got once ended. Each objekt SHALL be a plain card with:
- its art;
- the member;
- the collection code with the serial, or "any copy";
- the class beside a swatch of the collection's colour;
- a Verified, Waiting or Closed chip.

A verified card SHALL show its transaction hash with a copy button. The art SHALL open the objekt drawer. A side with no objekt SHALL read "Nothing".

#### Scenario: Swap in progress
- **WHEN** the user's SeoAh 203Z #722 has verified and binary.bin still owes any copy of SeoAh 203Z
- **THEN** You give shows #722 with a Verified chip and its hash, and You get shows "any copy" with a Waiting chip

#### Scenario: Cash buy
- **WHEN** the user buys an objekt for a top-up paid outside
- **THEN** You give shows the top-up, marked paid outside and not verified, and You get shows the objekt

#### Scenario: Note
- **WHEN** the offer carried a note
- **THEN** the note is quoted under both columns

#### Scenario: Art opens the drawer
- **WHEN** the user clicks an objekt's art
- **THEN** the objekt drawer opens for that collection

#### Scenario: Ended
- **WHEN** the user opens a completed trade
- **THEN** the columns read You gave and You got

### Requirement: The trade's clock
While a trade is in progress, a panel titled "This trade's clock" SHALL list this trade's dated events, in time order:
- the accept, and each verified transfer;
- each different copy's deadline;
- the reminder, 72 hours after accept, and Report a problem opening, 7 days after accept;
- today;
- the expiry, 14 days after accept, saying whether it would end as failed or as cancelled;
- the rating, last and undated.

A How trades work link SHALL show the full rules.

#### Scenario: Mid-trade
- **WHEN** a trade accepted 4 days ago has one verified transfer, by the user
- **THEN** the clock lists Accepted, "You sent …", the reminder, then Today, Report a problem opens, the expiry, and Rate the trade, with past rows marked done, Today marked indigo and later rows hollow

#### Scenario: Expiry would fail
- **WHEN** one leg has verified, or a different copy is held
- **THEN** the expiry row reads "Ends as failed if still unfinished"

#### Scenario: Expiry would cancel
- **WHEN** no leg has verified and no different copy is held
- **THEN** the expiry row reads "Ends as cancelled if still unfinished"

#### Scenario: Full rules
- **WHEN** the user opens How trades work
- **THEN** the rules for reminders, different copies, Report a problem and expiry show

### Requirement: Trade history
An ended trade SHALL show a History panel instead of the clock. It SHALL list:
- when the trade was proposed and accepted;
- each verified transfer, with its time and transaction hash;
- when the trade ended, and how.

#### Scenario: Completed history
- **WHEN** the user opens a completed trade
- **THEN** History lists Proposed, Accepted, each transfer with its time and hash, and Completed with its time

### Requirement: Rating on the trade page
Rating controls SHALL show only in the banner of a completed or failed trade that the viewer can rate, with the date until which the rating can change. While the trade is in progress, no rating control SHALL show, and the clock's last row SHALL say rating opens once every transfer verifies.

#### Scenario: In progress
- **WHEN** the user opens an in-progress trade
- **THEN** no rating control shows, disabled or not

#### Scenario: Window closed
- **WHEN** the user opens a trade that completed 20 days ago
- **THEN** the banner reads "Trade complete" with "Feedback for this trade has closed."

### Requirement: Trade page on phones
Below `sm`:
- the partner's name SHALL stay on one line;
- the stepper SHALL be one segmented bar with the current step's chip;
- the columns SHALL stack, with the clock after them as a card;
- a bar held at the bottom of the screen SHALL carry Open chat and the actions menu, each at least 44 px tall.

The page SHALL not scroll sideways.

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** the name and each objekt's name stay on one line, You give sits above You get, Open chat and the menu sit in the bottom bar, and the page doesn't scroll sideways
