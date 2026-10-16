## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, an optional linked Have or Want list of the complementary type, an optional
Cosmo profile it is filed under with a flag deciding whether that profile's Lists tab shows
it, and, on a have, want or sale list, one Show on Trade switch (see Show on Trade). Every want
list alerts its owner to new matches, whether or not it is on Trade (see `web-notifications`).
A signed-out visitor SHALL be sent to
`/login?redirect=/list`.

List type SHALL be the first field of the create form, above Name. It SHALL be a segmented
control showing all four types at once, one selected, operable by keyboard as one radio
group, with the chosen type's description under it. Changing the type SHALL show or hide the
fields that depend on it (currency, linked list, profile binding, Show on Trade, Open to)
without clearing what the user already typed in Name or Description. The edit form SHALL show
the list's type at the top as a read-only type badge, since a list's type cannot change after
it is created.

#### Scenario: Sale list needs a currency
- **WHEN** the user picks the sale type and leaves currency empty
- **THEN** the form refuses to submit and marks currency

#### Scenario: Profile-bound but hidden
- **WHEN** a list is filed under a profile with the show-on-profile flag off
- **THEN** its card on `/list` carries the profile chip and the profile's Lists tab does not show it

#### Scenario: Type comes first
- **WHEN** a user opens the create list dialog
- **THEN** the first field is List type, showing General, Have, Want and Sale side by side with General selected and its description under it, and Name follows it

#### Scenario: Switching type keeps the name
- **WHEN** the user types a name, then picks Want
- **THEN** the name stays, and the Open to choice appears

#### Scenario: Type on edit
- **WHEN** a user opens the edit dialog of a have list
- **THEN** the top of the form shows a Have badge and no control to change the type

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set when it is created or edited and shown only for want lists, whether or not it is linked to a have list:
- **Swaps only**, the default for a new want list: it matches entries on have lists only;
- **Swaps or buying**: it matches entries on have lists and on sale lists;
- **Buying only**: it matches entries on sale lists only.

Have, sale and general lists carry no choice. A have list's entry SHALL count against a want list only when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list only when that want list is open to buying (Swaps or buying, or Buying only). Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Browse match counts, in both directions, and the person sheet;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

A request to create a want list that leaves the choice out SHALL save Swaps only. An update that leaves it out SHALL keep the list's current choice. An update that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. A want list made before Swaps only became the default keeps the choice it had, Swaps or buying. No existing want list SHALL become Buying only unless its owner picks it.

The list page header and the list card SHALL name a want list's choice.

#### Scenario: New want list
- **WHEN** a user creates a want list without touching Open to
- **THEN** Swaps only is selected and saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is open to swaps only, and a partner's sale list holds a collection on it
- **THEN** that collection does not count toward the partner on Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user switches the same want list to Swaps or buying
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: Buying only skips a have list
- **WHEN** the user's want list is set to Buying only, and a partner's have list holds a collection on it
- **THEN** that collection does not count toward the partner on Browse or in the person sheet, and no want-list alert is sent for it

#### Scenario: Buying only takes a sale list
- **WHEN** the same want list holds a collection that a partner's sale list holds
- **THEN** that collection counts as "They have N you want" for that partner, and a want-list alert is sent for it

#### Scenario: The other direction
- **WHEN** a partner's want list is open to swaps only and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: The other direction, buying only
- **WHEN** a partner's want list is set to Buying only, and a collection on it is on the user's bound have list and on none of the user's sale lists
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Pairing does not change matching
- **WHEN** the user links their have list "spares" to their want list "binary hunt", which is open to swaps only
- **THEN** "binary hunt" matches the same have lists as before and still no sale lists, and "spares" matches the same want lists as before, those open to swaps only or Swaps or buying and not those set to Buying only

#### Scenario: Older want list
- **WHEN** a user opens the edit dialog of a want list made before this default
- **THEN** Swaps or buying is selected, and saving without touching it keeps it

#### Scenario: Turning buying off
- **WHEN** a tab opened before Buying only existed saves a Buying only want list with Swaps only picked
- **THEN** the list is saved as Swaps only

#### Scenario: Choice shown on the list
- **WHEN** a user opens a want list set to Buying only
- **THEN** its header and its card on `/list` read "Buying only"

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Open to choice
