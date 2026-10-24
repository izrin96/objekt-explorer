# Spec Delta

## ADDED Requirements

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

