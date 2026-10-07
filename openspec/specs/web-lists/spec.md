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

### Requirement: Find matches shortcut
On their own have or want list, the owner SHALL see a Find matches control in the list header, showing the number of mutual people for that list once it is known. Activating it SHALL open `/trade/for-you?list=<slug>`. Other visitors SHALL not see the control.

#### Scenario: Owner opens matches
- **WHEN** the owner of have list "spares" activates Find matches
- **THEN** the browser is at `/trade/for-you?list=spares` with that list selected in the list filter

#### Scenario: Visitor
- **WHEN** a signed-in user opens someone else's have list
- **THEN** no Find matches control is shown

### Requirement: Show on Trade
The list form SHALL offer a Show on Trade switch on have, want and sale lists, off by default and off for every list that existed before it. Show on Trade puts the list on the `/trade` feed (see `web-trade-browse`).
- A list on Trade SHALL always be discoverable: turning Show on Trade on SHALL turn discoverable on, and turning discoverable off SHALL turn Show on Trade off.
- For a sale list, discoverable is Show on Market, so a sale list on Trade is also on Market.
- Where discoverable cannot be on (a have or sale list not filed under a Cosmo profile), Show on Trade SHALL be disabled and say why.
- Turning Show on Trade on SHALL count as a bump, unless the list's post was bumped in the last 24 hours, in which case it keeps that bump time.
- Saving a list SHALL never turn its linked list's discoverable or Show on Trade off.
- A request that omits Show on Trade SHALL leave it unchanged.

#### Scenario: Turn on from the form
- **WHEN** the owner edits a non-discoverable want list and turns Show on Trade on
- **THEN** the saved list is discoverable and on Trade

#### Scenario: Discoverable off takes it off Trade
- **WHEN** the owner turns discoverable off on a list that is on Trade
- **THEN** the saved list is neither discoverable nor on Trade

#### Scenario: Editing one half of a pair
- **WHEN** want list "binary hunt" is on Trade and linked to have list "spares", which is not filed under a Cosmo profile, and the owner edits only the description of "spares"
- **THEN** "binary hunt" stays discoverable and on Trade

#### Scenario: Older client
- **WHEN** a tab loaded before this change saves a list without the Show on Trade field
- **THEN** the save succeeds and the list's Show on Trade is unchanged

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to `/trade`.

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge
