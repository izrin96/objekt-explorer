## MODIFIED Requirements

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set by the post that holds it, not by the list form:
- **Swaps only**, what a Swap post saves without "also pay": it matches entries on have lists only;
- **Swaps or buying**, the default for a new want list and what a Swap post saves with "also pay": it matches entries on have lists and on sale lists;
- **Buying only**, what a Buy post saves: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list, or to a sale list open to swaps, is someone trading, so it SHALL be open to swaps.

Have and general lists carry no choice; a sale list carries its own (see Sale list Open to). A have list's entry, and the entry of a sale list open to swaps, SHALL count against a want list when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list when that want list is open to buying (Swaps or buying, or Buying only). A sale list set to Sell only SHALL never count against a want list open to swaps only. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

The server SHALL refuse saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, whether the request comes from the post composer or from creating a list.

A request to create a want list that leaves the choice out SHALL save Swaps or buying. A save that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. An existing want list SHALL keep the choice it has when this default changes. No existing want list SHALL become Buying only unless its owner picks it.

The list page header and the list card SHALL name a want list's choice.

#### Scenario: New want list
- **WHEN** a user creates a want list
- **THEN** the form shows no Open to choice, and Swaps or buying is saved

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

#### Scenario: Choice shown on the list
- **WHEN** a user opens a want list on Trade set to Buying only
- **THEN** its header and its card on `/list` show the WTB tag beside On Trade, and no "Buying only" text

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

#### Scenario: Unposted want list matches a seller
- **WHEN** a user creates want list "hunt" with SeoYeon 204Z and does not post it, and a partner's sale list set to Sell only and on Trade holds SeoYeon 204Z
- **THEN** that collection counts toward the partner on the user's Browse and For you

#### Scenario: Posting narrows it
- **WHEN** the user then posts "hunt" in a Swap post without "also pay"
- **THEN** "hunt" is Swaps only, and the partner's Sell only entry no longer counts

### Requirement: Copy as new list
The owner's menu on a list card and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, Open to (from a want list only), columns and hide serial.

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

#### Scenario: Open to from another type
- **WHEN** the owner copies a sale list and picks Want
- **THEN** Open to starts at Swaps or buying, as Create does
