## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, an optional linked Have or Want list of the complementary type, an optional
Cosmo profile it is filed under with a flag deciding whether that profile's Lists tab shows
it, and a public flag. A want list also has an Alert me switch, on by default, deciding
whether new matches for it create notifications (see `web-notifications`). A signed-out
visitor SHALL be sent to `/login?redirect=/list`.

#### Scenario: Sale list needs a currency
- **WHEN** the user picks the sale type and leaves currency empty
- **THEN** the form refuses to submit and marks currency

#### Scenario: Profile-bound but hidden
- **WHEN** a list is filed under a profile with the show-on-profile flag off
- **THEN** its card on `/list` carries the profile chip and the profile's Lists tab does not show it

#### Scenario: Alert me on a want list
- **WHEN** the user creates a want list without touching Alert me
- **THEN** the list is saved with Alert me on, and the switch is not offered for other list types
