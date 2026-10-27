## MODIFIED Requirements

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

## ADDED Requirements

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
