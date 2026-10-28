# web-notifications Specification

## Purpose
In-app notifications on `apps/web`: what a signed-in user is told, how they see and clear it, how open tabs stay current, and the rules that turn new listings into want-list alerts.

## Requirements

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

**One row per trade and per conversation.** All of one trade's notifications, read or not, SHALL show as one row, led by the newest. So SHALL all of one conversation's offer notifications. When the row holds more than one, it SHALL say "N updates", and activating that SHALL list up to 10 of the earlier ones under it, newest first, each with its own headline and time, and its objekts when they differ from the row's, without leaving the popover. The row is unread while its newest notification is. List alerts and sanction notices SHALL not be grouped this way.

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

### Requirement: Bell links to its settings
The bell's popover SHALL offer a Notification settings link opening `/account/notifications`.

#### Scenario: Open settings from the bell
- **WHEN** the user opens the bell and activates Notification settings
- **THEN** the URL is `/account/notifications` and the popover is closed

### Requirement: Read state is per account
Read state SHALL be stored on the server per account, so a notification read in one tab or on one device is read everywhere. A user SHALL only ever be able to list or change their own notifications.

#### Scenario: Another device
- **WHEN** the user marks all read on their phone and then focuses a desktop tab that was open the whole time
- **THEN** the desktop bell shows no number without a reload

#### Scenario: Foreign id
- **WHEN** a request asks to mark read a notification id that belongs to another account
- **THEN** nothing changes and the response reveals nothing about that notification

### Requirement: Open tabs stay current
While a signed-in page is open, a new notification or a change in read state SHALL appear in the bell within 5 seconds when the per-user live connection is open. Without the connection, it SHALL appear when the window regains focus or within 60 seconds. The live connection SHALL require a valid session and SHALL refuse a connection whose `Origin` is not the site's own origin. It SHALL only deliver events for the account whose session opened it, and its credentials SHALL expire within 15 minutes unless renewed by a still-valid session. A dropped connection SHALL reconnect with backoff; events missed during a drop of up to 5 minutes SHALL be replayed, and after a longer drop the client SHALL refetch, so nothing missed while disconnected is lost. When the account's sessions are revoked, its open connections SHALL close and the tabs SHALL not reconnect.

#### Scenario: Live arrival
- **WHEN** a want-list alert is created for a user with the site open
- **THEN** the bell's count rises within 5 seconds without user action

#### Scenario: Cross-site page
- **WHEN** a page on another origin tries to open the per-user connection with the user's cookies
- **THEN** the connection is refused and no event is delivered

#### Scenario: No session
- **WHEN** the per-user connection is requested without a valid session
- **THEN** it is refused

#### Scenario: Signed out elsewhere
- **WHEN** the user signs out in another tab and this tab's connection credentials come up for renewal
- **THEN** renewal is refused, the connection closes and no further events are delivered

#### Scenario: Banned
- **WHEN** a moderator bans a user who has two tabs open
- **THEN** both tabs lose their connection within 5 seconds, do not reconnect, and show the signed-out state

### Requirement: Notification settings
The Notifications section of the account page (`/account/notifications`) SHALL have one setting per notification type:
- "Someone has what you want": a choice of Off, Any or Can swap, Can swap by default;
- "Someone wants what you have": a choice of Off, Any or Can swap, Can swap by default;
- Offers: a switch, on by default;
- Trades: a switch, on by default.

Each choice SHALL say what it does: Any alerts for every match, Can swap alerts only when the other person also wants something the user has, inside one of the user's posts (see Want-list alerts), and Off sends none. Can swap SHALL say that it leaves out sale listings, and that a list with no link alerts on swap listings. A change SHALL save on its own, as the switches do.

A user who had turned either alert type off before this choice existed SHALL keep it Off. Every other setting of those two types, the default or turned on, SHALL become Can swap.

Turning a type off SHALL stop new notifications of that type. Changing between Any and Can swap SHALL apply to matches the alert job reads after the change. Notifications already created SHALL stay, and SHALL keep the target they were created with.

#### Scenario: Default choice
- **WHEN** a user who has never changed their notification settings opens `/account/notifications`
- **THEN** "Someone has what you want" and "Someone wants what you have" both show Can swap selected

#### Scenario: Earlier opt-out is kept
- **WHEN** a user had turned "Someone has what you want" off before this change
- **THEN** it shows Off, and no want-list alert is created for them

#### Scenario: Turn off "Someone has what you want"
- **WHEN** the user picks Off for "Someone has what you want" and a matching objekt is listed afterwards
- **THEN** no new notification is created for it

#### Scenario: Turn off offers
- **WHEN** the user turns Offers off and then receives an offer
- **THEN** no notification is created, and the offer still appears in the conversation and in My trades

#### Scenario: Turn off trades
- **WHEN** the user turns Trades off and a leg of their trade verifies
- **THEN** no notification is created, and the trade page still shows the leg Verified

### Requirement: Want-list alerts
For each of a user's want lists, whether or not it is on Trade, the system SHALL notify the user when an entry for a collection on that want list is newly added to another account's discoverable have list bound to a Cosmo profile, or to such a sale list set to Sell or swap, when the want list is open to swaps, or to such a sale list when the want list is open to buying (see `web-lists` Want list match option and Sale list Open to). Which of another account's lists take part SHALL follow the same rules as For you (see `web-trade-for-you` Account-wide matches): an idle list does not alert, and neither does a hidden, blocking, blocked or trade-blocked account's list. It SHALL also notify when such a list becomes discoverable. The alert SHALL arrive within 10 minutes, including when entries are committed out of order. An entry SHALL still alert when its save commits up to 10 minutes after it began. A stop of the alert job SHALL delay alerts, not drop them: once the job runs again, every entry added in the meantime SHALL alert, each at most once. Losing the cache server SHALL neither skip nor repeat an alert. Alerts SHALL be grouped as one unread notification per want list per day. While that notification is unread, further matches SHALL update its count and the latest objekts instead of creating new ones. A given want list, source list and collection SHALL alert at most once, even if the entry is removed and added again.

**Any or Can swap.** Which matches alert SHALL follow the user's "Someone has what you want" choice (see Notification settings):
- Any: every match above;
- Can swap: a match only while the other account is one of the people For you lists under Can swap (its Mutual) on the page the alert opens: Compare with naming the alert's list, which compares that list and its linked list (see `web-trade-browse` Matches and Compare with). That means one of the other account's posts can swap with the alert's pair: it holds a collection on the alert's want list, and its want list, open to swaps, wants a collection the user still owns on the have list linked to that want list (see `web-trade-browse` Matches to the signed-in viewer). The post holding the new match need not be that post. A match from a sale list set to Sell only SHALL never alert under Can swap, since a sale is not a swap; one from a sale list set to Sell or swap counts like a have list's.
- A want list with no link can never make Can swap, so under Can swap it SHALL alert for a match from a have list or a sale list set to Sell or swap without asking whether the other account also wants something of the user's, and SHALL never alert for a sale list set to Sell only. Such an alert counts as made under Any.

The alert's target SHALL be For you with Compare with naming that want list (see `web-trade-browse`): `/trade/for-you?match=any&list=<want-list-slug>` for an alert made under Any, and `/trade/for-you?match=mutual&list=<want-list-slug>` for one made under Can swap. A grouped notification SHALL lead to the target of its latest match. A notification made before this choice existed SHALL lead to `match=any`.

No alert SHALL be created for:
- the user's own lists;
- a hidden partner;
- an entry its have or sale list's owner cannot trade, because none of their linked addresses holds it or it is not transferable;
- a collection the user already owns a copy of.

An entry left out only because its owner cannot trade it yet, or, under Can swap, only because the match is not mutual yet, SHALL be checked again on every alert run for 24 hours after the run that first left it out (for an entry added to a list already on Trade, about 24 hours after it was added). It SHALL alert on the first run that finds it passes, and after those 24 hours it SHALL not alert.

#### Scenario: Objekt arrives after it is listed
- **WHEN** another account adds SeoYeon 204Z to a have list on Trade, SeoYeon 204Z is on the user's want list "Binary hunt", and the objekt reaches that account's linked address 20 minutes later
- **THEN** within 10 minutes of the transfer being indexed, the user has an alert for it

#### Scenario: Objekt arrives too late
- **WHEN** the objekt reaches the lister's linked address 30 hours after it was added to their have list
- **THEN** no alert is created for that entry

#### Scenario: New sale listing matches a want list
- **WHEN** the user has "Someone has what you want" on Any, another account adds SeoYeon 204Z to a sale list set to Sell only and shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to buying
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt" naming that objekt and seller, linking to `/trade/for-you?match=any&list=<slug>`

#### Scenario: Sale listing under Can swap
- **WHEN** the user has "Someone has what you want" on Can swap, and the same sale listing matches "Binary hunt"
- **THEN** no alert is created for that entry

#### Scenario: Mutual match
- **WHEN** the user has Can swap, another account adds SeoYeon 204Z to a have list on Trade, SeoYeon 204Z is on "Binary hunt", and that account's want list open to swaps holds a collection the user owns on a bound have list
- **THEN** within 10 minutes the user has an unread notification for "Binary hunt", linking to `/trade/for-you?match=mutual&list=<slug>`

#### Scenario: One-sided match under Can swap
- **WHEN** the user has Can swap, and another account adds SeoYeon 204Z to a have list on Trade, but wants nothing on the user's have lists
- **THEN** no alert is created for that entry

#### Scenario: Match across the user's posts under Can swap
- **WHEN** the user has Can swap, "Binary hunt" is linked to have list "spares", and another account adds SeoYeon 204Z (on "Binary hunt") to its post while that post wants only a collection on the user's have list "doubles", which is linked to a different want list
- **THEN** no alert is created for that entry

#### Scenario: Unlinked want list under Can swap
- **WHEN** the user has Can swap, their want list "wishlist", open to swaps, has no link, and another account that wants nothing of the user's adds a collection on "wishlist" to a have list on Trade
- **THEN** within 10 minutes the user has an alert for "wishlist", linking to `/trade/for-you?match=any&list=<slug>`

#### Scenario: Unlinked want list and a sale listing under Can swap
- **WHEN** the user has Can swap, their want list "wishlist", open to swaps or buying, has no link, and another account adds a collection on "wishlist" to a sale list set to Sell only
- **THEN** no alert is created for that entry

#### Scenario: Becomes mutual within 24 hours
- **WHEN** under Can swap, a one-sided entry was left out, and 3 hours later the other account adds to their want list a collection on the user's have list
- **THEN** a later alert run within 10 minutes of that edit alerts for the entry

#### Scenario: Becomes mutual after 24 hours
- **WHEN** the same happens 30 hours after the entry was first left out
- **THEN** no alert is created for that entry

#### Scenario: Grouped while unread
- **WHEN** three more matches for "Binary hunt" arrive the same day before the user opens the first notification
- **THEN** the user still has one unread notification for "Binary hunt", and it now counts four matches

#### Scenario: Re-added entry
- **WHEN** the seller removes the matched entry and adds it again
- **THEN** no new alert is created for it

#### Scenario: Already owned
- **WHEN** a matching objekt is listed but the user already owns a copy of that collection
- **THEN** no alert is created

#### Scenario: Sale listing and a Trade only want list
- **WHEN** another account adds SeoYeon 204Z to a sale list set to Sell only and shown on the Market, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to swaps only
- **THEN** no alert is created for that entry

#### Scenario: Sell or swap listing and a Trade only want list
- **WHEN** the user has "Someone has what you want" on Any, another account adds SeoYeon 204Z to a sale list set to Sell or swap, and SeoYeon 204Z is on the user's want list "Binary hunt", which is open to swaps only
- **THEN** within 10 minutes the user has an alert for "Binary hunt" naming that objekt, as for a have list

#### Scenario: Have listing and a Buying only want list
- **WHEN** another account adds SeoYeon 204Z to a have list on Trade, and SeoYeon 204Z is on the user's want list "Binary hunt", which is set to Buying only
- **THEN** no alert is created for that entry

#### Scenario: Late commit
- **WHEN** another account's save of SeoYeon 204Z to a matching have list takes 8 minutes to commit, and an alert run passes in the meantime
- **THEN** the user still gets an alert for it, within 10 minutes of the commit

#### Scenario: Alert job down for an hour
- **WHEN** the alert job is stopped for an hour while matching entries are added, and then starts again
- **THEN** every one of those entries alerts as the job catches up, and none alerts twice

#### Scenario: Cache server lost
- **WHEN** the cache server is flushed or recreated between two alert runs
- **THEN** the next run carries on from where the last one stopped: no entry added in between is skipped and none alerts twice

### Requirement: Reverse-direction alerts
Unless the user has "Someone wants what you have" on Off, the system SHALL notify them when another account adds, to a discoverable want list, a collection that is on one of the user's have lists bound to a Cosmo profile, or on such a sale list set to Sell or swap, when that want list is open to swaps, or on such a sale list when that want list is open to buying (see `web-lists` Want list match option and Sale list Open to). The same grouping, once-only, timing and exclusion rules as want-list alerts SHALL apply, grouped per the user's list. The same Any or Can swap rules SHALL apply from the user's side: under Can swap, the other account must be one of the people For you lists under Can swap for the user's list and the want list linked to it, a match against only the user's sale lists set to Sell only SHALL never alert, and the user's have list, or sale list set to Sell or swap, with no link SHALL alert for a match from a want list open to swaps without asking whether the other account has something the user wants, and never for a match that only buying makes, that alert counting as made under Any. The target SHALL be `/trade/for-you?match=any&list=<that-list-slug>` for an alert made under Any, and `/trade/for-you?match=mutual&list=<that-list-slug>` for one made under Can swap.

#### Scenario: Can swap by default
- **WHEN** a user has never changed the setting, someone adds to a want list open to swaps a collection on the user's have list, and that person has on a have list a collection on the user's want list
- **THEN** the user gets a reverse-direction alert

#### Scenario: Off by default
- **WHEN** a user has never changed the setting and someone wants a collection on their have list, but has nothing the user wants
- **THEN** no notification is created, since a one-sided match does not alert under Can swap

#### Scenario: Off
- **WHEN** the user has the setting on Off and someone wants a collection on their have list
- **THEN** no notification is created

#### Scenario: Trade only want list and the user's sale list
- **WHEN** the user has the setting on Any, and another account adds to a want list open to swaps only a collection that is only on the user's sale list set to Sell only
- **THEN** no alert is created

#### Scenario: Buying only want list and the user's have list
- **WHEN** the user has the setting on Any, and another account adds to a want list set to Buying only a collection that is only on the user's have list
- **THEN** no alert is created

#### Scenario: Opening the alert
- **WHEN** the user opens a reverse-direction alert for have list "spares" made under Can swap
- **THEN** the browser is at `/trade/for-you?match=mutual&list=spares`

#### Scenario: Unlinked have list under Can swap
- **WHEN** the user has the setting on Can swap, their have list "extras" has no link, and someone who has nothing the user wants adds to a want list open to swaps a collection on "extras"
- **THEN** the user gets a reverse-direction alert for "extras", linking to `/trade/for-you?match=any&list=extras`

#### Scenario: Unlinked sale list and a buyer under Can swap
- **WHEN** the user has the setting on Can swap, their sale list "for sale", set to Sell only, has no link, and someone adds to a want list open to buying a collection on "for sale"
- **THEN** no notification is created

### Requirement: Retention
Read notifications SHALL be removed 90 days after they were created. Unread notifications SHALL be kept.

#### Scenario: Old read notification
- **WHEN** a notification was read and created more than 90 days ago
- **THEN** it no longer appears in the popover

### Requirement: Sanction notices
A warn, chat mute or trade block SHALL create a notification for the sanctioned user, with the action, the reason and the end date if any. A ban SHALL not, because the account is signed out. A sanction notification SHALL not be grouped with others.

#### Scenario: Warned
- **WHEN** a moderator warns a user with reason "asking traders to send first"
- **THEN** the user's bell shows a warning with that reason

### Requirement: No alerts across blocks
Want-list alerts SHALL not be created between two accounts when either has blocked the other, or about lists of an account under an active trade block.

#### Scenario: Blocked lister
- **WHEN** an account the user blocked lists a collection on the user's want list
- **THEN** no alert is created

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

### Requirement: Alerts from rules
A want list's rules SHALL alert like its objekts, under the same match choice, grouping and exclusions: a new listing of an objekt a rule wants alerts the rule's owner, and an objekt a rule newly wants alerts the owners of matching have and sale lists who turned that alert on. A rule's objekts changing as the owner's holdings change SHALL NOT alert a want list, source list and collection that already alerted.

#### Scenario: Listing matches a rule
- **WHEN** rin.trades lists Lynn CC366 on a have list on Trade, and the user's want list "binary hunt" wants it only through the rule CC366, any member
- **THEN** the user gets the want-list alert for "binary hunt" naming Lynn CC366, as for an objekt added by hand

#### Scenario: Wanted again after a trade
- **WHEN** the user sends Lynn CC366 away, so the rule wants it again, and spares, which already alerted for it, still lists it
- **THEN** no second alert is created for spares and Lynn CC366
