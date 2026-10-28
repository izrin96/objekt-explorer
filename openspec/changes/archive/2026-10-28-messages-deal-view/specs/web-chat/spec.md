# Spec Delta

## ADDED Requirements

### Requirement: Deal line on conversation rows
A row in Inbox, Requests or Archived SHALL show one deal line for the conversation's deal, as "Which deal a conversation shows" picks it. The line SHALL show the O or T number in monospace, a tone dot, and the row line from "Deal line wording" in its tone from "Deal tones". A row with no such deal SHALL show no line. Activating the line opens the conversation.

#### Scenario: Running trade
- **WHEN** an offer between izrin96 and haneul_07 was accepted as T-89, and izrin96 still owes 4 objekts
- **THEN** izrin96's row for haneul_07 shows "T-89" and "Your turn · send 4" under the preview

#### Scenario: No deal
- **WHEN** a conversation holds only text and an objekt card
- **THEN** its row shows no deal line and looks as it does today

#### Scenario: Offer past its expiry
- **WHEN** the only offer in a conversation is still open but its 7 days have passed
- **THEN** the row shows no deal line

#### Scenario: Rated
- **WHEN** a trade completed and the viewer has rated it
- **THEN** the row shows no deal line

### Requirement: Which deal a conversation shows
A deal is an offer of the conversation while it is open, its trade while it runs, and that trade after it ended while the viewer can still rate it and has not. One conversation can hold an open offer and several trades at once, so the row and the strip SHALL name the most urgent: first a deal marked "Needs you" in "Deal line wording", then any other open offer or running trade, then a trade to rate; among those equally urgent, the newest offer's.

#### Scenario: Several deals
- **WHEN** izrin96's conversation with trade.tester holds T-86, T-87, T-88 and T-89, all running, T-87 waiting on izrin96 to send 1, and a newer offer O-256 that expired
- **THEN** the row and the strip name T-87, and the conversation is under Needs you

#### Scenario: Waiting on you first
- **WHEN** izrin96 has an open offer O-270 to dalgom and an older trade T-88 with dalgom where izrin96 owes 2
- **THEN** the row reads "T-88 · Your turn · send 2"

### Requirement: Deal line layout
While a deal exists, the deal line SHALL take the place of the row's context line (the objekt or post thumbnail line); without one, the context line stays. The deal line SHALL be one line that never wraps. Out of room, its words SHALL truncate with an ellipsis, and the O or T number and the trailing count ("send 4", "3 of 6") SHALL stay whole.

#### Scenario: Deal replaces the context line
- **WHEN** sullin's conversation holds a SeoAh 203Z card and then an open offer O-264 from sullin
- **THEN** the row shows "O-264 · Waiting for you" where the SeoAh 203Z thumbnail line was, and shows the thumbnail line again once the offer is declined

#### Scenario: Narrow row
- **WHEN** a row at 320 px has room for only part of "T-87 · Waiting for them · 3 of 6"
- **THEN** it reads "T-87 · Waiting for… · 3 of 6" on one line

### Requirement: Muted conversation rows
A muted conversation's row SHALL show its name without bold, its unread count dimmed, and its deal line in the neutral tone (muted ink and dot), whatever the deal's state.

#### Scenario: Muted row
- **WHEN** izrin96 has muted the conversation with dalgom, whose offer O-261 waits on izrin96
- **THEN** the row's name is not bold, its count is dimmed, and "O-261 · Waiting for you" shows in the neutral tone

### Requirement: Deal line wording
The row's deal line SHALL read as the table in "Wording by state" gives it, which is the source of truth for the row. A running trade's state SHALL be the first that holds in the order the trade page's `stepKind` uses. A countered offer's line SHALL follow the newest offer, the counter. N is the objekts the viewer can send now; v of t is the verified objekts of all.

#### Scenario: Wording by state
- **WHEN** the row's deal is in one of these states
- **THEN** the row reads its line, and the conversation is under Needs you where marked

| State | When | Row line | Needs you |
| --- | --- | --- | --- |
| Offer to you | open, not expired, sent to the viewer | O-n · Waiting for you | yes |
| Offer from you | open, not expired, sent by the viewer | O-n · Waiting for them | no |
| You decide | the partner sent a different copy the viewer has not answered | T-n · Different copy to decide | yes |
| Your turn | the viewer owes objekts they can send | T-n · Your turn · send N | yes |
| Their turn | the viewer owes nothing more | T-n · Waiting for them · v of t | no |
| Stuck | what the viewer still owes can't be transferred | T-n · Can't be sent · v of t | no |
| They decide | the viewer sent a different copy the partner has not answered | T-n · Waiting for them to decide | no |
| Completed, to rate | completed; the viewer can rate and has not | T-n · Completed · rate them | no |
| Failed, to rate | failed; the viewer can rate and has not | T-n · Failed · rate them | no |

#### Scenario: Offer received
- **WHEN** dalgom sends izrin96 offer O-261
- **THEN** izrin96's row for dalgom reads "O-261 · Waiting for you", and dalgom's row for izrin96 reads "O-261 · Waiting for them"

#### Scenario: Countered
- **WHEN** izrin96 counters O-261 with O-262
- **THEN** both rows follow O-262: izrin96's reads "Waiting for them", dalgom's "Waiting for you"

#### Scenario: Waiting on the partner
- **WHEN** izrin96 sent all 4 objekts of T-87 and 3 of its 6 objekts are verified
- **THEN** izrin96's row reads "T-87 · Waiting for them · 3 of 6"

#### Scenario: Different copy
- **WHEN** the partner sent #1210 in place of the #1207 izrin96 is owed, and izrin96 has not answered
- **THEN** izrin96's row reads "Different copy to decide", even if izrin96 also owes objekts

#### Scenario: Stuck
- **WHEN** the only objekt izrin96 still owes in T-91 reads as non-transferable, and 2 of 6 are verified
- **THEN** izrin96's row reads "T-91 · Can't be sent · 2 of 6", and the conversation is not under Needs you

#### Scenario: To rate
- **WHEN** T-84 completed yesterday and yerinnie has not rated it
- **THEN** yerinnie's row reads "T-84 · Completed · rate them"

#### Scenario: Failed, to rate
- **WHEN** T-85 failed because kaede.moon never sent, and izrin96 can still rate it
- **THEN** izrin96's row reads "T-85 · Failed · rate them"

### Requirement: Deal tones
The row's deal line and the thread's deal strip SHALL take each state's tone from the table in "Tone by state". It reuses the trade page's step tones (`STEP_TONE` in `lib/tone.ts`, which `next-step-banner.tsx` reads) for every trade state but Failed, which is warning here, not destructive, because the line asks for a rating rather than reporting a loss. A muted row overrides the tone with neutral.

#### Scenario: Tone by state
- **WHEN** the deal is in one of these states
- **THEN** its dot and words take the tone beside it

| State | Tone | Trade page kind |
| --- | --- | --- |
| Offer to you | warning | (offer) |
| Offer from you | neutral | (offer) |
| You decide | warning | `youDecide` |
| Your turn | progress | `yourTurn` |
| Their turn | progress | `theirTurn` |
| Stuck | warning | `stuck` |
| They decide | warning | `theyDecide` |
| Completed, to rate | success | `completed` |
| Failed, to rate | warning | `failed` (destructive there) |

#### Scenario: Stuck in warning
- **WHEN** izrin96's row reads "T-91 · Can't be sent · 2 of 6"
- **THEN** its dot and words are in the warning tone, as the trade page's stuck card is

#### Scenario: Waiting on the partner in progress
- **WHEN** izrin96's row reads "T-87 · Waiting for them · 3 of 6"
- **THEN** it is in the progress tone, as the trade page's their-turn card is, while an offer's "Waiting for them" is neutral

### Requirement: Show filter in the Inbox
The Inbox SHALL offer All, Unread and Needs you above its list. Unread lists conversations with unread messages; Needs you lists those whose state is marked "Needs you" in "Deal line wording". Both list muted conversations too. The choice SHALL live in the URL (`show`), apply on the server in the box's order and paging, and combine with search. The label is shared with My trades and the trade page's exchange; each page lists its own set.

#### Scenario: Needs you
- **WHEN** izrin96 has 6 Inbox conversations, of which haneul_07's trade waits on izrin96 to send and dalgom's offer waits on izrin96, and picks Needs you
- **THEN** the URL carries `show=needs-you`, and the list holds those two, newest first

#### Scenario: With search
- **WHEN** izrin96 searches "hane" with Needs you picked
- **THEN** only haneul_07's conversation is listed

#### Scenario: Other boxes
- **WHEN** izrin96 opens Requests
- **THEN** no chips show, and the Requests list is not narrowed by an earlier `show`

### Requirement: Show filter counts
All SHALL show no count. Unread and Needs you SHALL show their counts over the whole Inbox, ignoring search, capped at "99+". The counts SHALL leave out muted conversations, as the Messages icon's count does, so a muted conversation can be listed under a chip without adding to its count. The counts SHALL update without a reload on every new message and every offer or trade change.

#### Scenario: Counts
- **WHEN** izrin96 has two conversations that need them and two with unread messages
- **THEN** the chips read "All", "Unread 2" and "Needs you 2"

#### Scenario: Muted not counted
- **WHEN** izrin96 has muted dalgom, whose offer waits on izrin96, and nothing else needs izrin96
- **THEN** the chip reads "Needs you 0", and picking it lists dalgom's conversation with the muted row styling

#### Scenario: Many
- **WHEN** 140 Inbox conversations hold unread messages
- **THEN** the chip reads "Unread 99+"

### Requirement: Show filter live rows
A row that stops matching the filter SHALL leave the list without a reload, except the row of the conversation open beside the list, which SHALL stay, with its live deal line and count, until the filter is next applied (a chip picked or the search changed). When a row that held focus leaves, focus SHALL move as it does when a row is archived.

#### Scenario: Nothing left
- **WHEN** izrin96 has Needs you picked on a phone, with no thread open, and sends the last objekt of T-89 in Cosmo
- **THEN** haneul_07's row leaves the list without a reload, and the chip count drops

#### Scenario: Open conversation stays
- **WHEN** izrin96 has Needs you picked and the thread with haneul_07 open beside the list at 1280 px, and T-89 stops waiting on izrin96
- **THEN** haneul_07's row stays in the list reading "T-89 · Waiting for them · 6 of 8", and leaves when izrin96 next picks a chip or changes the search

#### Scenario: Focused row leaves
- **WHEN** keyboard focus is on dalgom's row under Needs you and dalgom withdraws O-261
- **THEN** the row leaves and focus moves to the row now in its place, or to the list when none is left

### Requirement: Show filter empty state
A filter with no match SHALL say "Nothing needs you" or "Nothing unread" and offer Show all, which picks All.

#### Scenario: Empty Needs you
- **WHEN** nothing in izrin96's Inbox needs them and they pick Needs you
- **THEN** the list says "Nothing needs you" and offers Show all, which lists the whole Inbox

### Requirement: Unread count on conversation rows
A row with unread messages SHALL show, in place of the unread dot, how many of the partner's messages arrived after the viewer last read the conversation, not counting unsent ones, capped at "99+". A muted conversation's count SHALL be dimmed. The count SHALL be read out as "1 unread message", "{count} unread messages", or "More than 99 unread messages" at the cap. Rows in Requests show no count, as they show no unread mark today.

#### Scenario: One unread
- **WHEN** dalgom sends izrin96 one message izrin96 has not read
- **THEN** the row shows "1", and a screen reader reads "1 unread message"

#### Scenario: Two unread
- **WHEN** haneul_07 sends izrin96 two messages izrin96 has not read
- **THEN** the row shows "2", and a screen reader reads "2 unread messages"

#### Scenario: Unsent
- **WHEN** haneul_07 unsends one of the two
- **THEN** the row shows "1"

#### Scenario: Many
- **WHEN** a conversation holds 140 unread messages
- **THEN** the row shows "99+", and a screen reader reads "More than 99 unread messages"

### Requirement: Deal strip in the thread
Under its header, the thread SHALL show one strip for the conversation's deal: a tone dot, a line, an optional second line and one action, worded as the table in "Strip by state" gives it, which is the source of truth for the strip; it MAY word a state differently from the row. It reuses the trade page's strings (`offer_status_waiting_*`, `offer_chip_*`, `offer_trade_step_progress` for "v of t", `offer_next_their_turn`). For one objekt the send line reads "Send 1 objekt to {name} in Cosmo".

#### Scenario: Strip by state
- **WHEN** the deal is in one of these states
- **THEN** the strip shows the line, second line and action beside it

| State | Line | Second line | Action |
| --- | --- | --- | --- |
| Offer to you | O-n · Waiting for you | {name} sent an offer. It expires in {time}. | Review offer |
| Offer from you | O-n · Waiting for them | It expires in {time}. | View offer |
| You decide | T-n · In progress · you decide · v of t | none | Open trade |
| Your turn | T-n · In progress · your turn · v of t | Send N objekts to {name} in Cosmo | Open trade |
| Their turn | T-n · In progress · their turn · v of t | Waiting on {name} to send their part | Open trade |
| Stuck | T-n · In progress · can't send · v of t | none | Open trade |
| They decide | T-n · In progress · they decide · v of t | none | Open trade |
| Completed, to rate | T-n · Completed | Rate {name} by {date} | Rate |
| Failed, to rate | T-n · Failed | Rate {name} by {date} | Rate |
| Never an offer | No offer between you yet | none | Make offer |
| No open offer | No open offer | none | Make offer |

#### Scenario: Your turn
- **WHEN** izrin96 opens the thread with haneul_07 while T-89 waits on izrin96 to send 4, and 2 of 8 are verified
- **THEN** the strip reads "T-89 · In progress · your turn · 2 of 8", "Send 4 objekts to haneul_07 in Cosmo", and Open trade leads to `/trade/mine/89`

#### Scenario: Stuck
- **WHEN** izrin96 opens the thread for T-91, whose objekt izrin96 owes can't be transferred, with 2 of 6 verified
- **THEN** the strip reads "T-91 · In progress · can't send · 2 of 6" in the warning tone, with Open trade

#### Scenario: Failed, to rate
- **WHEN** izrin96 opens the thread for T-85, which failed and can be rated until Oct 30
- **THEN** the strip reads "T-85 · Failed" in the warning tone and "Rate kaede.moon by Oct 30", and Rate leads to `/trade/mine/85`

#### Scenario: Stays in view
- **WHEN** izrin96 scrolls up through older messages
- **THEN** the strip stays under the header

#### Scenario: Live
- **WHEN** haneul_07 accepts O-259 while izrin96 has the thread open
- **THEN** the strip changes from the offer to T-89 without a reload

### Requirement: Deal strip without an open deal
The strip SHALL read "No offer between you yet" when the two never had an offer, and "No open offer" when they did and none of their offers is a deal: each was declined, withdrawn, countered or expired, its trade was cancelled, or its ended trade was rated or can no longer be rated. Both SHALL offer Make offer, which opens the offer builder for this conversation.

#### Scenario: No offer yet
- **WHEN** a conversation has never held an offer
- **THEN** the strip reads "No offer between you yet" with Make offer, which opens the offer builder for this conversation

#### Scenario: Declined
- **WHEN** dalgom declined izrin96's only offer, O-255
- **THEN** the strip reads "No open offer" with Make offer

#### Scenario: Expired
- **WHEN** izrin96's offer O-257 to sullin passed its 7 days unanswered
- **THEN** the strip reads "No open offer" with Make offer

#### Scenario: Withdrawn
- **WHEN** izrin96 withdraws O-258, their offer to kaede.moon, with the thread open
- **THEN** the strip changes to "No open offer" with Make offer, without a reload

#### Scenario: Rated
- **WHEN** yerinnie rates T-84 with the thread open
- **THEN** the strip changes from "T-84 · Completed" to "No open offer" with Make offer, without a reload

### Requirement: Deal strip actions
Open trade and Rate SHALL lead to the trade's page, `/trade/mine/{n}`. Review offer and View offer SHALL scroll to the offer's card, loading older messages when it is not shown yet, up to 10 pages, and move focus to the card. When the card lies further back, the thread SHALL stay where it is and a notice SHALL say the message is too far back to show.

#### Scenario: Review offer
- **WHEN** izrin96 uses Review offer on O-261
- **THEN** the thread scrolls to O-261's card, loading older messages when it is not shown yet, and focus moves to the card

#### Scenario: Too far back
- **WHEN** O-240's card sits 12 pages back and izrin96 uses View offer
- **THEN** 10 pages load, the thread does not jump, and a notice says the message is too far back to show

### Requirement: Deal strip layout
The strip's line SHALL truncate as the row's deal line does, keeping the number and "v of t" whole. Below `md` the strip SHALL be one line, without its second line, and keep its action as a labelled button; the strip is never a link as a whole. It SHALL stay one line and in view under the header while the message box has focus and the on-screen keyboard is open.

#### Scenario: Phone
- **WHEN** izrin96 opens the thread with haneul_07 at 390 px and focuses the message box
- **THEN** the strip is one line, "T-89 · In progress · your turn · 2 of 8" with an "Open trade" button, and stays under the header above the keyboard

### Requirement: New messages divider
When a thread opens holding unread messages, a "New" line SHALL sit above the first of them and SHALL stay while the thread stays open, after they are read too. The line SHALL be neutral: a border-coloured rule with its label in the muted text colour. A message that arrives while the thread is open SHALL not move or add the line. Opening the thread again SHALL place the line by what is unread then, or show none.

#### Scenario: Opened with unread
- **WHEN** izrin96 opens the thread with haneul_07 holding two unread messages
- **THEN** "New" sits above the first of the two, and stays after they are marked read

#### Scenario: Read in place
- **WHEN** a new message arrives while izrin96 reads the newest message
- **THEN** no "New" line appears

### Requirement: Opening on the New divider
When the first unread message would sit above the view, the thread SHALL open scrolled to the "New" line rather than to the newest message, loading older messages when the first unread one is not shown yet, up to 10 pages. Beyond that, the thread SHALL open at the newest message with no line. Opening on the line SHALL not move focus.

#### Scenario: Many unread
- **WHEN** izrin96 opens a thread holding 60 unread messages, more than fit in view
- **THEN** the thread opens with the "New" line at the top of the view and the first unread message under it

### Requirement: Add to message menu
The message box SHALL have one button, named "Add to message", beside the text field, offering Attach objekt and Make offer, each with its icon and label. From `md` up it SHALL open a menu; below `md`, a bottom sheet titled "Add to message" whose choices also read "From your collection or a list" and "Pick what you give and get". Each choice SHALL open the same picker or offer builder as before. The text field SHALL take the rest of the row, with 16 px text below `sm`.

#### Scenario: Desktop
- **WHEN** izrin96 activates Add to message at 1280 px
- **THEN** a menu shows "Attach objekt" and "Make offer" with their icons, and choosing Attach objekt opens the objekt picker

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** the row holds Add, the text field and Send, Add opens a bottom sheet with both choices labelled and described, and the page does not scroll sideways

### Requirement: Add to message focus
Escape, and the sheet's close button, SHALL close the menu or sheet and return focus to Add to message. Closing the objekt picker or the offer builder opened from it, after a pick or without one, SHALL return focus to Add to message.

#### Scenario: Escape
- **WHEN** izrin96 opens the menu with the keyboard and presses Escape
- **THEN** the menu closes and focus is on Add to message

#### Scenario: After a pick
- **WHEN** izrin96 chooses Attach objekt, picks SeoAh 203Z and the picker closes
- **THEN** the card is attached to the draft and focus is on Add to message

### Requirement: Messages page header
On `/messages`, the page header SHALL show the title and the settings link only, without the page description, and the conversation frame SHALL take the height the description used.

#### Scenario: Desktop
- **WHEN** izrin96 opens `/messages` at 1280 × 800
- **THEN** the header shows "Messages" and the settings link, and the frame below it is taller than before by the description's height

## MODIFIED Requirements

### Requirement: Offer cards in the thread
An offer SHALL appear in the thread as an offer card, in order with the other messages. The card shows:
- the O number;
- both sides, labelled from the viewer's side (You give, You get), each with its count of objekts;
- the top-up and the note;
- the current status.

Each side of a full card SHALL show its objekts as thumbnails in a grid, up to twelve: when the side holds more, the first eleven and a twelfth tile reading "+N" for the rest. An any-copy ask for several copies SHALL show its count on its thumbnail ("×3"), counted once in the grid. Each thumbnail SHALL name its objekt and serial to assistive technology and on hover. "+N", or choosing the side's count, SHALL open a sheet listing every objekt of that side as a line with its art, member, collection code and serial; a thumbnail SHALL open the objekt drawer.

The newest offer card is full, unless it was accepted: an accepted offer's card collapses, since its trade carries on at the trade page. Older offer cards in the conversation collapse. A collapsed offer SHALL show, beside its O number, status and summary, small thumbnails of up to three objekts of You give, a swap mark, and up to three of You get, and the two sides' counts ("16 ⇄ 20") when either side holds more than three; an empty side shows nothing. A status change SHALL update the card in every open tab without a reload. The note gets the same caution line as a message, shown to the recipient only.

The full card SHALL be on the card surface and at most about 460 px wide, aligned to its sender's side. It SHALL have:
- a header row with the title, the O number and the status;
- the two sides next to each other, You give first, with a swap mark between them;
- a footer with the expiry and the actions.

When the card is narrower than about 448 px, as on a phone or beside the conversation list at `md`, the two sides SHALL stack, You give above You get, and the card SHALL take the thread's width. A collapsed offer SHALL use the same width and stay at full text contrast; its thumbnails SHALL not make the page scroll sideways. A card, full or collapsed, SHALL take focus from a script (`tabIndex={-1}`) without joining the tab order, so the deal strip can move focus to it.

#### Scenario: Live status
- **WHEN** the recipient accepts an offer while the sender has the thread open
- **THEN** the sender's card collapses to "Accepted" with the trade's number, and the deal strip offers Open trade

#### Scenario: Wide thread
- **WHEN** a user opens a thread holding an open counter-offer at 1280 px
- **THEN** the card shows You give and You get side by side, with the expiry and Decline, Counter and Accept in its footer

#### Scenario: Phone
- **WHEN** the same thread is opened at 390 px
- **THEN** You give sits above You get, the card fits the thread's width, and the page does not scroll sideways

#### Scenario: Large offer
- **WHEN** a thread holds an open offer giving 18 objekts for 22
- **THEN** You give shows 11 thumbnails and "+7", You get 11 and "+11", each side labelled with its count, and the card is no taller than an offer of twelve a side

#### Scenario: Every objekt
- **WHEN** the user chooses "+11" on You get
- **THEN** a sheet lists all 22 objekts of You get, each with its serial

#### Scenario: Several copies
- **WHEN** the offer asks for 3 copies of Lynn 301A in any serial
- **THEN** You get shows one Lynn 301A thumbnail marked "×3", and the side's count includes all three

#### Scenario: Collapsed offer
- **WHEN** a thread holds an older countered offer of SeoYeon 204Z for JiWoo 110A and Kaede 112A
- **THEN** its collapsed line shows the SeoYeon 204Z thumbnail, a swap mark, and the two other thumbnails beside "O-511 Countered"

#### Scenario: Collapsed large offer
- **WHEN** a thread holds an older countered offer of 16 objekts for 20
- **THEN** its collapsed line shows three thumbnails a side and "16 ⇄ 20"

#### Scenario: Accepted newest offer
- **WHEN** the newest offer in a thread is O-259, accepted as T-89
- **THEN** O-259 shows as a collapsed line that opens to the full card, and the strip names T-89

#### Scenario: Accepted offer while another trade waits on you
- **WHEN** the newest offer in izrin96's thread with haneul_07 is O-266, accepted as T-90 and waiting on haneul_07, and the older T-87 waits on izrin96 to send 1
- **THEN** the strip names T-87, and O-266 still shows as a collapsed "Accepted" line that opens to the full card

### Requirement: Offer from the composer
The message box's Add to message menu SHALL have Make offer, which opens the offer builder for this conversation; the deal strip offers it too while no deal is open. Both SHALL open the builder as the composer's Offer action did, with the same prefill: when the conversation's newest card is the partner's post card with a match, the builder adds that post's matches (see web-trade-offers). Both are hidden wherever the message box is hidden or replaced by a notice. A first offer sent from outside a conversation SHALL open a new conversation under the same start rules as Message, in the Inbox rather than in Requests.

#### Scenario: Muted sender
- **WHEN** the user is under a chat mute
- **THEN** the composer, its Add to message menu included, is replaced by the mute notice, and the deal strip offers no Make offer

#### Scenario: Make offer after a post card
- **WHEN** the newest card in izrin96's conversation with rin.trades is rin.trades's post card for "doubles" with "They have 2 you want", and no offer is open
- **THEN** Make offer from the strip and from the Add to message menu each open the builder with the two matches added, as Make offer did before

## REMOVED Requirements

### Requirement: Composer action labels
**Reason**: Attach objekt and Make offer move into the Add to message menu, labelled at every width.
**Migration**: See "Add to message menu".
