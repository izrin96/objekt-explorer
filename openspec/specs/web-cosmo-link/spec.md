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
- **cooling down**: in the 7 days after the address left another account, by an unlink, a staff unlink or that account's deletion. The message SHALL name the date linking opens. The account the address left SHALL be able to link it again at once.

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
The edit dialog SHALL load the profile's current settings and let the user toggle hide
nickname, private serial, hide transfers and private profile, choose a grid
column count between 2 and 18 or unset, and set, replace or remove a banner. Images SHALL
be cropped to the banner ratio before upload; videos and GIFs SHALL upload as-is; files
over the size limit or of an unsupported type SHALL be refused before upload. Saving SHALL
persist through the server.

#### Scenario: Banner upload
- **WHEN** the user picks a JPEG, crops it and saves
- **THEN** the profile's banner URL points at the uploaded object and the dialog closes

#### Scenario: Oversized file
- **WHEN** the user picks a file larger than the limit
- **THEN** a message explains the limit and nothing is uploaded

### Requirement: Hide Cosmo ID
A profile's Hide Cosmo ID setting SHALL hide its Cosmo nickname in Activity, Activity History, Serial Lookup, Holders, list pages and the profile itself (its page and its hover card, wherever the card opens), showing the address instead. Everywhere else, including Trade (Browse, For you, Find trade partners, hidden partners), want alerts, Market and Messages, the profile SHALL be named by its nickname whatever the setting, the same as a profile without it. The setting's description SHALL name where it applies.

#### Scenario: Hidden on the profile, shown on Trade
- **WHEN** rinrin turns on Hide Cosmo ID and posts a list bound to that profile
- **THEN** rinrin's profile header and Activity rows show the address, and the Trade post is headed "rinrin"

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
An account's default profile SHALL name it wherever another account sees it as a person: conversation rows and threads, offers and trades, offer notes, notifications and blocked lists. It SHALL be the profile the user made default, else the first profile the account linked, shown by its nickname or, with none, its shortened address; Hide Cosmo ID does not apply. With no linked profile the display name SHALL be used.

#### Scenario: Make another profile default
- **WHEN** a user with profiles "rin.main" (linked first) and "rin.alt" opens `/account/profiles` and activates Make default in the "rin.alt" card's menu
- **THEN** it saves at once, the Default badge moves to "rin.alt", and their partners' conversation rows and threads head them as "rin.alt" on next load

#### Scenario: One profile
- **WHEN** a user with one linked profile opens `/account/profiles`
- **THEN** no Default badge and no Make default action are shown, and partners see them by that profile

#### Scenario: Default unlinked
- **WHEN** the user unlinks the profile they made default
- **THEN** partners see them by their first linked remaining profile, which now carries the Default badge

#### Scenario: Hide Cosmo ID
- **WHEN** the default profile has Hide Cosmo ID on
- **THEN** partners still see that profile's nickname

#### Scenario: Someone else's address
- **WHEN** a request makes default an address linked to another account
- **THEN** it is refused and the default is unchanged

#### Scenario: Past conversations
- **WHEN** the user changes their default profile
- **THEN** every conversation, past ones included, heads them by the new profile on the other side's next load

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
