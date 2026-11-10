# web-cosmo-link Specification

## Purpose
Binding Cosmo profiles to a site account on `apps/web`: listing linked profiles,
connecting a new one by status-message verification, editing a profile's visibility and
banner, and unlinking.

## Requirements

### Requirement: Linked profiles list
`/account/profiles` SHALL list every Cosmo profile linked to the account with its nickname and address, an
Edit action, an Unlink action behind a confirmation, and a Link Cosmo action opening `/link/connect`.
Unlinking SHALL remove the profile from the list and from the account without a reload. `/link` SHALL redirect to
`/account/profiles`, and every in-app link that opened `/link` SHALL open `/account/profiles`.

The Unlink confirmation SHALL say that for 7 days after unlinking only this account can link the profile again (see Connect flow). Unlink SHALL be refused, with the reason shown in the user's locale and the profile left linked, when:
- the account has an active trade block or ban;
- the profile's address was linked to a party of an in-progress trade when the trade was accepted, and the trade still waits on a transfer.

A chat mute SHALL not refuse an unlink.

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/link`
- **THEN** the URL is `/login?redirect=/account/profiles`

#### Scenario: Old address
- **WHEN** a signed-in user opens `/link`
- **THEN** the URL is `/account/profiles` and their linked profiles are listed

#### Scenario: Unlink
- **WHEN** the user confirms Unlink on a profile
- **THEN** the card disappears and the profile is no longer in the account's profiles

#### Scenario: Unlink while trade blocked
- **WHEN** spam.seller22, trade blocked, confirms Unlink on their profile
- **THEN** the unlink is refused with a message that a moderation action restricts it, and the card stays

#### Scenario: Unlink mid-trade
- **WHEN** the user confirms Unlink on the profile whose address still owes a transfer in in-progress trade T-1050
- **THEN** the unlink is refused with a message that the profile is in a trade in progress, and the card stays

#### Scenario: Unlink during an accept
- **WHEN** the user confirms Unlink on a profile while their partner is accepting an offer between them
- **THEN** either the unlink waits and is then refused because the trade is in progress, or the accept is refused with a message that a linked Cosmo ID changed, and no trade records an address its party no longer holds

#### Scenario: Unlink while muted
- **WHEN** a user muted in chat confirms Unlink on a profile in no trade
- **THEN** the profile is unlinked

### Requirement: Connect flow
`/link/connect` SHALL guide the user through: finding their Cosmo user by nickname search,
checking the address is not already linked, choosing an artist, receiving a verification
code with a countdown from the server's expiry, an "Open Cosmo" action that deep-links
into the Cosmo app, and verifying that the code appears in the profile's status message.
Each server refusal (already linked, rate limited, expired, mismatch, code not found, restricted, cooling down) SHALL
be shown in the user's locale at the step it applies to. Success SHALL add the profile to
the account and offer a link to it and a way back to `/account/profiles`.

After the code is found in the status message, and only then, linking SHALL be refused when:
- **restricted**: any account that has ever held the address has an active trade block or ban. The message SHALL say only that a moderation action restricts the profile, without naming an account. The refusal SHALL lift once the trade block is revoked or the ban ends;
- **cooling down** (switched off since 2026-11-10: `COOLDOWN_DAYS` is 0, so this refusal never fires and the unlink dialogs promise no wait): in the 7 days after the address left another account, by an unlink, a staff unlink or that account's deletion. The message SHALL name the date linking opens. The account the address left SHALL be able to link it again at once.

Before the code is found, the flow SHALL refuse only an address linked now, as before, and SHALL not reveal either refusal above.

#### Scenario: Already linked elsewhere
- **WHEN** the chosen address is linked to another account
- **THEN** the nickname step shows the server's message and the flow does not advance

#### Scenario: Expired code
- **WHEN** the user verifies after the countdown reached zero
- **THEN** the verify step shows the expiry message and offers to generate a new code

#### Scenario: Banned account's address after the proof
- **WHEN** a user puts the code in the status message of a profile whose address was earlier linked to rin.trades, now banned, and presses Verify
- **THEN** the verify step shows that a moderation action restricts this profile, and the profile is not linked

#### Scenario: Banned account's address before the proof
- **WHEN** a user picks the profile whose address is still linked to rin.trades, now banned
- **THEN** the nickname step shows only that the profile is linked to another account

#### Scenario: Ban ends
- **WHEN** rin.trades's ban is revoked, and a user then verifies a profile whose address rin.trades once held
- **THEN** the profile is linked

#### Scenario: Cooldown for another account
- **WHEN** kaede.k unlinks a profile, and two days later another account verifies the code on it
- **THEN** the verify step shows that the profile can be linked again from a date 7 days after the unlink, and the profile is not linked

#### Scenario: Own account relinks at once
- **WHEN** kaede.k unlinks a profile and links it again the same day
- **THEN** the profile is linked to kaede.k

### Requirement: Edit profile
The edit dialog SHALL load the profile's current settings and offer no privacy toggles (hiding the Cosmo ID, serials, activity history or the whole profile is no longer possible), let the user choose a grid
column count between 2 and 18 or unset, and set, replace or remove a banner. Images SHALL
be cropped to the banner ratio and compressed before upload; GIFs and videos SHALL be converted
before upload where the browser can (see Moving banner conversion and Moving banner fallback).
Files of an unsupported type, and files that would upload over the size limit, SHALL be refused
before upload. Saving SHALL persist through the server.

#### Scenario: Banner upload
- **WHEN** the user picks a JPEG, crops it and saves
- **THEN** the profile's banner URL points at the uploaded object and the dialog closes

#### Scenario: Oversized file
- **WHEN** the user picks a file larger than the limit
- **THEN** a message explains the limit and nothing is uploaded

#### Scenario: No privacy toggles
- **WHEN** the user opens the edit dialog of a profile that had Private Profile on before this change
- **THEN** the dialog shows the banner and grid settings only, and saving changes nothing else

### Requirement: Link history
The system SHALL record each time a Cosmo address is linked to an account or leaves it, with the account, the time, and how:
- linked: verified by the code in the status message, or moved in by staff;
- left: unlinked by the user, unlinked by staff, moved out by staff, or the account was deleted.

A staff action SHALL also record the staff member. The record SHALL stay when the account is deleted. Links that existed before the record began SHALL be recorded at their link time. Accounts that held an address before the record began SHALL be recorded where a trade's snapshot names them. Only staff SHALL see the record (see `web-moderation`).

#### Scenario: Deleted account keeps its history
- **WHEN** rin.trades deletes the account while two profiles are linked to it
- **THEN** the history of both addresses shows rin.trades, and that each left it because the account was deleted. For 7 days no other account can link them

#### Scenario: Relink keeps the earlier link
- **WHEN** kaede.k unlinks a profile and links it again
- **THEN** the history shows the first link, the unlink and the second link, in order

### Requirement: Default profile
An account's default profile SHALL name it wherever another account sees it as a person: conversation rows and threads, offers and trades, offer notes, notifications and blocked lists. It SHALL be the profile the user made default, else the first profile the account linked, shown by its nickname or, with none, its shortened address. With no linked profile the display name SHALL be used.

#### Scenario: Make another profile default
- **WHEN** a user with profiles "rin.main" (linked first) and "rin.alt" opens `/account/profiles` and activates Make default in the "rin.alt" card's menu
- **THEN** it saves at once, the Default badge moves to "rin.alt", and their partners' conversation rows and threads head them as "rin.alt" on next load

#### Scenario: One profile
- **WHEN** a user with one linked profile opens `/account/profiles`
- **THEN** no Default badge and no Make default action are shown, and partners see them by that profile

#### Scenario: Default unlinked
- **WHEN** the user unlinks the profile they made default
- **THEN** partners see them by their first linked remaining profile, which now carries the Default badge

#### Scenario: Someone else's address
- **WHEN** a request makes default an address linked to another account
- **THEN** it is refused and the default is unchanged

#### Scenario: Past conversations
- **WHEN** the user changes their default profile
- **THEN** every conversation, past ones included, heads them by the new profile on the other side's next load

#### Scenario: Hide Cosmo ID
- **WHEN** the default profile had Hide Cosmo ID on before this change
- **THEN** partners see that profile's nickname, as for any profile

### Requirement: Sending as
For an account with two or more linked profiles, the message box of a conversation and the offer builder SHALL show a muted line naming the default profile the other person will see ("Sending as <name>"), with a Change link to `/account/profiles`. An account with one or no linked profile SHALL see no such line. A change of default SHALL show in the line on the next load of the conversation or builder.

#### Scenario: Two profiles
- **WHEN** a user whose default profile is "rin.alt", one of two linked profiles, opens a conversation
- **THEN** the message box reads "Sending as rin.alt" with a Change link to `/account/profiles`

#### Scenario: Offer builder
- **WHEN** that user opens the offer builder from a Trade post
- **THEN** the builder reads "Sending as rin.alt"

#### Scenario: One profile
- **WHEN** a user with one linked profile opens a conversation
- **THEN** the message box shows no Sending as line

### Requirement: Removed privacy settings notice
`/account/profiles` SHALL show a dismissible notice at the top saying the privacy settings (Hide Cosmo ID, Hide from Serial Lookup, Hide Activity History, Private Profile) were removed, because Trade needs holdings, serials and transfers visible and they are public on the blockchain anyway. Every signed-in viewer of the page SHALL see it until they dismiss it in that browser.

#### Scenario: First visit after the change
- **WHEN** a signed-in user opens `/account/profiles`
- **THEN** the notice shows above their linked profiles

#### Scenario: Dismissed
- **WHEN** the user dismisses the notice and opens the page again in the same browser
- **THEN** the notice does not show

### Requirement: Still banner compression
A picked JPEG, PNG, WebP or BMP SHALL be uploaded as the user's crop at the 2.4:1 banner ratio, scaled down to at most 2400×1000 pixels (never scaled up), encoded as WebP. Where the browser cannot encode WebP, it SHALL be encoded as JPEG when every pixel is opaque, and as PNG when the crop has transparent pixels. The stored type and the object's file extension SHALL match the uploaded bytes. Save SHALL stay unavailable until the crop area has loaded.

#### Scenario: Large photo is reduced
- **WHEN** the user picks a 4000×3000 JPEG of 6 MB, crops it and saves
- **THEN** the uploaded banner is 2400×1000 pixels, WebP or JPEG, and well under the original size

#### Scenario: Small image is not enlarged
- **WHEN** the user picks a 1200×800 PNG and crops the full width
- **THEN** the uploaded banner is 1200×500 pixels

#### Scenario: BMP is stored as what it is
- **WHEN** the user picks a BMP and saves
- **THEN** the banner's stored type and file extension are WebP or JPEG, not BMP

#### Scenario: Transparent PNG without WebP encoding
- **WHEN** the user picks a PNG with transparent areas and saves in a browser that cannot encode WebP
- **THEN** the uploaded banner is a PNG that keeps its transparency

#### Scenario: Save before the crop area loads
- **WHEN** the user picks a PNG and the crop area has not loaded yet
- **THEN** Save cannot be pressed until it has

### Requirement: Moving banner conversion
A picked GIF or video SHALL be converted before upload, where the browser can, to a silent MP4 cropped to 2.4:1 around its centre, at most 1920 pixels wide and never scaled up, that starts playing before it has fully downloaded, keeping the animation. While it converts, the dialog SHALL show its progress and keep Save busy. Closing the dialog or picking another file SHALL stop the conversion and upload nothing.

#### Scenario: GIF keeps its animation
- **WHEN** the user picks an animated GIF and saves in a browser that can convert it
- **THEN** the banner is an MP4 that plays the same animation, looping and muted on the profile

#### Scenario: Video loses its sound
- **WHEN** the user picks a 1080p MOV with an audio track
- **THEN** the uploaded banner is an MP4 at 2.4:1, at most 1920 pixels wide, with no audio track

#### Scenario: Portrait phone video
- **WHEN** the user picks a video recorded in portrait on a phone
- **THEN** the banner is cropped from the upright picture, a 2.4:1 band across its middle, not from the sideways frame stored in the file

#### Scenario: Progress while converting
- **WHEN** a 40 MB video is converting
- **THEN** the dialog shows how far the conversion has got and Save shows it is busy

#### Scenario: Closing cancels
- **WHEN** the user closes the dialog while a video is converting
- **THEN** the conversion stops and nothing is uploaded or saved

### Requirement: Moving banner fallback
Where the browser cannot convert a GIF, MP4, M4V or WebM file, and for a GIF with transparent areas, which an MP4 cannot keep, the original SHALL be uploaded as picked, as long as it is within the size limit. Where it cannot convert a QuickTime, Matroska or Ogg video, the file SHALL be refused with a message asking for an MP4, since many browsers cannot play those as they are. A file that would be refused for size SHALL be refused before any upload, with a message saying why.

#### Scenario: Browser cannot convert
- **WHEN** the user picks a 6 MB GIF in a browser that cannot convert it
- **THEN** the GIF is uploaded as picked and becomes the banner

#### Scenario: Browser cannot convert a large file
- **WHEN** the user picks a 30 MB MP4 in a browser that cannot convert it
- **THEN** a message explains the 10 MB limit and nothing is uploaded

#### Scenario: Transparent GIF
- **WHEN** the user picks a 3 MB GIF with a transparent background
- **THEN** the GIF is uploaded as picked and keeps its transparency

#### Scenario: Browser cannot convert a MOV
- **WHEN** the user picks a 6 MB MOV in a browser that cannot convert it
- **THEN** a message asks for an MP4 and nothing is uploaded

### Requirement: Banner size limit
The 10 MB limit SHALL apply to the file that is uploaded. A still SHALL be accepted at up to 25 MB as picked, and a GIF or video at up to 100 MB; each SHALL be refused before upload when the file it would upload is still over 10 MB. The server SHALL keep refusing any upload over 10 MB.

#### Scenario: Large still that compresses small enough
- **WHEN** the user picks a 15 MB PNG, crops it and saves
- **THEN** the compressed banner, under 10 MB, is uploaded and becomes the banner

#### Scenario: Still over the pick limit
- **WHEN** the user picks a 30 MB PNG
- **THEN** a message explains the limit and the crop area does not open

#### Scenario: Large video that converts small enough
- **WHEN** the user picks a 60 MB video that converts to 5 MB
- **THEN** the 5 MB MP4 is uploaded and becomes the banner

#### Scenario: Converted file still too large
- **WHEN** a picked video converts to 14 MB
- **THEN** a message says the converted banner is over 10 MB and nothing is uploaded

#### Scenario: Pick over 100 MB
- **WHEN** the user picks a 150 MB video
- **THEN** a message explains the limit and no conversion starts

### Requirement: Accepted banner types
The dialog and the server SHALL accept JPEG, PNG, WebP, BMP and GIF images and MP4, WebM, Ogg, QuickTime, Matroska and M4V videos, and SHALL refuse SVG and AVI. Banners already stored as SVG or AVI SHALL keep displaying as they do today.

#### Scenario: SVG is refused
- **WHEN** the user picks an SVG file
- **THEN** a message says the file type is not supported and nothing is uploaded

#### Scenario: AVI is refused
- **WHEN** the user picks an AVI file
- **THEN** a message says the file type is not supported and nothing is uploaded

#### Scenario: Existing SVG banner
- **WHEN** a profile whose banner was uploaded as SVG before this change is opened
- **THEN** the banner still shows

### Requirement: Existing banner backfill
Banners set before the web deploy that compresses uploads SHALL be re-encoded once: stills, SVG included, to a WebP of the 2.4:1 centre at most 2400×1000 pixels, and GIFs and videos to a silent MP4 of the 2.4:1 centre at most 1920 pixels wide. The original object SHALL be kept. A banner the user changes while the backfill runs SHALL keep the user's change. A banner the backfill already wrote SHALL never be re-encoded by a later or resumed run.

#### Scenario: Large banner is replaced
- **WHEN** the backfill reaches a profile whose banner is a 6 MB PNG
- **THEN** the profile shows a smaller WebP of the same centre region, and the PNG is still in the bucket

#### Scenario: SVG banner is rasterised
- **WHEN** the backfill reaches a profile whose banner is an SVG
- **THEN** the profile shows a WebP of it

#### Scenario: Second run
- **WHEN** the backfill runs again after replacing a profile's banner
- **THEN** it leaves the replaced banner as it is

#### Scenario: User changes the banner during the run
- **WHEN** a user saves a new banner after the backfill read their row and before it wrote
- **THEN** the profile keeps the user's new banner

### Requirement: Backfill replace rule
The backfill SHALL point a profile at the re-encoded banner only when it is within 10 MB and is either at least 10% smaller than the original or replaces an SVG, BMP, QuickTime, Matroska, Ogg or AVI original. A GIF with transparent areas and an animated WebP SHALL be left as they are.

#### Scenario: Small banner is kept
- **WHEN** the backfill reaches a JPEG banner that re-encodes to a larger file
- **THEN** the profile keeps its JPEG
