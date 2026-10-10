## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, an optional linked Have or Want list of the complementary type, an optional
Cosmo profile it is filed under with a flag deciding whether that profile's Lists tab shows
it, and, on a have, want or sale list, one Show on Trade switch (see Show on Trade). A want
list also has an Alert me switch, on by default, deciding whether new matches for it create
notifications (see `web-notifications`). A signed-out visitor SHALL be sent to
`/login?redirect=/list`.

#### Scenario: Sale list needs a currency
- **WHEN** the user picks the sale type and leaves currency empty
- **THEN** the form refuses to submit and marks currency

#### Scenario: Profile-bound but hidden
- **WHEN** a list is filed under a profile with the show-on-profile flag off
- **THEN** its card on `/list` carries the profile chip and the profile's Lists tab does not show it

#### Scenario: Alert me on a want list
- **WHEN** the user creates a want list without touching Alert me
- **THEN** the list is saved with Alert me on, and the switch is not offered for other list types

### Requirement: Show on Trade
The list form SHALL offer exactly one visibility switch on a have, want or sale list, off by default. It is labelled Show on Trade on a have or want list and Show on Market on a sale list, and it is what other specs call discoverable. With it on:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

With it off the list SHALL be in none of these. The form SHALL offer no other switch for them, and the switch's description SHALL name everything it turns on.
- Where the switch cannot be on (a have or sale list not filed under a Cosmo profile), it SHALL be disabled and say why.
- Turning the switch on SHALL count as a bump, unless the list's post was bumped in the last 24 hours, in which case it keeps that bump time.
- Linking a have list and a want list SHALL turn the switch on for the newly linked list when the saved list's switch is on and the linked list can have it on. Saving a list whose link does not change SHALL leave its linked list's switch as it is, and saving a list SHALL never turn its linked list's switch off.

#### Scenario: Turn on from the form
- **WHEN** the owner edits a want list with the switch off and turns Show on Trade on
- **THEN** the saved list is on Trade, appears on `/trade`, and For you matches it

#### Scenario: Discoverable off takes it off Trade
- **WHEN** the owner turns Show on Trade off on a want list that is on Trade
- **THEN** the list leaves `/trade` and For you no longer matches it

#### Scenario: Sale list
- **WHEN** the owner turns Show on Market on for a sale list bound to a Cosmo profile
- **THEN** its objekts appear on Market, the list appears on `/trade` as a WTS post, and For you matches it as a have list

#### Scenario: Unbound have list
- **WHEN** the owner opens a have list that is not filed under a Cosmo profile
- **THEN** Show on Trade is off and disabled with the reason shown

#### Scenario: Linking turns the partner on
- **WHEN** the owner links want list "binary hunt", which has the switch on, to have list "spares", which is bound to a Cosmo profile and has the switch off
- **THEN** both lists are saved with the switch on and "spares" appears on `/trade` paired with "binary hunt"

#### Scenario: Editing one half of a pair
- **WHEN** want list "binary hunt" has the switch on, is linked to have list "spares", whose owner turned its switch off, and the owner edits only the description of "binary hunt"
- **THEN** "spares" stays off Trade

#### Scenario: Older client
- **WHEN** a tab loaded before this change saves a want list with discoverable on
- **THEN** the save succeeds and the list is saved with the switch on, so it is on Trade
