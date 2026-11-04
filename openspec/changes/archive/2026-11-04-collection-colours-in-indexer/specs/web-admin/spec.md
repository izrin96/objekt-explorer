## MODIFIED Requirements

### Requirement: Tabs the role cannot open
A tab the viewer's role may not open SHALL be left out of the strip. Opening its route SHALL show the not-found surface without requesting its data, and the server SHALL refuse that tab's requests from the viewer, changing nothing.

#### Scenario: Moderator on Collections
- **WHEN** a moderator who isn't an admin opens `/mod/collections`
- **THEN** the not-found surface is shown, no collection colour data is requested, and the strip they see elsewhere has no Collections tab

#### Scenario: Moderator's request
- **WHEN** a moderator sends a colour save or a Refresh collection list request
- **THEN** it is refused, and no collection colour, audit entry or list timestamp changes

### Requirement: Colour overrides win over the source
A collection MAY have a staff override for its text colour, its background colour, or both. An override SHALL be stored on the collection's indexed data in place of the source's colour, with the source's colour kept beside it, so every response that carries a collection's colours (the collection list, profiles, lists, Trade, activity and the live feed) carries the override and the source's colour where there is none. The indexer saving the collection again SHALL keep it.

#### Scenario: Text colour override
- **WHEN** atom01-heejin-322z's source text colour is #000000 and an admin has set it to #FFFFFF
- **THEN** its card shows white text on the collection page, on profiles that hold it and in lists naming it, and its background stays the source colour

#### Scenario: Reindexed collection
- **WHEN** the indexer saves atom01-heejin-322z again after its metadata changed
- **THEN** its text colour override still applies

#### Scenario: Saved while the indexer saves
- **WHEN** an admin saves atom01-heejin-322z's text colour while the indexer is saving that collection after a metadata change
- **THEN** once both finish, the collection carries the admin's text colour and the indexer's new metadata

#### Scenario: Reindexed from scratch
- **WHEN** the indexer database is rebuilt from the chain and the colour replay is then run
- **THEN** each collection whose latest history entry sets a colour carries that colour again with the rebuilt colour as its source, and a collection whose latest entry reset a colour shows the rebuilt source colour

#### Scenario: Before the replay
- **WHEN** the indexer database was rebuilt and the colour replay has not run yet
- **THEN** every collection shows the source's colours and Overrides only lists none

### Requirement: Edit a collection's colours
In the collections table, Edit SHALL turn that row's two colours into hex fields, one row at a time, and the row's card SHALL follow what the fields hold, before saving. Save SHALL store the colours as they read in the row and write an audit entry naming the slug and the old and new values; a save whose audit entry cannot be written SHALL store nothing. Cancel SHALL leave the row as it was.

#### Scenario: Preview before saving
- **WHEN** an admin edits ever01-seoyeon-338z's row and types #07328D as its text colour
- **THEN** the row's card shows that text colour and nothing is stored until Save

#### Scenario: Save
- **WHEN** the admin saves it
- **THEN** the override is stored, the row names the admin and the time and shows the source colour struck through, and the history lists the change with the old and new colour

#### Scenario: Unknown collection
- **WHEN** a save names a slug no collection has
- **THEN** the save is refused with nothing stored

#### Scenario: History unavailable
- **WHEN** an admin saves a colour while the collection history cannot be written
- **THEN** the page says the save failed, and the collection keeps the colours it had

### Requirement: Colour values
A colour staff set SHALL be a hex value of 6 digits after `#`, in any letter case, and SHALL be stored and shown in one case. Any other value SHALL be refused, by the page before sending and by the server, and nothing SHALL be stored. A source colour SHALL be kept as the source gave it, so Reset restores it unchanged.

#### Scenario: Three digits
- **WHEN** an admin enters #fff as a text colour in a row
- **THEN** the field says the colour needs 6 hex digits, the row's Save is unavailable, and a request carrying it is refused

#### Scenario: Letter case
- **WHEN** an admin saves #b400ff and later opens the collection again
- **THEN** the colour reads the same as #B400FF would

#### Scenario: Malformed source
- **WHEN** a collection's source text colour reads #7328D and an admin sets it to #07328d
- **THEN** the row shows #07328d with the source colour struck through beside it, and after a Reset the collection list carries #7328D again

### Requirement: Reset to the source colour
Each overridden colour in a row SHALL offer Reset, which puts back the source colour kept when staff first changed it, with an audit entry. Resetting the last colour of a collection SHALL leave it with no override, so Overrides only no longer shows it.

#### Scenario: Reset the text colour
- **WHEN** an admin resets atom01-heejin-322z's text colour override of #FFFFFF, whose source is #000000
- **THEN** its cards show black text again on their next load, and Overrides only no longer shows it

#### Scenario: Reset one of two
- **WHEN** a collection overrides both colours and an admin resets only its background
- **THEN** the text colour override stays, and the background shows the source colour

#### Scenario: Reset after two saves
- **WHEN** divine01-seoyeon-317z's source background is #FF7477, an admin saves #b400ff, then #df2e37, then resets the background
- **THEN** its background is #FF7477 again

### Requirement: Overrides only
The collections table SHALL offer Overrides only, which narrows it to the collections with an override, newest change first. A collection with an override but no history entry SHALL come last, with no one named. With nothing overridden it SHALL say every collection shows the source's colours.

#### Scenario: Seeded overrides
- **WHEN** an admin turns on Overrides only right after this change is deployed
- **THEN** the table holds the 16 overrides the site applied before, with no one named as the last to change them

#### Scenario: After a save
- **WHEN** an admin saves the background of divine01-seoyeon-317z and turns on Overrides only
- **THEN** divine01-seoyeon-317z comes first, naming that admin and the time of the save

### Requirement: A colour change reaches browsers on their next load
Saving or resetting a colour SHALL refresh the collection list as Refresh collection list does, after the change is stored. A browser holding the earlier list SHALL get the new one on its next page load instead of being told its copy is current. Every other page that shows the collection SHALL show the change on its next load. A tab already open keeps its colours until it is loaded again.

#### Scenario: Browser holding the old list
- **WHEN** a visitor loaded the collection list, an admin then saves a background colour, and the visitor reloads
- **THEN** the visitor's browser gets the full list again, with the new background

#### Scenario: Other pages
- **WHEN** an admin saves the background of divine01-seoyeon-317z, and a visitor then loads a profile that holds it, a list naming it and the activity page
- **THEN** each shows the new background

#### Scenario: Refresh fails after the save
- **WHEN** a colour is stored but the list cannot be refreshed
- **THEN** the page says the colour was saved and the list was not refreshed, and offers Refresh collection list
