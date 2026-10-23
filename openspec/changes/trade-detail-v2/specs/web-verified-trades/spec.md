# Spec Delta

## MODIFIED Requirements

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

### Requirement: Indexer delay
The system SHALL know how far the indexer has read the chain: the time of the newest block whose transfers it has recorded. It SHALL refresh this at least every 3 minutes. The indexer is **behind** when that time is more than 5 minutes old, or when it could not be determined for more than 5 minutes.

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
Under the breadcrumb (and the indexer strip, when shown), the trade page SHALL show one status card with a tone, the status chip, a title, one line of body, a deadline, the action its state names, and the stepper. The card SHALL be the only place on the page that states the ended reason, and Accept and Decline for a different copy. Its tone SHALL be indigo for your turn and their turn, amber for a different copy or a stuck objekt, green when completed, red when failed, and grey when cancelled. The page SHALL fill at most one button as primary: Open chat is filled only when the card has no primary action.

#### Scenario: Ended reason once
- **WHEN** the user opens a trade cancelled because an objekt left the wallet
- **THEN** the grey card reads "Trade cancelled" with the reason, and no other line on the page repeats it

#### Scenario: Indexer behind once
- **WHEN** the indexer is behind and two legs are waiting
- **THEN** the notice shows once, in the strip above the card, and neither the card nor any leg repeats when transfers were last seen

#### Scenario: One primary
- **WHEN** the user opens a trade where it is their turn
- **THEN** Copy address in the card is the only filled button, and Open chat is outlined

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
- **THEN** the card reads "Your turn: send SeoAh 203Z #722 to binary.bin", then "We suggested you send first. It's a suggestion: nothing stops either of you.", shows "Send to" with binary.bin's address and a Copy address button, and offers Cancel trade

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
The trade page SHALL show the legs in one card, The exchange, with a summary line and two sides, You give and You get, side by side from `sm` and stacked below it; on an ended trade, a side that moved reads You gave or You got. Each side SHALL say where it stands: Sent · verified, Waiting on them, You owe this, After you send, Different copy, Verified or Not sent. Each objekt SHALL be a plain card with:
- its art;
- the member;
- the collection code with the serial, or "any copy";
- the class beside a swatch of the collection's colour;
- a chip: Verified, Waiting, Send this (a leg the viewer owes and can send), Different copy (with the serial sent instead), or Not sent (grey, once the trade ended without it).

Transaction hashes SHALL appear in the Timeline, not on the cards. The art SHALL open the objekt drawer. A side with no objekt SHALL read "Nothing".

#### Scenario: Swap in progress
- **WHEN** the user's SeoAh 203Z #722 has verified and binary.bin still owes any copy of SeoAh 203Z
- **THEN** You give reads "Sent · verified" with #722's Verified chip, You get reads "Waiting on them" with "any copy" and a Waiting chip, and neither card shows a hash

#### Scenario: Your turn
- **WHEN** the user owes SeoAh 203Z #722 and has not sent it
- **THEN** You give reads "You owe this" with a Send this chip, and You get reads "After you send"

#### Scenario: Cash buy
- **WHEN** the user buys an objekt for a top-up paid outside
- **THEN** You give shows the top-up, marked paid outside and not verified, and You get shows the objekt

#### Scenario: Note
- **WHEN** the offer carried a note
- **THEN** the note is quoted at the foot of The exchange

#### Scenario: Art opens the drawer
- **WHEN** the user clicks an objekt's art
- **THEN** the objekt drawer opens for that collection

#### Scenario: Ended
- **WHEN** the user opens a completed trade
- **THEN** the sides read You gave and You got

#### Scenario: Cancelled before anything moved
- **WHEN** the user opens a trade cancelled before any leg verified
- **THEN** the sides still read You give and You get, each "Not sent", with grey Not sent chips, since a side counts as moved only once one of its legs verified, or its top-up on a completed trade

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
- the sides SHALL stack, followed by the Trading with card and the Timeline folded behind a disclosure that reads "Timeline", the next event as "Next: …", and a chevron;
- a bar held at the bottom of the screen SHALL carry the state's primary action (Copy address on your turn, Decline and Accept for a different copy, otherwise Open chat), plus Open chat when it is not the primary, and the actions menu, each at least 44 px tall;
- the status card SHALL not repeat a button the bar carries.

The page SHALL not scroll sideways.

#### Scenario: Phone width
- **WHEN** the trade page is shown at 390 px
- **THEN** each objekt's name stays on one line, You give sits above You get, the bottom bar holds the primary action and the menu, and the page doesn't scroll sideways

#### Scenario: Your turn on a phone
- **WHEN** it is the user's turn at 390 px
- **THEN** the card shows "Send to" and the address, the bottom bar holds Copy address, Open chat and the menu, and the card has no Copy address button of its own

#### Scenario: Folded timeline
- **WHEN** the user opens the Timeline disclosure at 390 px
- **THEN** every Timeline row shows, and the chevron cue was visible before it opened

## ADDED Requirements

### Requirement: Trading with
The side panel SHALL open with a Trading with card: the partner's avatar as it shows elsewhere (their image, else the person placeholder or initial), their name on one line linking to their profile, a button that copies their address, and when they started trading. Reputation SHALL show as three figures (verified, unfinished, positive), with unfinished in amber when above zero. The card SHALL end with Open chat, View profile and the actions menu.

#### Scenario: Reputation figures
- **WHEN** the partner has 5 verified trades, 1 unfinished and 67% positive ratings
- **THEN** the card shows Verified 5, Unfinished 1 in amber, and Positive 67%

#### Scenario: New trader
- **WHEN** the partner has no verified trades and nothing unfinished
- **THEN** the figures give way to the same "New" mark the reputation line uses

### Requirement: Trade timeline
The side panel SHALL hold one Timeline for every trade state, in time order: Proposed, Accepted, each verified transfer with its date and hash, and each different copy's arrival and deadline. While in progress it adds the reminder, Report a problem opening, Today, the expiry (saying how it would end) and rating, undated. Once ended it adds how it ended and when rating closes. Past rows are done, Today indigo, later rows hollow.

#### Scenario: Mid-trade
- **WHEN** a trade accepted 4 days ago has one verified transfer, by the user
- **THEN** the Timeline lists Accepted, "You sent …" with its hash, the reminder, Today, Report a problem opens, the expiry and Rate the trade, past rows done, Today indigo and later rows hollow

#### Scenario: Expiry would fail
- **WHEN** one leg has verified, or a different copy is held
- **THEN** the expiry row reads "Ends as failed if still unfinished"

#### Scenario: Expiry would cancel
- **WHEN** no leg has verified and no different copy is held
- **THEN** the expiry row reads "Ends as cancelled if still unfinished"

#### Scenario: Completed
- **WHEN** the user opens a completed trade
- **THEN** the Timeline lists Proposed, Accepted, each transfer with its date and hash, and Completed with its date

#### Scenario: Paused expiry
- **WHEN** the expiry has passed while the indexer is behind
- **THEN** the expiry row is marked paused, not done, and sits before Today

#### Scenario: Full rules
- **WHEN** the user opens the Timeline's How trades work link
- **THEN** the rules for reminders, different copies, Report a problem and expiry show

## REMOVED Requirements

### Requirement: The trade's clock
**Reason**: Merged with Trade history into one Trade timeline shown for every state.
**Migration**: See Trade timeline; its in-progress rows are the clock's rows plus transaction hashes.

### Requirement: Trade history
**Reason**: Merged with The trade's clock into one Trade timeline shown for every state.
**Migration**: See Trade timeline; its ended rows are History's rows plus when the rating window closes.
