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
it, and, on a have, want or sale list, one Show on Trade switch (see Show on Trade). Every want
list alerts its owner to new matches, whether or not it is on Trade (see `web-notifications`).
A signed-out visitor SHALL be sent to
`/login?redirect=/list`.

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

### Requirement: Find matches shortcut
On their own want list, or their own have or sale list bound to a Cosmo profile, the owner SHALL see a Find matches control in the list header, showing the number of mutual people for that list once it is known. Activating it SHALL open `/trade/for-you?list=<slug>`. Other visitors SHALL not see the control.

#### Scenario: Owner opens matches
- **WHEN** the owner of have list "spares" activates Find matches
- **THEN** the browser is at `/trade/for-you?list=spares` with that list selected in the list filter

#### Scenario: Visitor
- **WHEN** a signed-in user opens someone else's have list
- **THEN** no Find matches control is shown

### Requirement: Show on Trade
The list form SHALL offer exactly one visibility switch on a have, want or sale list, off by default. It is labelled Show on Trade on a have or want list and Show on Market on a sale list, and it is what other specs call discoverable. With it on:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

With it off the list SHALL be in none of these, except that a want list still alerts its owner to matches (see `web-notifications`). The form SHALL offer no other switch for them, and the switch's description SHALL name everything it turns on.
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

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to `/trade`.

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

### Requirement: List type colours
Each list type SHALL have one colour, used wherever the app names that type: list badges on list pages, list cards and the account menu, and post tags and list badges on Trade.
- **Have**, and the WTT tag: teal.
- **Want**, and the WTB tag: amber.
- **Sale**, and the WTS tag: rose.
- **General**: neutral grey.

A badge SHALL show its colour as tinted text on a lightly tinted chip with a matching edge, never as a solid fill. The colours SHALL have light and dark theme values, and the text SHALL contrast at least 4.5:1 with its chip in both themes. Green SHALL be kept for verified and completed states (see `web-verified-trades`), so no list type uses it.

#### Scenario: Same type, same colour
- **WHEN** the user sees their have list "spares" on its list page, in the account menu and as a WTT post on Trade
- **THEN** its Have badge and the WTT tag are the same teal

#### Scenario: Light theme
- **WHEN** the user switches to the light theme
- **THEN** each badge keeps its type's hue, and its text still contrasts at least 4.5:1 with its chip

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set when it is created or edited and shown only for want lists, whether or not it is linked to a have list:
- **Trade only**, the default for a new want list: it matches entries on have lists only;
- **Trade or buy**: it matches entries on have lists and on sale lists.

Have, sale and general lists carry no choice. A have list's entry SHALL count against every want list. A sale list's entry SHALL count against a want list only when that want list is open to trade or buy. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- For you counts, in both directions;
- Browse match counts and Only matches;
- want-list alerts and "Someone wants what you have" alerts.

A request to create a want list that leaves the choice out SHALL save Trade only. An update that leaves it out SHALL keep the list's current choice. A want list made before Trade only became the default keeps the choice it had, Trade or buy.

#### Scenario: New want list
- **WHEN** a user creates a want list without touching Open to
- **THEN** Trade only is selected and saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is open to Trade only, and a partner's sale list holds a collection on it
- **THEN** that collection does not count toward the partner in For you or Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user switches the same want list to Trade or buy
- **THEN** the partner's sale entry counts toward them on the next load

#### Scenario: The other direction
- **WHEN** a partner's want list is open to Trade only and the user's sale list holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Pairing does not change matching
- **WHEN** the user links their have list "spares" to their want list "binary hunt", which is open to Trade only
- **THEN** "binary hunt" matches the same have lists as before and still no sale lists, and "spares" matches the same want lists as before, whether those are open to Trade only or Trade or buy

#### Scenario: Older want list
- **WHEN** a user opens the edit dialog of a want list made before this default
- **THEN** Trade or buy is selected, and saving without touching it keeps it

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Open to choice
