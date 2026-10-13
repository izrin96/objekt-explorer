## MODIFIED Requirements

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

## ADDED Requirements

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
