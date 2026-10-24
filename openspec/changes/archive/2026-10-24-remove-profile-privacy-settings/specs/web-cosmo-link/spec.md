# Spec Delta

## MODIFIED Requirements

### Requirement: Edit profile
The edit dialog SHALL load the profile's current settings and offer no privacy toggles (hiding the Cosmo ID, serials, activity history or the whole profile is no longer possible), let the user choose a grid
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

#### Scenario: No privacy toggles
- **WHEN** the user opens the edit dialog of a profile that had Private Profile on before this change
- **THEN** the dialog shows the banner and grid settings only, and saving changes nothing else

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

## ADDED Requirements

### Requirement: Removed privacy settings notice
`/account/profiles` SHALL show a dismissible notice at the top saying the privacy settings (Hide Cosmo ID, Hide from Serial Lookup, Hide Activity History, Private Profile) were removed, because Trade needs holdings, serials and transfers visible and they are public on the blockchain anyway. Every signed-in viewer of the page SHALL see it until they dismiss it in that browser.

#### Scenario: First visit after the change
- **WHEN** a signed-in user opens `/account/profiles`
- **THEN** the notice shows above their linked profiles

#### Scenario: Dismissed
- **WHEN** the user dismisses the notice and opens the page again in the same browser
- **THEN** the notice does not show

## REMOVED Requirements

### Requirement: Hide Cosmo ID
**Reason**: The setting is removed; a profile is always named by its Cosmo nickname.
**Migration**: Activity, Activity History, Serial Lookup, Holders, list pages and the profile itself show the nickname (else the shortened address) for profiles that had the setting on.
