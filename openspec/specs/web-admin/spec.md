# web-admin Specification

## Purpose
The staff area of `apps/web` under `/mod`: one place, split into tabs by role, where moderators and admins handle reports, look up addresses, review profile banners and fix collection data the source gets wrong.

## Requirements
### Requirement: Staff area
`/mod` SHALL be one area with a tab strip. The strip SHALL list, in the order this spec defines them, every tab (each a "… tab" requirement here) that the viewer's role may open, and mark the current one. Each tab names its route and the roles that may open it. Opening `/mod` SHALL go to the first tab the viewer may open. A later change adds a tab by adding a "… tab" requirement.

#### Scenario: Moderator's tabs
- **WHEN** a moderator opens `/mod`
- **THEN** the URL becomes `/mod/reports`, and the strip includes Reports, Addresses and Banners, has no Collections, and marks Reports as current

#### Scenario: Admin's tabs
- **WHEN** an admin opens `/mod/banners`
- **THEN** the strip includes Reports, Addresses, Banners and Collections, and marks Banners as current

### Requirement: Staff area is not found for everyone else
Every route under `/mod` SHALL show the not-found surface to a visitor who is signed out or has neither the moderator nor the admin role, before any data of the area is requested. Every staff request from such a visitor SHALL be refused as not found, so the area's existence is not confirmed.

#### Scenario: Signed-in user
- **WHEN** a signed-in user without a staff role opens `/mod`, `/mod/banners` or `/mod/collections`
- **THEN** the not-found surface is shown and no banner, collection or report data is requested

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/mod/collections/atom01-heejin-322z`
- **THEN** the not-found surface is shown

### Requirement: Tabs the role cannot open
A tab the viewer's role may not open SHALL be left out of the strip. Opening its route SHALL show the not-found surface without requesting its data, and the server SHALL refuse that tab's requests from the viewer, changing nothing.

#### Scenario: Moderator on Collections
- **WHEN** a moderator who isn't an admin opens `/mod/collections`
- **THEN** the not-found surface is shown, no collection override is requested, and the strip they see elsewhere has no Collections tab

#### Scenario: Moderator's request
- **WHEN** a moderator sends a colour save or a Refresh collection list request
- **THEN** it is refused, and no override, audit entry or list timestamp changes

### Requirement: Account menu entry
The account menu SHALL show a Moderation item to staff only, opening `/mod`. Anyone else SHALL see no such item.

#### Scenario: Staff menu
- **WHEN** a moderator opens the account menu and activates Moderation
- **THEN** the URL is `/mod/reports`

#### Scenario: User menu
- **WHEN** a signed-in user without a staff role opens the account menu
- **THEN** it has no Moderation item

### Requirement: Reports tab
The Reports tab SHALL be `/mod/reports` and its account pages, the Moderator console of `web-moderation`, unchanged apart from the tab strip above it. Moderators and admins SHALL see it.

#### Scenario: Console under the strip
- **WHEN** a moderator opens `/mod/reports/` for spam.seller22
- **THEN** the tab strip shows Reports as current above the console, and the console shows spam.seller22 as before

### Requirement: Addresses tab
The Addresses tab SHALL be `/mod/addresses`: a field that takes a Cosmo address and opens its lookup at `/mod/addresses/$address` (see `web-moderation`). A value that isn't an address SHALL be refused in place, with nothing requested. The lookup page SHALL show the strip with Addresses current. Moderators and admins SHALL see it.

#### Scenario: Look up an address
- **WHEN** a moderator enters an address rin.trades once held on `/mod/addresses`
- **THEN** the URL is `/mod/addresses/` with that address, and its link history shows rin.trades

#### Scenario: Not an address
- **WHEN** a moderator enters "rin.trades" in the field
- **THEN** the field says it needs an address, and no lookup is requested

### Requirement: Banners tab
The Banners tab SHALL be `/mod/banners`, holding the banner feed. Moderators and admins SHALL see it.

#### Scenario: Open the feed
- **WHEN** a moderator activates Banners in the strip
- **THEN** the URL is `/mod/banners` and the banner feed is shown

### Requirement: Collections tab
The Collections tab SHALL be `/mod/collections`, holding the collections table, Refresh collection list and the collection history. Only admins SHALL see it.

#### Scenario: Open Collections
- **WHEN** an admin activates Collections in the strip
- **THEN** the URL is `/mod/collections`, showing a search field, an Overrides only filter, the table of collections, Refresh collection list and the recent history

### Requirement: Colour overrides win over the source
A collection MAY have a staff override for its text colour, its background colour, or both. Every response that carries a collection's colours (the collection list, profiles, lists, Trade, activity and the live feed) SHALL carry an overridden colour in place of the source's, and the source's for a colour with no override. Overrides SHALL be kept apart from the indexed collection data, so reindexing never changes or loses them.

#### Scenario: Text colour override
- **WHEN** atom01-heejin-322z's source text colour is #000000 and an admin has set it to #FFFFFF
- **THEN** its card shows white text on the collection page, on profiles that hold it and in lists naming it, and its background stays the source colour

#### Scenario: Reindexed collection
- **WHEN** the indexer saves atom01-heejin-322z again after its metadata changed
- **THEN** its text colour override still applies

### Requirement: Collections table
`/mod/collections` SHALL be one table of every collection, one row each, with a search field that filters it by member, collection number or slug. Each row SHALL show a small card in the collection's current colours, its slug with its artist, season and class, its text and background colour, each overridden colour with its source value struck through beside it, and who last changed its override and when, or that its colours are the source's.

#### Scenario: Find a collection
- **WHEN** an admin types "seoyeon 338" in the search field
- **THEN** the table shows ever01-seoyeon-338z's row, with its text colour #07328d and the source #000000 struck through beside it

### Requirement: Edit a collection's colours
In the collections table, Edit SHALL turn that row's two colours into hex fields, one row at a time, and the row's card SHALL follow what the fields hold, before saving. Save SHALL store the colours as they read in the row and write an audit entry naming the slug and the old and new values; Cancel SHALL leave the row as it was.

#### Scenario: Preview before saving
- **WHEN** an admin edits ever01-seoyeon-338z's row and types #07328D as its text colour
- **THEN** the row's card shows that text colour and nothing is stored until Save

#### Scenario: Save
- **WHEN** the admin saves it
- **THEN** the override is stored, the row names the admin and the time and shows the source colour struck through, and the history lists the change with the old and new colour

#### Scenario: Unknown collection
- **WHEN** a save names a slug no collection has
- **THEN** the save is refused with nothing stored

### Requirement: Colour values
A colour SHALL be a hex value of 6 digits after `#`, in any letter case, and SHALL be stored and shown in one case. Any other value SHALL be refused, by the page before sending and by the server, and nothing SHALL be stored.

#### Scenario: Three digits
- **WHEN** an admin enters #fff as a text colour in a row
- **THEN** the field says the colour needs 6 hex digits, the row's Save is unavailable, and a request carrying it is refused

#### Scenario: Letter case
- **WHEN** an admin saves #b400ff and later opens the collection again
- **THEN** the colour reads the same as #B400FF would

### Requirement: Reset to the source colour
Each overridden colour in a row SHALL offer Reset, which removes that colour's override so the source colour applies again, with an audit entry. Resetting the last colour of a collection SHALL leave it with no override, so Overrides only no longer shows it.

#### Scenario: Reset the text colour
- **WHEN** an admin resets atom01-heejin-322z's text colour override of #FFFFFF, whose source is #000000
- **THEN** its cards show black text again on their next load, and Overrides only no longer shows it

#### Scenario: Reset one of two
- **WHEN** a collection overrides both colours and an admin resets only its background
- **THEN** the text colour override stays, and the background shows the source colour

### Requirement: Overrides only
The collections table SHALL offer Overrides only, which narrows it to the collections with an override, newest change first. With nothing overridden it SHALL say every collection shows the source's colours.

#### Scenario: Seeded overrides
- **WHEN** an admin turns on Overrides only right after this change is deployed
- **THEN** the table holds the 16 overrides the site applied before, with no one named as the last to change them

### Requirement: A colour change reaches browsers on their next load
Saving or resetting a colour SHALL refresh the collection list as Refresh collection list does, after the change is stored. A browser holding the earlier list SHALL get the new one on its next page load instead of being told its copy is current. A tab already open keeps its colours until it is loaded again.

#### Scenario: Browser holding the old list
- **WHEN** a visitor loaded the collection list, an admin then saves a background colour, and the visitor reloads
- **THEN** the visitor's browser gets the full list again, with the new background

#### Scenario: Refresh fails after the save
- **WHEN** a colour is stored but the list cannot be refreshed
- **THEN** the page says the colour was saved and the list was not refreshed, and offers Refresh collection list

### Requirement: Refresh collection list
The Collections tab SHALL offer Refresh collection list, showing when the list last changed. It SHALL mark the list as changed now, later than any time a browser was given, so every browser's next load gets the list again. It SHALL write an audit entry. It SHALL change no collection data.

#### Scenario: Refresh
- **WHEN** an admin activates Refresh collection list
- **THEN** the shown time becomes now, the history lists the refresh, and a browser holding the list gets it again on its next load

#### Scenario: Twice in one second
- **WHEN** a refresh lands in the same second as the last change a browser was given
- **THEN** that browser still gets the list again on its next load

### Requirement: Collection history
The Collections tab SHALL show the latest 50 collection audit entries, newest first: colour saves, resets and refreshes, each with the admin, the time, and for a colour the slug and the old and new values. These entries name no account, so no account's audit log shows them.

#### Scenario: History
- **WHEN** an admin saves a text colour and another admin then refreshes the list
- **THEN** the history shows the refresh above the save, each with its admin and time

### Requirement: Banner feed
The banner feed SHALL be a grid of tiles, one per profile that has a banner now, newest change first, 30 at a time with a control to load more. Banners set before their time was recorded SHALL come last. The feed shows only current banners: a replaced or removed banner's file is gone.

#### Scenario: Replaced banner
- **WHEN** rin.trades replaces his banner
- **THEN** the feed shows only the new one, at the top

### Requirement: Banner tile
The banner SHALL fill the tile's width at its own shape. Each tile SHALL show the banner (an image, or a muted looping video), the profile's nickname or address linked to its profile page, when it was set, and, when an account holds the profile, that account linked to its console page.

#### Scenario: New upload on top
- **WHEN** kaede.k sets a video banner on her profile and a moderator opens `/mod/banners`
- **THEN** the first tile plays it muted and looping, links to `/@kaede.k` and to kaede.k's console page

#### Scenario: Profile with no account
- **WHEN** a profile unlinked from its account still has a banner
- **THEN** its tile shows the banner and the profile link, and says no account holds it

### Requirement: Banner video playback
A video banner SHALL play only while its tile is on screen and pause when the tile leaves it, loading no more than its metadata before it first plays. Each video tile SHALL offer Play and Pause. Under a reduced-motion preference a video SHALL start still until Play is pressed.

#### Scenario: Scrolling the feed
- **WHEN** a moderator scrolls `/mod/banners` past a video tile
- **THEN** that video plays while its tile is on screen and pauses once it has scrolled away

#### Scenario: Pause
- **WHEN** a moderator presses Pause on a playing video tile
- **THEN** that video stays still, on screen or off, until Play is pressed

#### Scenario: Reduced motion
- **WHEN** a moderator whose system asks for reduced motion opens `/mod/banners`
- **THEN** every video tile shows its banner still, and pressing a tile's Play plays that video muted and looping

### Requirement: Remove a banner
Each tile SHALL offer Remove, which opens a reason field under that tile; the reason, up to 500 characters, is shown to the account. Removal SHALL clear the profile's banner, delete its file, and write an audit entry on the holding account naming the profile, the banner and the reason. It SHALL not be a sanction: it resolves no report and adds nothing to the account's sanctions. A moderator SHALL not remove a staff account's banner; an admin may remove anyone's.

#### Scenario: Remove
- **WHEN** a moderator removes spam.seller22's banner with the reason "explicit image"
- **THEN** the profile shows no banner, the file is deleted, the tile leaves the feed, and spam.seller22's audit log shows a banner removal by that moderator with the reason

#### Scenario: Banner changed meanwhile
- **WHEN** a moderator removes a banner that its owner replaced after the feed loaded
- **THEN** the removal is refused saying the banner changed, and the new banner stays

#### Scenario: Staff account
- **WHEN** a moderator who isn't an admin tries to remove an admin's or another moderator's banner
- **THEN** the removal is refused and the banner stays

#### Scenario: No account
- **WHEN** a moderator removes the banner of a profile no account holds
- **THEN** the banner and its file are gone, the audit entry names the profile, and no one is notified

### Requirement: Banner removal notice
Removing a banner from a profile an account holds SHALL notify that account in the bell, naming the profile and the reason. Like a sanction notice (see `web-notifications`) it SHALL lead with the shield tile, be listed under All, not be grouped, and have no setting to turn it off. Opening it SHALL go to that profile. A deleted account SHALL get no notice.

#### Scenario: Notified
- **WHEN** a moderator removes kaede.k's banner with the reason "someone else's artwork"
- **THEN** kaede.k's bell shows a shield row saying the banner of her profile was removed, with that reason, under All and not Trades or Lists

#### Scenario: Open the notice
- **WHEN** kaede.k opens that notification
- **THEN** it is read and the browser is at her profile page

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
