# web-lists Specification

## Purpose
Lists on `apps/web`: collections of objekts a signed-in user curates, trades from and
shares, including sale lists with prices.

## Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, an optional linked Have or Want list of the complementary type, an optional
Cosmo profile it is filed under with a flag deciding whether that profile's Lists tab shows
it, and a public flag. A signed-out visitor SHALL be sent to `/login?redirect=/list`.

#### Scenario: Sale list needs a currency
- **WHEN** the user picks the sale type and leaves currency empty
- **THEN** the form refuses to submit and marks currency

#### Scenario: Profile-bound but hidden
- **WHEN** a list is filed under a profile with the show-on-profile flag off
- **THEN** its card on `/list` carries the profile chip and the profile's Lists tab does not show it

### Requirement: List addresses
`/list/<slug>` SHALL open a list that is not filed under a profile, and SHALL redirect to
`/@<nickname>/list/<profile-slug>` when it is. An unknown slug SHALL show the not-found surface.

#### Scenario: Redirect
- **WHEN** a profile-bound list is opened by its plain slug
- **THEN** the URL becomes the profile-scoped address and the list renders

### Requirement: Entries
From the objekt grid a signed-in user SHALL add one or many objekts to a list through a
card menu item and a selection-bar action; duplicates SHALL be skipped and the count of
skipped ones reported. On their own list the owner SHALL remove entries and, on a sale list,
set a price, mark quote-your-own-price or clear the price on one or many entries at once.
The list view SHALL honour the list's configured column count.

#### Scenario: Skipped duplicates
- **WHEN** the user adds three objekts of which one is already in the list
- **THEN** two are added and the message says one was skipped

### Requirement: Share, export and Discord format
The list header SHALL copy the list's share link, download the list as CSV, and open the
Discord format dialog which produces formatted text grouped by member or season in default
or compact style, copyable to the clipboard. The same dialog SHALL be reachable from the
profile header and the account menu for the user's Have and Want lists.

#### Scenario: Export
- **WHEN** the owner activates Export
- **THEN** a CSV file named after the list downloads with one row per entry
