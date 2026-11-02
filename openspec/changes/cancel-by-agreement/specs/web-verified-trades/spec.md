## ADDED Requirements

### Requirement: Ask to cancel
While a trade is in progress and the viewer can't cancel it alone (Cancel locks after the first transfer, or the indexer is behind), either party SHALL be able to ask to cancel it, after a dialog that says objekts already sent are not returned automatically. A trade SHALL hold at most one open request. The asker SHALL be able to withdraw it while it waits, which notifies nobody. After a decline, the same party SHALL be able to ask again only 24 hours later.

#### Scenario: Ask
- **WHEN** one leg of T-516 has verified, and the user chooses Ask to cancel and confirms
- **THEN** the request is open, binary.bin is notified, and the user's page shows that they asked

#### Scenario: Only one at a time
- **WHEN** binary.bin already asked to cancel T-516, and the user sends a request to ask too
- **THEN** it is refused, and the user's page shows binary.bin's request to answer

#### Scenario: Withdraw
- **WHEN** the user withdraws their request before binary.bin answers
- **THEN** the request is gone from both pages, the trade carries on, and nobody is notified

#### Scenario: Asking again after a decline
- **WHEN** binary.bin declined the user's request 3 hours ago
- **THEN** Ask to cancel shows disabled with the time it opens again, and a request to ask is refused

#### Scenario: Cancel still open
- **WHEN** no leg has verified, no wrong copy is held, and the indexer is caught up
- **THEN** the menu offers Cancel trade, not Ask to cancel

### Requirement: Answer a cancel request
Only the party who did not ask SHALL be able to answer, while the trade is in progress and the request is open. Accept SHALL ask for confirmation, saying objekts already sent are not returned automatically, then end the trade Cancelled with the reason "cancelled by agreement", release every reservation and notify the asker. Decline SHALL close the request and notify the asker; the trade carries on. A refused answer SHALL leave the trade unchanged.

#### Scenario: Accept
- **WHEN** binary.bin asked to cancel T-516, and the user accepts and confirms
- **THEN** T-516 shows Cancelled with "cancelled by agreement", binary.bin is notified, and its open legs close

#### Scenario: Decline
- **WHEN** the user declines binary.bin's request
- **THEN** the trade stays in progress, binary.bin is notified that the user declined, and the request is gone from both pages

#### Scenario: Asker answers their own request
- **WHEN** the party who asked sends a request to accept it
- **THEN** it is refused, and the trade is unchanged

#### Scenario: Withdrawn meanwhile
- **WHEN** the user accepts a request that binary.bin withdrew a moment earlier
- **THEN** it is refused, and the trade page shows the trade as it now stands

#### Scenario: Last leg verified first
- **WHEN** the last waiting leg verifies just before the user accepts
- **THEN** the accept is refused, and the trade shows Completed

### Requirement: What an agreed cancel counts as
A trade cancelled by agreement SHALL count as cancelled everywhere: toward neither party's verified nor unfinished trades, with no feedback and no Report a problem on its page. Legs that verified SHALL keep their transfers on the page and in the Timeline. Waiting legs, and any wrong copy still pending on them, SHALL close without being accepted. Returning what was sent SHALL be left to the two parties.

#### Scenario: Nobody at fault
- **WHEN** T-516 is cancelled by agreement after the user's 6 legs verified
- **THEN** neither party's verified or unfinished count changes, and neither page offers rating controls

#### Scenario: Sent objekts on record
- **WHEN** the user opens T-516 after the agreed cancel
- **THEN** the six verified transfers still show with their hashes in the exchange and the Timeline, and none of the other legs is reserved

## MODIFIED Requirements

### Requirement: Trade actions menu
The Trading with card's menu, and on phones the bottom bar's, SHALL hold Report a problem and, while the trade is in progress, Cancel trade. While Cancel trade can't be used, the menu SHALL also hold Ask to cancel (see Ask to cancel), unless a request is open: the status card then carries it. An action that can't be used yet SHALL show disabled with its reason:
- Report a problem, with the date it opens;
- Cancel trade, with "Cancelling is locked after the first verified transfer", or, while the indexer is behind, its refusal;
- Ask to cancel, after a decline, with the time it opens again.

A disabled action SHALL stay reachable by keyboard with its reason read out. With no action left, the menu SHALL not show.

#### Scenario: Cancel locked
- **WHEN** one leg has verified and the user opens the menu
- **THEN** Cancel trade shows disabled with "Cancelling is locked after the first verified transfer", followed by Ask to cancel

#### Scenario: Request open
- **WHEN** either party has asked to cancel and the user opens the menu
- **THEN** the menu holds no Ask to cancel, and the status card shows the request

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
Under the breadcrumb (and the indexer strip, when shown), the trade page SHALL show one status card with a tone, the status chip, a title, one line of body, a deadline, the action its state names, and the stepper. The card SHALL be the only place on the page that states the ended reason, and Accept and Decline for a different copy or a cancel request. Its tone SHALL be indigo for your turn and their turn, amber for a different copy, a stuck objekt or a cancel request, green when completed, red when failed, and grey when cancelled. The page SHALL fill at most one button as primary: Open chat is filled only when the card has no primary action. Trades are sent in the Cosmo app, to a nickname. On your turn the card SHALL say where to send: "Send to", the nickname of the partner's default profile and "in Cosmo", then "or" and the nickname of each of their other linked profiles, since a transfer to any of them verifies the leg. A profile with no nickname SHALL show its shortened address. The card SHALL not offer to copy an address.

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
1. The partner asked to cancel: the viewer must answer.
2. The viewer asked to cancel, awaiting the partner.
3. A different copy the viewer received and must decide on.
4. Your turn: the viewer owes a transfer they can send.
5. Stuck: an objekt the viewer owes can't be sent.
6. A different copy the viewer sent, awaiting the partner.
7. Their turn.

An ended trade SHALL show completed, failed or cancelled.

#### Scenario: They asked to cancel
- **WHEN** binary.bin asked to cancel, and the user still owes a leg
- **THEN** the amber banner reads "binary.bin asked to cancel this trade", says objekts already sent are not returned automatically, and offers Decline and Accept, Accept asking for confirmation first

#### Scenario: You asked to cancel
- **WHEN** the user asked to cancel, and binary.bin hasn't answered
- **THEN** the amber banner reads "You asked binary.bin to cancel this trade", says the trade carries on until they answer, and offers Withdraw

#### Scenario: Cancelled by agreement
- **WHEN** the user opens a trade cancelled by agreement
- **THEN** the grey banner reads "Trade cancelled" and "You and binary.bin agreed to cancel this trade.", with Make a new offer

#### Scenario: Your turn, suggested first
- **WHEN** neither party has sent, and the user was suggested to send SeoAh 203Z #722 first
- **THEN** the card reads "Your turn: send SeoAh 203Z #722 to binary.bin", then "We suggested you send first. It's a suggestion: nothing stops either of you.", shows "Send to binary.bin in Cosmo", and offers Cancel trade

#### Scenario: Their turn
- **WHEN** every leg the user gives is verified, and binary.bin's leg is waiting
- **THEN** the banner reads "Waiting for binary.bin to send their part" and "Nothing to do on your side."

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

### Requirement: Trade timeline
The side panel SHALL hold one Timeline for every trade state, in time order: Proposed, Accepted, the verified transfers, each different copy's arrival and deadline, and each cancel request with how it was answered or withdrawn. Transfers by one party verified on the same day SHALL fold into one row ("You sent 14 of 18", "binary.bin sent 7 of 22") that opens to each transfer with its objekt, serial and hash; a day with a single transfer from that party shows it as its own row with its hash. While in progress it adds the reminder, Report a problem opening, Today, the expiry (saying how it would end) and rating, undated. Once ended it adds how it ended and when rating closes. Past rows are done, Today indigo, later rows hollow.

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

#### Scenario: Cancelled by agreement
- **WHEN** the user opens a trade binary.bin asked to cancel on Oct 30 at 11:22 and the user accepted at 11:27
- **THEN** the Timeline lists the verified transfers, "binary.bin asked to cancel" at 11:22, and "Cancelled by agreement" at 11:27

#### Scenario: Request the trade outlived
- **WHEN** binary.bin asked to cancel, and the last leg verified before the user answered
- **THEN** the Timeline shows "binary.bin asked to cancel" with "No answer before the trade ended", and Completed

#### Scenario: Paused expiry
- **WHEN** the expiry has passed while the indexer is behind
- **THEN** the expiry row is marked paused, not done, and sits before Today

#### Scenario: Full rules
- **WHEN** the user opens the Timeline's How trades work link
- **THEN** the rules for reminders, different copies, Report a problem and expiry show

### Requirement: Receiver confirms a leg
While a trade is in progress, the receiver of a waiting leg SHALL be able to close it as **confirmed**: received with no transfer the tracker matched. Only the receiver SHALL be able to confirm, only while the leg is waiting with no wrong copy on it waiting for an answer, and only after confirming in a dialog that says the trade won't count as verified or, once it completes, take feedback, and that to call the deal off they ask to cancel instead (see Ask to cancel). A refused request SHALL leave the trade unchanged. A confirmation SHALL not be undone.

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

#### Scenario: Calling the deal off
- **WHEN** the user opens Mark as received on a leg binary.bin never sent, because the two agreed to redo the deal
- **THEN** the dialog says that to call the deal off they ask to cancel instead, and Mark as received is only for objekts they did get
