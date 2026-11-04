# Spec Delta

## Purpose

The staff area under `/mod`: the tabs moderators and admins work from, which roles see each one, and what each tab shows and may read.

## ADDED Requirements

### Requirement: Trade tracking tab
The Trade tracking tab SHALL be `/mod/trades` and its staff trade views at `/mod/trades/$tradeId`. Moderators and admins SHALL see it. Anyone else gets what Staff area is not found for everyone else says: the not-found surface, with no totals, trade or health data requested, and every read behind the tab refused as not found.

#### Scenario: Not staff
- **WHEN** a signed-in user without a moderator or admin role opens `/mod/trades` or `/mod/trades/1042`
- **THEN** the not-found surface is shown, and no totals, trade or health data is requested

#### Scenario: Server refuses others
- **WHEN** an account without a staff role calls a read behind Trade tracking directly
- **THEN** it is refused as not found and returns no data

#### Scenario: Moderator's strip
- **WHEN** a moderator opens `/mod/trades`
- **THEN** the strip includes Trade tracking and Message totals, with Trade tracking marked as current

### Requirement: Message totals tab
The Message totals tab SHALL be `/mod/messages`. Moderators and admins SHALL see it. Anyone else gets what Staff area is not found for everyone else says: the not-found surface, with no totals requested, and every read behind the tab refused as not found.

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/mod/messages`
- **THEN** the not-found surface is shown, and no totals are requested

#### Scenario: Not staff
- **WHEN** a signed-in user without a moderator or admin role opens `/mod/messages`
- **THEN** the not-found surface is shown, and no totals are requested

### Requirement: Totals range
Both tabs SHALL count per UTC day over the last 7, 30 or 90 days, today included, chosen on the page and kept in the URL. The default and the answer to any other value SHALL be 30 days. Each tab SHALL show its range's sum beside the days, and the time its totals were counted. Totals SHALL be at most 5 minutes old. A day with nothing in it SHALL show 0, not be left out.

#### Scenario: Range in the link
- **WHEN** a moderator picks 7 days on Trade tracking and reloads
- **THEN** the page still counts 7 days, ending with today in UTC

#### Scenario: Unknown range
- **WHEN** a link asks for 365 days
- **THEN** the tab counts 30 days

#### Scenario: Quiet day
- **WHEN** no offer was created on Oct 12 (UTC) within the range
- **THEN** Oct 12 shows 0 offers created

### Requirement: Offer totals
Trade tracking SHALL count offers per day: created, by the day sent; and accepted, declined, withdrawn, countered, expired and cancelled, by the day the offer reached that state. Cancelled offers SHALL also be split by cancel reason, including those cancelled by a block or a sanction. Staff are not parties, so the Block rule that hides this reason from the two accounts (see `web-moderation`) does not apply here.

#### Scenario: Totals for a range
- **WHEN** in the last 7 days 120 offers were sent, and 40 were accepted, 25 declined, 10 withdrawn, 15 countered, 20 expired and 6 cancelled, 2 of them by a block
- **THEN** the range's sums read 120 created, 40 accepted, 25 declined, 10 withdrawn, 15 countered, 20 expired and 6 cancelled, with 2 under the block reason

#### Scenario: Sent one day, answered the next
- **WHEN** an offer is sent on Oct 20 and declined on Oct 21 (UTC)
- **THEN** it counts as created on Oct 20 and declined on Oct 21

### Requirement: Trade totals
Trade tracking SHALL count trades per day: started, by the day accepted (the same events as offers accepted, so shown once), and completed, cancelled and failed, by the day each ended. Cancelled SHALL be split by reason: by a party, by agreement, an objekt left the wallet, an objekt can't be transferred, and expired. Failed SHALL be split into broken and expired.

#### Scenario: Cancel reasons
- **WHEN** on Oct 22 one trade is cancelled by a party, one by agreement and one because an objekt left the wallet
- **THEN** Oct 22 shows 3 cancelled: 1 by a party, 1 by agreement and 1 objekt left the wallet

#### Scenario: Failed two ways
- **WHEN** in the range one trade failed when a leg broke and two failed at their expiry
- **THEN** the range shows 3 failed: 1 broken and 2 expired

### Requirement: Time to complete
Trade tracking SHALL show, for the trades completed in the range, the time from accept to completed as a median and a 90th percentile, and how many trades they cover. A trade that completed with a confirmed leg (see `web-verified-trades`) SHALL count. With no completed trade in the range, both SHALL read as no data, not 0.

#### Scenario: Median and 90th percentile
- **WHEN** 10 trades completed in the range, taking 1, 2, 2, 3, 4, 5, 6, 8, 20 and 30 hours from accept
- **THEN** the tab shows a median of 4.5 hours and a 90th percentile of 21 hours, over 10 trades

#### Scenario: None completed
- **WHEN** no trade completed in the range
- **THEN** both values read as no data

### Requirement: Needs attention
Trade tracking SHALL list each trade that needs a look, once, with every reason that applies:
- in progress 7 or more days after accept;
- failed in the range;
- a waiting leg whose objekt left the giver, with when it breaks;
- a waiting leg whose objekt can't be transferred;
- a wrong copy waiting on the receiver;
- a request to cancel waiting on an answer.

The last four count only while the trade is in progress. Oldest accept first; each row opens its staff trade view.

#### Scenario: Stalled trade appears
- **WHEN** T-1042 was accepted 8 days ago and is still in progress
- **THEN** it is in the list marked stalled, and selecting it opens `/mod/trades/1042`

#### Scenario: Not stalled yet
- **WHEN** T-1050 was accepted 6 days ago, is in progress and has nothing else pending
- **THEN** it is not in the list

#### Scenario: One row, several reasons
- **WHEN** T-1042 is stalled and a wrong copy waits on its receiver
- **THEN** T-1042 shows once, marked stalled and wrong copy waiting

#### Scenario: Request the trade outlived
- **WHEN** T-516 completed while a request to cancel it was still pending
- **THEN** T-516 is not in the list for that request

#### Scenario: Away leg
- **WHEN** a leg of in-progress T-1060 has an objekt that left the giver 30 hours ago
- **THEN** T-1060 is listed with the objekt away and the time it breaks, 42 hours from now

### Requirement: Repeat breakers
Trade tracking SHALL list the accounts at fault in two or more trades that failed in the range, most first. An account is at fault in a failed trade when it still owed a transfer while the other party had delivered everything, the rule behind the unfinished count in `web-verified-trades`, so the two never disagree. A trade cancelled with nothing sent harms no one and SHALL not count. Each row SHALL link to the account's console page.

#### Scenario: Two failures
- **WHEN** rin.trades was at fault in two failed trades in the range
- **THEN** rin.trades is listed with 2, linked to `/mod/reports/` for that account

#### Scenario: The other side is not listed
- **WHEN** kaede.k delivered everything in two trades that failed because the partner never sent
- **THEN** kaede.k is not listed

#### Scenario: Cancelled before anything was sent
- **WHEN** yyn_shop sold reserved objekts in two trades that were then cancelled because an objekt left the wallet, before either side sent anything
- **THEN** yyn_shop is not listed for them

#### Scenario: Once is not repeat
- **WHEN** yyn_shop was at fault in one trade in the range
- **THEN** yyn_shop is not listed

### Requirement: Tracker health
Trade tracking SHALL show how far the indexer has read the chain and whether it is behind, as the trade verifier already records and judges it (see Indexer delay in `web-verified-trades`), and when the verifier last ran. When the stored reading can't be read, the section SHALL say the state is unknown. It SHALL never show a time it did not read.

#### Scenario: Indexer behind
- **WHEN** the indexer has recorded nothing past 14:02 and it is now 15:30
- **THEN** the section shows the indexer as behind, read up to 14:02, about 1 hour 28 minutes ago

#### Scenario: Caught up
- **WHEN** the indexer has read the chain to 40 seconds ago
- **THEN** the section shows it as caught up

#### Scenario: Reading unavailable
- **WHEN** the stored reading can't be read
- **THEN** the section says the indexer state is unknown, with no time

### Requirement: Go to trade
Trade tracking SHALL offer a field that opens a trade's staff view by its number, written as `T-1042` or `1042`. A number with no trade SHALL say no trade has that number and stay on the tab.

#### Scenario: Open by number
- **WHEN** a moderator enters "T-1042"
- **THEN** `/mod/trades/1042` opens

#### Scenario: No such trade
- **WHEN** a moderator enters "T-99999" and no such trade exists
- **THEN** the tab says no trade has that number, and stays on Trade tracking

### Requirement: Staff trade view
`/mod/trades/$tradeId` SHALL show a trade to staff: its number, status and cancel reason; both accounts, each linked to its console page; each leg's objekt, giver, receiver, state, and for a verified leg its transaction hash linked to the chain explorer and time; each wrong copy with its serial, state and how it was decided; each request to cancel with who asked, when and its answer; and a dated timeline. A trade that doesn't exist SHALL show not found.

#### Scenario: Failed trade
- **WHEN** a moderator opens failed T-1042, where binary.bin's leg verified and the user's broke
- **THEN** the view shows both accounts linked to their console pages, binary.bin's leg Verified with its hash linking to the explorer, the other leg broken, and a timeline from Accepted to Failed

#### Scenario: Unknown trade
- **WHEN** a moderator opens `/mod/trades/99999`
- **THEN** the not-found surface is shown

### Requirement: Trade tracking layout
Trade tracking SHALL read top to bottom: Tracker health as one strip; the range's figures as tiles; offers sent and trades completed per day as two bar charts; why offers were cancelled; Needs attention as a table; Repeat breakers. Its header SHALL hold the range control, Go to trade and when the totals were counted. Each chart SHALL also give its days and counts to a screen reader.

#### Scenario: Opening the tab
- **WHEN** a moderator opens `/mod/trades` while the indexer is behind
- **THEN** the behind strip comes first, then the tiles, the two charts, the cancel reasons, Needs attention and Repeat breakers

### Requirement: Staff trade view layout
The staff trade view SHALL show its header (number, status, when accepted, both accounts with any active sanction), a line saying offer notes and chat are not shown, then the legs as a table, and the timeline beside the legs on a wide screen and below them on a narrow one.

#### Scenario: Narrow screen
- **WHEN** a moderator opens a trade on a phone
- **THEN** the legs come first and the timeline follows them

### Requirement: Staff trade view carries no user-written text
The staff trade view and its read SHALL carry no offer note, no message text and no excerpt content, for any trade and any staff role. A note the reporter wrote stays on the report in the console.

#### Scenario: Offer note hidden
- **WHEN** a moderator opens T-1042, whose offer was sent with the note "send first pls"
- **THEN** neither the page nor its response carries that note or any message of the conversation

### Requirement: Attached trades link to the staff view
On a console account page, each trade attached to a report SHALL link from its number to its staff trade view.

#### Scenario: From a report
- **WHEN** a moderator opens spam.seller22's page, where a report carries T-1042, and selects T-1042
- **THEN** `/mod/trades/1042` opens

### Requirement: Message totals
Message totals SHALL count per day: messages sent (text and cards; offers are counted on Trade tracking), conversations started (by their first message or offer), scam-phrase flags by category, reports filed against an account by reason, and sanctions issued by type. Each SHALL show its range's sum.

#### Scenario: Totals for a range
- **WHEN** in the last 30 days 4,200 messages were sent, 310 conversations started, 18 send-first and 7 outside-payment flags were recorded, 12 reports filed and 3 sanctions issued
- **THEN** the range's sums show those numbers

#### Scenario: Conversation opened but never used
- **WHEN** a user opens a conversation with Message and sends nothing
- **THEN** no conversation is counted as started

### Requirement: Most-flagged accounts
Message totals SHALL list up to 20 accounts with the most scam-phrase flags in the range, most first, each with its count per category and a link to its console page.

#### Scenario: Top account
- **WHEN** spam.seller22 has 9 send-first and 4 outside-payment flags in the range, more than anyone else
- **THEN** spam.seller22 heads the list with 9 and 4, linked to its console page

### Requirement: Message totals carry no text
Message totals and its reads SHALL return counts, categories, reasons, sanction types and account names only. They SHALL carry no message text, card contents, offer notes, report notes, excerpt content or sanction reasons. This keeps the Roles rule in `web-moderation`: no role reads a conversation except through a shared excerpt.

#### Scenario: Message tab returns no text
- **WHEN** an admin opens Message totals over a range in which spam.seller22 sent "send first pls, pay to wise"
- **THEN** the page and every response behind it hold the flag counts for spam.seller22, and no part of that message's text

### Requirement: Message totals layout
Message totals SHALL show one tile per measure (messages, conversations started, scam-phrase flags, reports filed, sanctions issued), each with its range sum and a bar chart per day, a tile with flags by category, and the most-flagged accounts below them as a table. Each chart SHALL also give its days and counts to a screen reader.

#### Scenario: Reading the tiles
- **WHEN** a moderator opens `/mod/messages` for 30 days
- **THEN** each tile shows its 30-day sum and 30 bars, and a screen reader can read each day's count
