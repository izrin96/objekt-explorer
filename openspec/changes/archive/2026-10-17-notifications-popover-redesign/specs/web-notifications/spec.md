## MODIFIED Requirements

### Requirement: Notification bell and popover
A signed-in visitor SHALL see a bell in the frame with a dot while any notification is unread, and none at zero; the bell's label carries the count, and the popover's header shows it as "N new". Activating the bell SHALL open a popover that lists the user's notifications newest first, 20 rows at a time with a control to load more. Each row shows:
- what happened, as a headline with the person it involves in bold;
- for an offer, a trade or a list alert, the objekts it names, as names in monospace;
- for an offer or a trade, its reference (`O-881`, `T-1042`) as a monospace chip, and for a trade its progress as "N of M" beside a bar of M segments;
- where the row leads to something the reader can do, a verb label naming it: Send now on a stall reminder, Review on an offer received or countered, Leave feedback on a completed trade, See matches on a list alert;
- how long ago it happened;
- whether it is unread.

An unread row SHALL carry a dot in the accent colour at its leading edge, a raised background and full-contrast text; a read row's text SHALL be dimmed. It leads with a monochrome tile whose glyph says what happened:
- a transfer verified, a trade completed, an offer accepted, or a wrong copy accepted automatically: a check;
- a stall reminder, a wrong copy coming up for automatic acceptance, or an objekt in the trade that can't be sent right now: a clock;
- a wrong copy sent in a trade: a warning sign;
- an offer or trade cancelled, failed or expired: a cross;
- an offer received, countered, declined or withdrawn, or a wrong copy declined: two arrows;
- a want-list alert: a heart; a reverse-direction alert: a package (see `web-lists`);
- a sanction notice: a shield.

The tiles and badges SHALL use no colour of their own. The only colours in the popover SHALL be the class colour on each objekt, the want and have frames of list alerts, and the accent colour of the unread mark. The unread count in the header SHALL be neutral.

**Objekts in place of the tile.** Where a notification names objekts whose collections the bell has loaded, it SHALL lead with them instead of the tile, in the same slot, so the text column does not move:
- a want-list or reverse-direction alert with one match: that objekt, framed in its want or have colour;
- such an alert with two or three or more matches: the newest two or three objekts as an offset stack, the front one in full and the ones behind it faded, each framed in its colour;
- an offer or trade notification: up to three of the offer's objekts as an offset stack, what the reader gets first and then what they give, with the event's glyph from the list above as a small badge on one corner and the partner's current avatar, small, on the other.

The count in the text SHALL still give the total, which can be higher than three. An offer or trade notification with no loaded objekts, including one written before objekts were stored, SHALL lead with the partner's current avatar, or the first letter of their name when they have none, with the event's glyph as its badge. A list alert with none, and every sanction notice, SHALL keep the tile.

Every offer and trade row SHALL name the partner in its headline as their account is named now, in bold, and show their avatar as it is now: in the lead when the row has no objekts, on the stack's corner when it has.

The glyph SHALL never be the only cue: the headline names the event. The popover SHALL offer Mark all read and, in its header, Notification settings.

**Sections.** The rows SHALL sit under headings, in this order, each shown only when it has a row and none carrying a count:
- Needs you: a trade whose newest notification is a stall reminder or a wrong copy coming up for automatic acceptance, read or not, while the viewer's Trades notifications are on and that notification is under 14 days old (the longest a trade stays open). Those go only to the party who must act, and any later event on the trade replaces them as its newest. An offer SHALL never be listed here, nor a notice that an objekt can't be sent right now, which both parties get;
- Today: anything else from the viewer's current day;
- This week: anything else from the last 7 days;
- Earlier: the rest.

**One row per trade and per conversation.** All of one trade's notifications, read or not, SHALL show as one row, led by the newest. So SHALL all of one conversation's offer notifications. When the row holds more than one, it SHALL say "N updates", and activating that SHALL list up to 10 of the earlier ones under it, newest first, each with its own headline and time, without leaving the popover. The row is unread while its newest notification is. List alerts and sanction notices SHALL not be grouped this way.

**Tabs.** Under the header, the popover SHALL offer three tabs:
- All: every notification;
- Trades: offer and trade notifications;
- Lists: want-list and reverse-direction alerts.

All is selected each time the popover opens. Each tab lists its own notifications newest first, 20 rows at a time, filtered by the server. The unread count, the bell's dot and Mark all read SHALL stay account-wide whatever tab is shown. An empty tab SHALL say it has nothing of its kind, SHALL show a dimmed example row of the kind it would list, and SHALL offer a next step: Go to Lists on All, Browse trades on Trades, Make a want list on Lists. When All lists rows and none is unread, it SHALL say "You're all caught up" above them. A request for notifications that names no tab SHALL be treated as All.

**Phones.** Below `sm`, the bell SHALL open the same contents as a full-screen sheet, with the title, the unread count, Mark all read, Notification settings and a close control in its header, then the tabs and the list. Each row SHALL be at least 44 px tall, and a verb label SHALL sit on its own line under the row's text. Closing the sheet SHALL return focus to the bell, and activating a notification SHALL navigate to its target. From `sm` up, it stays a popover 400 px wide. Activating a notification SHALL mark it read and navigate to its target. A signed-out visitor SHALL see no bell.

#### Scenario: Unread count
- **WHEN** a signed-in user has 12 unread notifications
- **THEN** the bell shows a dot, the popover's header reads "12 new", and it lists the newest 20 rows with the 12 unread ones marked

#### Scenario: Open a notification
- **WHEN** the user activates an unread want-list alert in the popover
- **THEN** it is shown as read, the bell's count drops by one, and the browser is at the alert's target

#### Scenario: Mark all read
- **WHEN** the user activates Mark all read
- **THEN** no notification is unread and the bell shows no number

#### Scenario: Signed out
- **WHEN** a visitor without a session loads any page
- **THEN** no bell is rendered, and no notification request or per-user connection is made

#### Scenario: Language follows the viewer
- **WHEN** a want-list alert is created while the user browses in English, and they then switch the site to 한국어
- **THEN** the same notification reads in Korean

#### Scenario: Kinds at a glance
- **WHEN** the popover lists a verified transfer, a reminder and a cancelled offer, written before objekts were stored
- **THEN** each leads with the partner's avatar badged with a check, a clock and a cross, in the same grey, each beside its own headline

#### Scenario: Several matches
- **WHEN** a want-list alert says 5 matches for "Specials I need", and the bell has loaded the newest three collections
- **THEN** it leads with those three as an offset stack framed in the want colour, and the text still says 5

#### Scenario: One match
- **WHEN** a want-list alert names one match
- **THEN** it leads with that single objekt, not a stack

#### Scenario: Offer received
- **WHEN** mina sends the user an offer of JiWoo 110A and Kaede 112A for their SeoYeon 204Z
- **THEN** the user's row leads with JiWoo 110A, Kaede 112A and SeoYeon 204Z stacked with a two-arrows badge and mina's avatar on the stack's corner, reads "mina sent you an offer" with mina in bold, names the three objekts in monospace, shows the chip O-881 and the label Review, and sits under Today, not Needs you

#### Scenario: Partner's avatar
- **WHEN** a trade notification written last week names rin.trades, who has since set a new avatar and has no stored objekts on the row
- **THEN** the row leads with rin.trades' current avatar

#### Scenario: Moderator notice
- **WHEN** the user receives a warning from moderators
- **THEN** it leads with the shield tile, in the same grey as every other tile

#### Scenario: Wrong copy sent
- **WHEN** the giver in T-1042 sends #1207 where the trade asks for #1203
- **THEN** both parties get a notification badged with a warning sign that names the other party, T-1042 and both serials, linking to the trade page

#### Scenario: Wrong copy declined
- **WHEN** the receiver declines that copy
- **THEN** the giver gets a notification badged with two arrows that says it was declined, linking to the trade page

#### Scenario: Trades tab
- **WHEN** the user has a want-list alert, a countered offer and a verified transfer, and selects Trades
- **THEN** only the countered offer and the verified transfer are listed

#### Scenario: Mark all read from a tab
- **WHEN** the user selects Lists and activates Mark all read
- **THEN** every notification on every tab is read, and the bell shows no dot

#### Scenario: Phone sheet
- **WHEN** a signed-in user taps the bell at 390 px
- **THEN** the notifications open full screen with All, Trades and Lists tabs, and the close control returns to the page

#### Scenario: Read and unread
- **WHEN** the popover lists one unread and one read notification
- **THEN** the unread row has the leading dot, the raised background and full-contrast text, and the read row has none of them and dimmed text

#### Scenario: Needs you
- **WHEN** binary.bin has sent their side of T-1042 and the user's stall reminder for it is the trade's newest notification
- **THEN** that row sits under Needs you with the label Send now, read or not

#### Scenario: Leaves Needs you
- **WHEN** the user's transfer for T-1042 is then verified
- **THEN** the trade's row leads with the verified transfer and moves out of Needs you

#### Scenario: Trades notifications off
- **WHEN** the user has a stall reminder for T-1042 and turns Trades notifications off
- **THEN** T-1042's row moves out of Needs you, since no later event on the trade would reach the bell

#### Scenario: One row per trade
- **WHEN** T-89 has three notifications the user has read, and a fourth arrives
- **THEN** the popover shows one unread row for T-89 led by the fourth, saying "3 updates", and activating that lists the three earlier ones under it

#### Scenario: Time sections
- **WHEN** the user has notifications from this morning, three days ago and three weeks ago, none of them a reminder
- **THEN** they sit under Today, This week and Earlier

#### Scenario: Empty Lists tab
- **WHEN** the user has no list alerts and selects Lists
- **THEN** the tab says it has no list alerts, shows a dimmed example alert, and offers Make a want list

#### Scenario: All caught up
- **WHEN** the user has notifications and none is unread
- **THEN** All says "You're all caught up" above them, and the header shows no count

### Requirement: Offer notifications
A user SHALL be notified when an offer:
- is received;
- is countered;
- they sent is accepted or declined;
- sent to them is withdrawn;
- expires;
- either way is cancelled, with the reason.

Notifications for one conversation SHALL show as a single row, read or not (see Notification bell and popover). Opening one SHALL go to the conversation, or to the trade page once the offer is accepted.

#### Scenario: Countered
- **WHEN** rin.trades counters the user's offer
- **THEN** the bell shows "rin.trades countered your offer" with the chip O-881, which opens the conversation

#### Scenario: Expired
- **WHEN** an offer the user sent goes unanswered for 7 days
- **THEN** both parties are notified that it expired

### Requirement: Trade notifications
Each party SHALL be notified when, in one of their trades:
- a leg verifies;
- the trade completes, with a prompt to leave feedback;
- the trade is cancelled or fails, with the reason;
- a stall reminder is due.

For a wrong copy (see `web-verified-trades` Wrong copy sent):
- its notification SHALL say when it counts as accepted;
- the receiver SHALL be reminded once, 24 hours before, while it is still pending, with the stall reminder's clock;
- both parties SHALL be notified when it is accepted automatically, with the check of a verified transfer.

Notifications for one trade SHALL show as a single row, read or not (see Notification bell and popover), and opening one SHALL go to the trade page.

#### Scenario: Leg verified
- **WHEN** binary.bin's transfer of HyeRin 301Z #1203 to the user is verified
- **THEN** the bell shows "binary.bin's transfer is verified" with the chip T-1042 and "1 of 2", which opens the trade page

#### Scenario: Wrong copy due
- **WHEN** a wrong copy on T-1042 has 24 hours left and the receiver hasn't answered
- **THEN** the receiver's bell shows a reminder that it counts as accepted tomorrow unless they decline, which opens the trade page

#### Scenario: Accepted automatically
- **WHEN** that copy's deadline passes
- **THEN** both parties' bells show that #1207 was accepted in place of #1203 on T-1042
