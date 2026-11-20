## ADDED Requirements

### Requirement: Cosmo's colour
Cosmo's text colour for a collection SHALL be the one recorded from connected accounts' reads, unknown while none is recorded. Cosmo's background colour SHALL be the source's background.

#### Scenario: Text colour not yet read
- **WHEN** no connected account's read has recorded a text colour for atom01-heejin-322z
- **THEN** its Cosmo text colour is unknown, and its row shows none

### Requirement: Pinned and fill colours
Each staff colour, text or background, SHALL be either pinned or a fill, and a pin SHALL exist only on an overridden colour. A pinned colour SHALL be shown whatever Cosmo's colour is, and only staff SHALL change it. A fill equal to Cosmo's colour, ignoring letter case and surrounding spaces, SHALL be dropped, showing Cosmo's colour as 6 lowercase hex digits after `#`. A fill that differs SHALL stay shown, and Differs from Cosmo SHALL list its collection.

#### Scenario: Fill that Cosmo confirms
- **WHEN** cream02-jiwoo-372z has the unpinned staff background #e07b36 over the source "#E07B36 "
- **THEN** within 10 minutes its override is gone, its cards show #e07b36, and Overrides only no longer lists it

#### Scenario: Fill that Cosmo contradicts
- **WHEN** cream02-jiwoo-373z has the unpinned staff text colour #000000 and Cosmo's recorded text colour is #2d1f17
- **THEN** its cards keep showing #000000 and Differs from Cosmo lists it

#### Scenario: Pinned colour
- **WHEN** divine01-seoyeon-317z has the pinned staff background #df2e37 over the source #FF7477
- **THEN** its cards show #df2e37, and Differs from Cosmo does not list it

#### Scenario: Fill with no Cosmo read
- **WHEN** atom01-heejin-322z has the unpinned staff text colour #ffffff and no text colour is recorded for it
- **THEN** its cards show #ffffff and Differs from Cosmo does not list it, until a read records one

### Requirement: Differs from Cosmo
The collections table SHALL offer Differs from Cosmo, which narrows it to the collections with a fill that differs from Cosmo's colour, and shows how many collections there are. Each listed colour SHALL offer Pin (keep the staff colour) and Reset (take Cosmo's colour); either SHALL remove it from the filter and write an audit entry. With none left it SHALL say staff and Cosmo agree on every unpinned colour.

#### Scenario: Nothing left
- **WHEN** every unpinned staff colour equals Cosmo's colour or has none recorded
- **THEN** Differs from Cosmo lists nothing and says staff and Cosmo agree

### Requirement: Differs from Cosmo groups
Differs from Cosmo SHALL group, per colour, the collections of one collection number (same artist, season and number) that share both the staff colour and Cosmo's colour, showing each group once with its members. Pin or Reset on a group SHALL apply to every member, each writing its own audit entry. A member that changed since the list loaded SHALL be left as it is and named as skipped. A member decided apart from its group is changed with Edit or Reset on its own row.

#### Scenario: Keep mine
- **WHEN** ten Cream02 373Z members have the unpinned staff text colour #000000, each with the recorded text colour #2d1f17, and an admin pins that group
- **THEN** all ten keep #000000, the group leaves the filter, and the history lists ten pins with the admin and the time

#### Scenario: Use Cosmo
- **WHEN** ten Cream02 373Z members have the unpinned staff text colour #000000, each with the recorded text colour #2d1f17, and an admin resets that group
- **THEN** all ten show #2d1f17 on their next load, the filter no longer lists the group, and the history holds ten resets

#### Scenario: Members that differ inside one number
- **WHEN** some Cream02 376Z members have a fill of #000000 against Cosmo's #ffffff, and others a fill of #ffffff against Cosmo's #000000
- **THEN** Differs from Cosmo shows two 376Z groups, and pinning one leaves the other listed

#### Scenario: Member changed meanwhile
- **WHEN** an admin resets a group while another admin has already pinned one of its members
- **THEN** that member keeps its pinned colour, the result names it as skipped, and the other members are reset

### Requirement: Suggested colour for unread members
The collections table SHALL offer Suggestions, with its count, listing each collection number where every member with a recorded text colour agrees on it (ignoring letter case) and some unread member shows a different text colour. An unread member has no recorded text colour and no staff text colour. Each suggestion SHALL name the read members, the colour and the unread members it would change. Nothing SHALL change for an unread member until an admin applies a suggestion.

#### Scenario: One member read
- **WHEN** atom02-kimlip-369z has the recorded text colour #2d1f17, and atom02-haseul-369z has none recorded, shows #ffffff and has no staff colour
- **THEN** Suggestions offers #2d1f17 for atom02-haseul-369z, naming atom02-kimlip-369z, and atom02-haseul-369z keeps #ffffff until an admin applies it

### Requirement: Apply a suggestion
Apply SHALL store the suggested colour as an unpinned staff text colour on each unread member it names, each with an audit entry naming the admin and the read members the colour came from. A member that is no longer unread SHALL be skipped and named.

#### Scenario: Apply
- **WHEN** an admin applies #2d1f17 suggested from atom02-kimlip-369z to atom02-haseul-369z
- **THEN** atom02-haseul-369z shows #2d1f17 as an unpinned staff colour over #ffffff, and the history lists the save with the admin and atom02-kimlip-369z as its origin

#### Scenario: Read arrives before Apply
- **WHEN** a read records a text colour for atom02-haseul-369z after the suggestion loaded, and an admin then applies it
- **THEN** atom02-haseul-369z is skipped and named, and nothing is stored for it

#### Scenario: Applied, then a read agrees
- **WHEN** atom02-haseul-369z has the unpinned staff text colour #2d1f17 from a suggestion and a read records #2D1F17 for it
- **THEN** within 10 minutes its override is gone, its cards still show #2d1f17, and the history names Cosmo

#### Scenario: Applied, then a read disagrees
- **WHEN** atom02-haseul-369z has the unpinned staff text colour #2d1f17 from a suggestion and a read records #000000 for it
- **THEN** its cards keep showing #2d1f17 and Differs from Cosmo lists it

#### Scenario: Read members disagree
- **WHEN** Cream02 376Z members recorded both #000000 and #ffffff
- **THEN** Suggestions offers nothing for 376Z

## MODIFIED Requirements

### Requirement: Colour overrides win over the source
A collection MAY have a staff override for its text colour, its background colour, or both, each pinned or a fill. An override SHALL be stored on the collection's indexed data in place of the source's colour, with the source's colour and the pin kept beside it, so every response that carries a collection's colours (the collection list, profiles, lists, Trade, activity and the live feed) carries the override and the source's colour where there is none. The indexer saving the collection again SHALL keep the override and its pin.

#### Scenario: Text colour override
- **WHEN** atom01-heejin-322z's source text colour is #000000 and an admin has set it to #FFFFFF
- **THEN** its card shows white text on the collection page, on profiles that hold it and in lists naming it, and its background stays the source colour

#### Scenario: Reindexed collection
- **WHEN** the indexer saves atom01-heejin-322z again after its metadata changed
- **THEN** its text colour override and its pin still apply

#### Scenario: Saved while the indexer saves
- **WHEN** an admin saves atom01-heejin-322z's text colour while the indexer is saving that collection after a metadata change
- **THEN** once both finish, the collection carries the admin's text colour and pin and the indexer's new metadata

#### Scenario: Reindexed from scratch
- **WHEN** the indexer database is rebuilt from the chain and the colour replay is then run
- **THEN** each collection whose latest history entry sets a colour carries that colour again with the rebuilt colour as its source, and a collection whose latest entry reset a colour shows the rebuilt source colour

#### Scenario: Before the replay
- **WHEN** the indexer database was rebuilt and the colour replay has not run yet
- **THEN** every collection shows the source's colours and Overrides only lists none

### Requirement: Collections table
`/mod/collections` SHALL be one table of every collection, one row each, with a search field that filters it by member, collection number or slug. Each row SHALL show a small card in the collection's current colours, its slug with its artist, season and class, its text and background colour, and who last changed its override and when, or that its colours are the source's. Each overridden colour SHALL show its source value struck through beside it, Cosmo's colour when it is known and differs from the source, and whether it is pinned. When Cosmo last changed it, the row SHALL name Cosmo instead of an admin.

#### Scenario: Find a collection
- **WHEN** ever01-seoyeon-338z has the pinned text colour #07328d and an admin types "seoyeon 338" in the search field
- **THEN** the table shows its row, with its text colour #07328d, the source #7328D struck through beside it, and its pin mark

#### Scenario: Cosmo's colour on the row
- **WHEN** an admin finds cream02-jiwoo-373z, whose staff text colour #000000 replaced the source #ffffff and whose recorded text colour is #2d1f17
- **THEN** the row shows #000000, #ffffff struck through, and #2d1f17 as Cosmo's colour

### Requirement: Edit a collection's colours
In the collections table, Edit SHALL turn that row's two colours into hex fields, each with a Pin checkbox, one row at a time, and the row's card SHALL follow what the fields hold, before saving. A Pin checkbox SHALL start as the colour's pin when it is overridden, otherwise checked when Cosmo's colour is known. Save SHALL store the colours and pins as they read in the row and write an audit entry naming the slug and the old and new values and pins; a save whose audit entry cannot be written SHALL store nothing. A Pin checkbox for a colour that is not overridden after the save SHALL store no pin. Cancel SHALL leave the row as it was.

#### Scenario: Preview before saving
- **WHEN** an admin edits ever01-seoyeon-338z's row and types #07328D as its text colour
- **THEN** the row's card shows that text colour and nothing is stored until Save

#### Scenario: Save
- **WHEN** the admin saves it
- **THEN** the override and its pin are stored, the row names the admin and the time and shows the source colour struck through, and the history lists the change with the old and new colour

#### Scenario: Pin ahead of a Cosmo read
- **WHEN** an admin pins atom01-heejin-322z's text colour #ffffff before any text colour is recorded for it, and a read later records #000000
- **THEN** its cards keep showing #ffffff and Differs from Cosmo does not list it

#### Scenario: Unknown collection
- **WHEN** a save names a slug no collection has
- **THEN** the save is refused with nothing stored

#### Scenario: History unavailable
- **WHEN** an admin saves a colour while the collection history cannot be written
- **THEN** the page says the save failed, and the collection keeps the colours it had

### Requirement: Reset to the source colour
Each overridden colour in a row SHALL offer Reset, which puts back Cosmo's colour when it is known, otherwise the source colour kept when staff first changed it, removes its pin, and writes an audit entry. Resetting the last colour of a collection SHALL leave it with no override, so Overrides only no longer shows it.

#### Scenario: Reset the text colour
- **WHEN** an admin resets atom01-heejin-322z's text colour override of #FFFFFF, whose source is #000000 and for which no text colour is recorded
- **THEN** its cards show black text again on their next load, and Overrides only no longer shows it

#### Scenario: Reset to Cosmo's text colour
- **WHEN** an admin resets cream02-jiwoo-373z's text colour, whose source is #ffffff and whose recorded text colour is #2d1f17
- **THEN** its cards show #2d1f17 on their next load

#### Scenario: Reset one of two
- **WHEN** a collection overrides both colours and an admin resets only its background
- **THEN** the text colour override stays, and the background shows the source colour

#### Scenario: Reset after two saves
- **WHEN** divine01-seoyeon-317z's source background is #FF7477, an admin saves #b400ff, then #df2e37, then resets the background
- **THEN** its background is #FF7477 again

### Requirement: Collection history
The Collections tab SHALL show the latest 50 collection audit entries, newest first: colour saves, pins, resets, applied suggestions, refreshes and overrides Cosmo resolved, each with the admin or Cosmo, the time, and for a colour the slug, the old and new values, the pin and, for a suggestion, the member it came from. These entries name no account, so no account's audit log shows them.

#### Scenario: History
- **WHEN** an admin saves a text colour and another admin then refreshes the list
- **THEN** the history shows the refresh above the save, each with its admin and time

#### Scenario: Override Cosmo resolved
- **WHEN** the worker drops cream02-jiwoo-372z's background fill because it equals the source
- **THEN** the history lists the change with Cosmo in place of an admin, the old value #e07b36 and the new value #e07b36 with no override
