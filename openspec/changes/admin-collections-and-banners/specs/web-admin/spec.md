# Spec Delta

## Purpose

The staff area of `apps/web` under `/mod`: one place, split into tabs by role, where moderators and admins handle reports, look up addresses, review profile banners and fix collection data the source gets wrong.

## ADDED Requirements

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
