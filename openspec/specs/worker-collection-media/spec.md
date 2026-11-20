# worker-collection-media Specification

## Purpose
Filling indexed collections with the media and fields Cosmo shows a signed-in account (motion video, band image, voice, back image, accent and text colour), read through the sessions users connected, with motion and voice files served from the site's own storage, and kept across indexer re-saves and rebuilds, within a fixed load on Cosmo.

## Requirements

### Requirement: Sync schedule
A newly connected session SHALL be synced on the first run with budget left, and each live session again about every 3 days (72 hours, spread by up to 6 hours per session). A requested sync SHALL start before any scheduled one, in request order. Signed-out sessions SHALL be skipped. With no session key configured, nothing SHALL be synced.

#### Scenario: Just connected
- **WHEN** rin.trades connects rin.t and no other sync is waiting
- **THEN** rin.t is synced within 10 minutes, and its row then shows the sync time and counts

#### Scenario: Every three days
- **WHEN** rin.t last synced 79 hours ago
- **THEN** it is synced again within 10 minutes when no requested sync is waiting

#### Scenario: Sync now goes first
- **WHEN** 40 sessions are due on schedule and rin.trades presses Sync now on rin.t
- **THEN** rin.t's sync starts before any of the 40

### Requirement: A fixed load on Cosmo
The site's syncs together SHALL send Cosmo one request at a time, at least one second apart, at most 50 requests in any 5-minute run and 600 in any hour, however many sessions are connected. A sync cut off by that limit SHALL continue where it stopped on the next run.

#### Scenario: Many sessions
- **WHEN** 2,000 sessions are due at once
- **THEN** Cosmo receives at most 600 sync requests in the next hour, and the rest are synced on later runs in due order

#### Scenario: Large account
- **WHEN** rin.t holds 900 collections and its sync is cut off on page 20 by a run's limit
- **THEN** the next run continues from page 20, not from page 1

### Requirement: A sync reads every collection the account holds
A sync SHALL read the session's collections for every artist the site covers, page by page, until Cosmo's collection count is reached or a page comes back short.

#### Scenario: 114 tripleS collections
- **WHEN** rin.t holds 114 tripleS collections and Cosmo returns 30 a page
- **THEN** the sync reads 4 pages for tripleS and records all 114

### Requirement: What a sync records
For each collection read, the site SHALL record, by collection, the motion video, band image, voice flag, back image, accent colour and text colour Cosmo returned, and when it last changed and was last confirmed, but not which session or user it came from. An empty or null value SHALL NOT clear a recorded one, and a recorded voice SHALL NOT be cleared.

#### Scenario: Seen by two sessions
- **WHEN** session A recorded a band image for an idntt Special collection and session B, which also holds it, returns no band image
- **THEN** the recorded band image stays

### Requirement: Sessions that disagree
A session confirms a collection's record when every non-empty value it reports equals the recorded one, or when its report fills or replaces a value. A different non-empty value SHALL replace a recorded one only when no session has confirmed the record in the last 7 days. The same reports in the same order SHALL always give the same record.

#### Scenario: Two sessions disagree
- **WHEN** session A keeps reporting band image X for a collection and session B keeps reporting band image Y, each every 3 days, and X was recorded first
- **THEN** the record keeps X, and it is not rewritten on either session's sync

#### Scenario: Cosmo changed the value
- **WHEN** every session holding a collection reports band image Y in place of the recorded X for 8 days
- **THEN** the record holds Y after the next sync that reports it

### Requirement: Media onto the collection
The site SHALL put its own copy of the recorded motion video or voice file, and the recorded voice flag, onto the collection, so every response that carries the collection carries them. A collection SHALL never carry Cosmo's address for a motion video or voice file. A recorded band image SHALL NOT be put onto the collection: the band image shown stays the one the site sets for the collection's artist and class. A collection already holding the same values SHALL NOT be written.

#### Scenario: Motion collection
- **WHEN** a sync records a motion video for a Motion collection whose stored motion is empty
- **THEN** once the video is copied, that collection's responses carry the address of the site's copy, under the site's storage address, and never Cosmo's

#### Scenario: Not copied yet
- **WHEN** a sync has recorded a motion video for a collection and the copy has not been made
- **THEN** that collection's responses carry no motion video of Cosmo's, and the copy's address appears after it is made

#### Scenario: Band image recorded only
- **WHEN** a sync records a band image for an idntt Special collection
- **THEN** the collection still shows the site's own idntt Special band image, and nothing is downloaded for the recorded one

### Requirement: Media copied into the site's storage
The site SHALL copy each recorded motion video, and each voice file recorded in the same field, from Cosmo into its own storage, and serve that copy. A source copied once SHALL NOT be downloaded again, even after the indexer is rebuilt. A failed copy SHALL leave the collection as it was and be tried again after 6 hours. Each copy run, every 10 minutes, SHALL download at most 20 files and 300 MB.

#### Scenario: Motion video copied
- **WHEN** a sync records a 4 MB MP4 motion video for a collection
- **THEN** within 20 minutes the drawer plays the video from the site's storage

#### Scenario: Shared motion video
- **WHEN** 2 collections record the same motion video address
- **THEN** it is downloaded and stored once, and both collections carry that one copy

#### Scenario: Cosmo changed the video
- **WHEN** the record's motion video is replaced by a new address
- **THEN** the collection keeps showing the old copy until the new one is stored, and then shows the new one

### Requirement: Safe media downloads
A copy SHALL be downloaded only from the accepted hosts, and only when they resolve to public addresses, following no redirect and sending no Cosmo sign-in. A file over 64 MB SHALL be refused. A file SHALL be stored only when its bytes are MP4 (QuickTime included) or WebM video, or M4A, MP3 or Ogg audio, whatever type the host declares, and SHALL be stored with the type its bytes show.

#### Scenario: Oversized file
- **WHEN** a recorded motion video is 70 MB
- **THEN** nothing is stored for it, the collection carries no motion video, and the copy is tried again 6 hours later

#### Scenario: Redirected download
- **WHEN** the host of a recorded motion video answers with a redirect to another host
- **THEN** the redirect is not followed, nothing is stored, and the collection keeps its motion video as it was

#### Scenario: Not a video
- **WHEN** a recorded motion video's bytes are an HTML page served as `video/mp4`
- **THEN** nothing is stored for it

#### Scenario: Voice file
- **WHEN** a voice Double's recorded media is a 2 MB MP3 served as `application/octet-stream`
- **THEN** it is stored as `audio/mpeg` in the site's storage, and the collection carries the copy's address

#### Scenario: QuickTime voice video
- **WHEN** a voice Double's recorded media is a 47 MB QuickTime video
- **THEN** it is stored as `video/mp4` in the site's storage, and the collection carries the copy's address

#### Scenario: Refused media type
- **WHEN** a recorded file's bytes are ADTS AAC, HEIC or AVIF
- **THEN** nothing is stored for it, and the copy is tried again 6 hours later

### Requirement: Back image and accent colour fill only what is missing
The recorded back image and accent colour SHALL be put on a collection only where it has none. A collection that already has a back image SHALL keep it. At most 50 back images SHALL be filled per run, the rest on later runs.

#### Scenario: Collection without a back image
- **WHEN** a collection created from v3 metadata has no back image and a sync records one
- **THEN** the collection's back image is the recorded one, and its processed copy follows

#### Scenario: Collection with a back image
- **WHEN** a collection has a back image and a sync records a different one
- **THEN** the collection keeps its back image

### Requirement: Cosmo's text colour under staff overrides
A recorded text colour of 6 hex digits SHALL replace a collection's text colour when the collection has no staff text colour. A staff text colour and the source colour kept beside it SHALL NOT be changed. Background colours SHALL NOT be changed.

#### Scenario: No override
- **WHEN** a Unit collection's text colour is the class default #ffffff and a sync records #000000
- **THEN** its cards show #000000 text

#### Scenario: Staff override
- **WHEN** ever01-seoyeon-338z has staff text colour #07328d over the source #000000, and a sync records #1a1a1a
- **THEN** its cards still show #07328d with #000000 struck through beside it in the collections table

#### Scenario: After a Reset
- **WHEN** an admin then resets ever01-seoyeon-338z's text colour
- **THEN** its cards show #000000, and within 10 minutes #1a1a1a

### Requirement: Accepted media addresses
A motion video, voice file or band image SHALL be recorded, and a motion video or voice file copied, only when its address is https, on a Cosmo image or media host the site accepts, and at most 1,024 characters long. Any other SHALL be skipped and counted in the sync's result, and nothing SHALL be downloaded from it.

#### Scenario: Unknown host
- **WHEN** a sync reads a motion video served from a host the site does not accept
- **THEN** nothing is downloaded from that host, the collection's motion stays as it was, and the sync's skipped count includes it

### Requirement: Filled values survive the indexer
A value this capability put on a collection SHALL stay when the indexer saves that collection again, including a save running at the same moment. After the indexer database is rebuilt, the next run SHALL put every recorded value back, whether or not Cosmo is reachable.

#### Scenario: Re-save during a write
- **WHEN** the site writes a motion video onto a collection while the indexer saves that collection after a metadata change
- **THEN** once both finish, the collection carries the motion video and the indexer's new metadata

#### Scenario: Rebuilt indexer
- **WHEN** the indexer database is rebuilt from the chain and no connected account holds a collection any more
- **THEN** within 10 minutes that collection carries the site's copy of its motion video again, with nothing downloaded

### Requirement: Browsers see filled media on their next load
After a run that changed any collection, the full collection list SHALL read as changed, so a browser holding the old list fetches it again on its next load.

#### Scenario: Motion video filled
- **WHEN** a run fills a motion video and a browser that cached the collection list reloads the page
- **THEN** the browser receives the list with the motion video

### Requirement: Sync failures
A session Cosmo refuses with its own error SHALL be marked signed out and its sync stopped. An answer the site cannot read SHALL stop that session's sync, keep what it recorded, show a failure code on its row, and retry it after 6 hours. A malformed collection in an answer SHALL be skipped and counted, not fail the page.

#### Scenario: Refused
- **WHEN** Cosmo answers rin.t's sync as forbidden with its own error
- **THEN** rin.t's session is marked signed out and no further request is sent with it

#### Scenario: Unreadable page
- **WHEN** Cosmo answers rin.t's second page with a body the site cannot read
- **THEN** the collections from the first page stay recorded, rin.t's row shows an unexpected answer, and rin.t is tried again 6 hours later

### Requirement: Backing off from Cosmo
When Cosmo answers too many requests, fails, times out or blocks the request, syncing SHALL stop until a backoff ends: 5 minutes, doubling with each run that fails again, up to 2 hours, and kept across a worker restart. The session SHALL stay live, keep its place in the queue, and show that Cosmo was unavailable. Recorded values SHALL still be put onto collections meanwhile.

#### Scenario: Cosmo down
- **WHEN** Cosmo answers rin.t's second page with a server error
- **THEN** the collections from the first page stay recorded, rin.t's row shows that Cosmo was unavailable, rin.t stays live, and no sync request is sent to Cosmo for 5 minutes

#### Scenario: Restart during backoff
- **WHEN** the worker restarts 10 minutes into a 20-minute backoff
- **THEN** no sync request is sent to Cosmo until the 20 minutes have passed

### Requirement: Syncs are repeatable
Running a sync again, or a requested sync overlapping a scheduled one, SHALL change nothing beyond what one run changes.

#### Scenario: Two syncs in a row
- **WHEN** rin.t is synced twice with no change at Cosmo in between
- **THEN** the second sync writes no collection
