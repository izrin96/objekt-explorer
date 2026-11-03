# Spec Delta

## ADDED Requirements

### Requirement: Edit a profile bio
The profile edit dialog SHALL offer a Bio field for that Cosmo profile, holding at most 160 characters, with a counter as the limit nears. On save, the bio SHALL be stored as plain text. Leading and trailing spaces are removed, line breaks are kept, and a run of blank lines collapses to one. A bio left empty, or holding only spaces, SHALL be removed. Each linked profile SHALL keep its own bio. A save that leaves the field untouched SHALL keep the stored bio.

#### Scenario: Set a bio
- **WHEN** the owner of kaede.k types "WTT Wonder Season only\nDMs open after 6pm KST" in Bio and saves
- **THEN** the profile's bio is those two lines

#### Scenario: Clear a bio
- **WHEN** the owner deletes all the text in Bio and saves
- **THEN** the profile has no bio

#### Scenario: Over the limit
- **WHEN** the owner pastes 200 characters into Bio
- **THEN** the field holds the first 160, and a save stores no more than 160

#### Scenario: Blank lines collapse
- **WHEN** the owner saves "Hi\n\n\n\nWTT" as the bio
- **THEN** the stored bio is "Hi\n\nWTT"

#### Scenario: Banner change keeps the bio
- **WHEN** the owner saves a new banner without touching Bio
- **THEN** the bio is unchanged

#### Scenario: A stale tab keeps the newer bio
- **WHEN** the owner changes the bio in one tab, then saves only a new banner from a dialog opened earlier in another tab
- **THEN** the bio is the one saved in the first tab

#### Scenario: Invisible text is no bio
- **WHEN** the owner saves a bio holding only zero-width spaces
- **THEN** the profile has no bio

#### Scenario: Two profiles, two bios
- **WHEN** an account links kaede.k and kaede.alt and sets a bio only on kaede.k
- **THEN** kaede.alt shows no bio

### Requirement: Show a profile bio
A profile with a bio SHALL show it in the header, under the identity, to every visitor, while the profile shows its account. Line breaks SHALL show as written. The text SHALL show as plain text: markup is not rendered, a URL is not a link, and the bio is never translated. A profile whose address no account has linked SHALL show no bio. A profile with no bio SHALL show nothing in its place.

#### Scenario: Visitor sees the bio
- **WHEN** a signed-out visitor opens `/@kaede.k`, whose bio is set
- **THEN** the header shows the bio under the identity, line breaks intact

#### Scenario: URL stays text
- **WHEN** a bio holds "see https://example.com"
- **THEN** the URL shows as text and is not a link

#### Scenario: Unlinked address
- **WHEN** a visitor opens the profile of an address whose account unlinked it after setting a bio
- **THEN** the header shows no bio

#### Scenario: Markup stays text
- **WHEN** a bio holds "<b>hi</b> **bold**"
- **THEN** the header shows those characters as typed

### Requirement: A bio leaves with its account
A profile's bio SHALL be removed whenever its address leaves the account that holds it: when the owner unlinks it, when staff unlink it or move it to another account, and when the account is deleted. An account that links the address afterwards SHALL start with no bio.

#### Scenario: Unlink, then delete
- **WHEN** rin.trades sets a bio on rin.t, unlinks rin.t, deletes the account, and another account links rin.t once it may
- **THEN** rin.t shows no bio under the new account

#### Scenario: Staff move
- **WHEN** an admin moves kaede.k from kaede.k's old account to the new one
- **THEN** kaede.k has no bio until the new account sets one
