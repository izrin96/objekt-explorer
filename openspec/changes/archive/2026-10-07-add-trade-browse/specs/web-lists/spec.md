## ADDED Requirements

### Requirement: Show on Trade
The list form SHALL offer a Show on Trade switch on have, want and sale lists, off by default and off for every list that existed before it. Show on Trade puts the list on the `/trade` feed (see `web-trade-browse`).
- A list on Trade SHALL always be discoverable: turning Show on Trade on SHALL turn discoverable on, and turning discoverable off SHALL turn Show on Trade off.
- For a sale list, discoverable is Show on Marketplace, so a sale list on Trade is also on the Marketplace.
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
