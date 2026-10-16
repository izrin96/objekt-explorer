# Spec Delta

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
it is created, and the badge's description SHALL say that Copy as new list makes a list of
another type or binding (see Copy as new list).

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
- **THEN** the top of the form shows a Have badge and no control to change the type, and its description names Copy as new list

## ADDED Requirements

### Requirement: Copy as new list
The owner's menu on a list card and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, Open to, columns and hide serial.

Type and profile binding SHALL be editable. The linked list SHALL start empty and Show on Trade off. Saving SHALL create a new list, open it, and leave the source unchanged. Other visitors SHALL not see the action.

#### Scenario: Owner copies a have list as a sale list
- **WHEN** the owner of have list "spares", bound to a profile and linked to want list "binary hunt", activates Copy as new list, picks Sale, enters a currency and saves
- **THEN** a sale list "spares (copy)" bound to the same profile exists with the entries of "spares", the browser shows it, and "spares" is still a have list linked to "binary hunt"

#### Scenario: Copy starts off Trade
- **WHEN** the owner copies a want list that is on Trade
- **THEN** the form opens with Show on Trade off and no linked list, and saving it as is adds no post to `/trade`

#### Scenario: Visitor
- **WHEN** a signed-in user opens the menu on someone else's list
- **THEN** no Copy as new list item is shown

### Requirement: Copied entries
A copy SHALL carry the source's entries in their order, converted to the new list's binding:
- unbound to unbound: every collection, duplicates included;
- bound to unbound: each collection once;
- to a bound list: on the same profile, the copies it still owns; otherwise every copy it owns of each collection.

On a sale to sale copy, price, quote-your-own-price and note SHALL go with an entry that carries over one to one. Otherwise they SHALL be empty.

#### Scenario: Bound to unbound
- **WHEN** the owner copies a bound have list holding serials #12 and #40 of one collection and one copy of another as a general list
- **THEN** the new list holds two entries, one per collection

#### Scenario: Unbound to bound
- **WHEN** the owner copies an unbound general list of three collections as a have list bound to a profile that owns two copies of the first collection and none of the others
- **THEN** the new list holds those two copies, and two collections are reported left out

#### Scenario: Same profile keeps owned copies
- **WHEN** the owner copies a bound sale list of five copies, one of which the profile has since sent away, as a sale list on the same profile
- **THEN** the new list holds the four owned copies with their prices and notes, and one is reported left out

#### Scenario: Type change drops prices
- **WHEN** the owner copies a sale list with priced entries as a have list
- **THEN** the new list's entries carry no price, quote-your-own-price or note

### Requirement: Copy carry-over count
While the copy form's binding or profile differs from the source, the form SHALL show how many entries will be carried over and how many left out, and update it as either changes. After saving, the success message SHALL give the same two numbers.

#### Scenario: Count before saving
- **WHEN** the owner copying an unbound list of ten collections turns on profile binding for a profile owning copies of seven of them
- **THEN** the form says seven collections carry over and three are left out, before anything is saved

#### Scenario: Count after saving
- **WHEN** that copy is saved
- **THEN** the success message says seven were carried over and three left out
