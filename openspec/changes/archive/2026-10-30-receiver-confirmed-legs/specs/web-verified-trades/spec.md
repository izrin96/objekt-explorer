## MODIFIED Requirements

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

## ADDED Requirements

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
