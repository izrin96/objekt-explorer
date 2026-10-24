## MODIFIED Requirements

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set when it is created or edited and shown only for want lists:
- **Swaps only**, the default for a new want list: it matches entries on have lists only;
- **Swaps or buying**: it matches entries on have lists and on sale lists;
- **Buying only**: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list is someone trading, so it SHALL be open to swaps.

Have, sale and general lists carry no choice. A have list's entry SHALL count against a want list only when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list only when that want list is open to buying (Swaps or buying, or Buying only). Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

A request to create a want list that leaves the choice out SHALL save Swaps only. An update that leaves it out SHALL keep the list's current choice. An update that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. A want list made before Swaps only became the default keeps the choice it had, Swaps or buying. No existing want list SHALL become Buying only unless its owner picks it.

The server SHALL refuse, as a pair can't be Buying only, saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, from either list's form. In the form, while a want list's form holds a link, Buying only SHALL be offered disabled with a short reason, and a have list's link menu SHALL offer a want list set to Buying only disabled with the same reason.

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
- **THEN** that collection does not count toward the partner on Browse or For you, and no want-list alert is sent for it

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

#### Scenario: A linked want list can't be Buying only
- **WHEN** the user edits want list "store hunt", linked to have list "spares"
- **THEN** Buying only is offered disabled with a reason, and a request that saves it as Buying only is refused

#### Scenario: Linking a Buying only want list from the have list
- **WHEN** the user opens have list "spares" and picks a link, and want list "bulk buys" is set to Buying only
- **THEN** "bulk buys" is offered disabled with a reason, and a request that links it is refused

#### Scenario: Picking a link while Buying only is selected
- **WHEN** the user's want list form has Buying only selected and the user picks a have list to link
- **THEN** Buying only turns disabled and the form asks for Swaps only or Swaps or buying before it saves

#### Scenario: Buying only on its own
- **WHEN** the user's want list has no link
- **THEN** all three choices are offered, and Buying only saves
