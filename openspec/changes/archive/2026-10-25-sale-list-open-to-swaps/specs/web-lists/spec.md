## ADDED Requirements

### Requirement: Sale list Open to
A sale list SHALL carry an **Open to** choice, set by its post, not by the list form: **Sell only**, the default for every new and existing sale list, or **Sell or swap**, which also matches want lists open to swaps, counting toward Can swap and alerts like a have list (see Want list match option). Prices and Market SHALL be unchanged. An update that leaves the choice out SHALL keep it. Have lists SHALL have no such choice. The header and list card SHALL name Sell or swap.

#### Scenario: Existing sale list
- **WHEN** a sale list made before this change is opened
- **THEN** it is Sell only, matches only want lists open to buying, and its header shows no Open to

#### Scenario: Sell or swap
- **WHEN** the owner posts sale list "binary sale" as a Sell post with "Also open to swaps"
- **THEN** "binary sale" is open to swaps, its header and card read "Sell or swap", and it is still on Market at its prices

#### Scenario: Have list
- **WHEN** a user opens the post composer with a have list
- **THEN** it offers no selling or Open to choice for it

### Requirement: Sale list pairs
Only a sale list open to swaps SHALL be linkable to a want list; the pair is one post (see `web-trade-browse`), and its want side SHALL be open to swaps. The server SHALL refuse linking a want list to a sale list set to Sell only, and setting a linked sale list to Sell only.

#### Scenario: Pair with a want list
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps only

#### Scenario: Link to a Sell only list
- **WHEN** a request links want list "binary hunt" to sale list "store stock", set to Sell only
- **THEN** it is refused

#### Scenario: Sell only while linked
- **WHEN** a request sets linked sale list "binary sale" to Sell only
- **THEN** it is refused

## MODIFIED Requirements

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set by the post that holds it, not by the list form:
- **Swaps only**, the default for a new want list and what a Swap post saves without "also pay": it matches entries on have lists only;
- **Swaps or buying**, what a Swap post saves with "also pay": it matches entries on have lists and on sale lists;
- **Buying only**, what a Buy post saves: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list, or to a sale list open to swaps, is someone trading, so it SHALL be open to swaps.

Have and general lists carry no choice; a sale list carries its own (see Sale list Open to). A have list's entry, and the entry of a sale list open to swaps, SHALL count against a want list when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list when that want list is open to buying (Swaps or buying, or Buying only). A sale list set to Sell only SHALL never count against a want list open to swaps only. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

The server SHALL refuse saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, whether the request comes from the post composer or from a tab loaded before this change.

A request to create a want list that leaves the choice out SHALL save Swaps only. An update that leaves it out SHALL keep the list's current choice. An update that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. A want list made before Swaps only became the default keeps the choice it had, Swaps or buying. No existing want list SHALL become Buying only unless its owner picks it.

The list page header and the list card SHALL name a want list's choice.

#### Scenario: New want list
- **WHEN** a user creates a want list
- **THEN** the form shows no Open to choice, and Swaps only is saved

#### Scenario: Trades only skips a sale list
- **WHEN** the user's want list is open to swaps only, and a partner's sale list, set to Sell only, holds a collection on it
- **THEN** that collection does not count toward the partner on Browse, and no want-list alert is sent for it

#### Scenario: Trades and sales
- **WHEN** the user ticks "also pay" on the Swap post holding the same want list
- **THEN** the list is open to swaps or buying, and the partner's sale entry counts toward them on the next load

#### Scenario: Buying only skips a have list
- **WHEN** the user's want list is in a Buy post, and a partner's have list holds a collection on it
- **THEN** that collection does not count toward the partner on Browse or For you, and no want-list alert is sent for it

#### Scenario: Buying only takes a sale list
- **WHEN** the same want list holds a collection that a partner's sale list holds
- **THEN** that collection counts as "They have N you want" for that partner, and a want-list alert is sent for it when the user has "Someone has what you want" on Any; under Can swap no alert is sent, since a sale is not a swap (see `web-notifications`)

#### Scenario: The other direction
- **WHEN** a partner's want list is open to swaps only and the user's sale list, set to Sell only, holds a collection on it
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: The other direction, buying only
- **WHEN** a partner's want list is set to Buying only, and a collection on it is on the user's bound have list and on none of the user's sale lists
- **THEN** that collection does not count as "You have N they want" for that partner

#### Scenario: Pairing does not change matching
- **WHEN** the user posts have list "spares" and want list "binary hunt", open to swaps only, as one Swap post
- **THEN** "binary hunt" matches the same have lists as before and still no sale lists, and "spares" matches the same want lists as before, those open to swaps and not those set to Buying only

#### Scenario: Older want list
- **WHEN** a user opens Edit post on the Swap post of a want list made before this default
- **THEN** "also pay" is ticked, and saving without touching it keeps Swaps or buying

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
- **WHEN** a request saves want list "store hunt", linked to have list "spares", as Buying only
- **THEN** it is refused, and in the composer picking "store hunt" for a Buy post asks to unpair it first

#### Scenario: Linking a Buying only want list from the have list
- **WHEN** a request links want list "bulk buys", set to Buying only, to have list "spares"
- **THEN** it is refused

#### Scenario: Picking a link while Buying only is selected
- **WHEN** the user picks Swap in the composer with have list "spares" and want list "bulk buys", set to Buying only
- **THEN** posting saves "bulk buys" open to swaps: Swaps only, or Swaps or buying with "also pay"

#### Scenario: Buying only on its own
- **WHEN** the user's want list has no link
- **THEN** it can be posted as a Buy post, and Buying only saves

#### Scenario: Sell or swap reaches a swaps-only want list
- **WHEN** the user's want list is open to swaps only, and a partner's sale list, open to swaps, holds a collection on it
- **THEN** that collection counts toward the partner as one they have that the user wants, counts toward Can swap, and a want-list alert is sent for it under Any or Can swap
