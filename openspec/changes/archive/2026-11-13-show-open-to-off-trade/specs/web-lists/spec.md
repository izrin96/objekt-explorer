# Spec Delta

## ADDED Requirements

### Requirement: Open to on a want list off Trade
A want list that is not on Trade SHALL name its Open to (Swaps only, Swaps or buying, or Buying only) to its owner, as a neutral badge in its list header and on its row on `/list` and on its own profile's Lists tab, since it still decides the owner's matches and want-list alerts. Screen readers SHALL read it as "Open to" followed by the choice. No one else SHALL see it. A want list on Trade, and every other list, SHALL show no such badge. Its form changes it (see Open to in the list form).

#### Scenario: Owner's header
- **WHEN** the owner opens want list "bulk buys", set to Buying only and not on Trade
- **THEN** its header shows the Want badge and Buying only, and no On Trade badge or tag

#### Scenario: Owner's row
- **WHEN** the owner opens `/list` with want list "bulk buys", set to Buying only and not on Trade
- **THEN** its row shows Buying only beside the objekt count

#### Scenario: Never posted
- **WHEN** the owner opens a want list that has never been on Trade
- **THEN** its header and its row show Swaps or buying

#### Scenario: Visitor
- **WHEN** a signed-out visitor opens "bulk buys", or its owner's profile Lists tab
- **THEN** neither its header nor its row names its Open to

#### Scenario: Posted
- **WHEN** the owner puts "bulk buys" on Trade as a Buy post
- **THEN** its header and its row show On Trade and WTB, and no Buying only

### Requirement: Open to in the list form
The form of a want list that is not on Trade, and the form creating a want list, SHALL offer its Open to as one choice of Swaps only, Swaps or buying and Buying only, each saying what it matches; a new want list starts at Swaps or buying. A want list linked to a have or sale list SHALL NOT be offered Buying only. A want list on Trade, and a form opened from the post composer, SHALL show no choice: the post sets it.

#### Scenario: Change it off Trade
- **WHEN** the owner edits want list "bulk buys", off Trade and set to Swaps or buying, picks Buying only and saves
- **THEN** its header and its row show Buying only, it stays off Trade, and on the next load a have list's entry no longer counts against it in For you, Can swap or want-list alerts

#### Scenario: Create with a choice
- **WHEN** the user creates want list "hunt" and picks Swaps only
- **THEN** "hunt" is saved off Trade and open to swaps only, and its header and its row show Swaps only

#### Scenario: Copy keeps and changes it
- **WHEN** the owner copies want list "bulk buys", set to Buying only, from its row
- **THEN** the form starts at Buying only, and the copy saves the choice the form holds

#### Scenario: On Trade
- **WHEN** the owner edits want list "binary hunt", which is on Trade
- **THEN** the form shows no Open to choice, and saving keeps the Open to its post set

#### Scenario: Paired off Trade
- **WHEN** the owner edits want list "binary hunt", paired with have list "spares" and off Trade
- **THEN** Buying only is disabled and says a paired want list takes swaps, and a request that saves it as Buying only is refused

#### Scenario: Unsaved choice
- **WHEN** the owner changes the choice and has not saved
- **THEN** the Trade line asks to save first and Post it is disabled

#### Scenario: Posted while the form was open
- **WHEN** the owner opens the form of off-Trade want list "bulk buys", posts it from another tab, then saves the form with another choice
- **THEN** the save keeps the post's Open to and saves the form's other fields

#### Scenario: From the composer
- **WHEN** the owner opens Edit list, New want list… or Copy a list… in the post composer
- **THEN** the form shows no Open to choice

#### Scenario: Old tab
- **WHEN** a tab opened before this rule saves want list "bulk buys"
- **THEN** "bulk buys" keeps its Open to

## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, and an optional Cosmo profile it is filed under with a flag deciding whether that
profile's Lists tab shows it. A have, want or sale list's link and place on Trade, and a sale
list's Open to, are set in the post composer (see `web-trade-browse`), and its edit form shows
the Trade line instead (see Trade line in the list form); a want list's Open to is set there
while the list is on Trade, and in its form while it is off (see Open to in the list form).
Every want list alerts its owner to new matches, whether or
not it is on Trade (see `web-notifications`). A signed-out visitor SHALL be sent to
`/login?redirect=/list`.

List type SHALL be the first field of the create form, above Name. It SHALL be a segmented
control showing all four types at once, one selected, operable by keyboard as one radio
group, with the chosen type's description under it. Changing the type SHALL show or hide the
fields that depend on it (currency, profile binding) without clearing what the user already
typed in Name or Description. The edit form SHALL show the list's type at the top as a
read-only type badge, since a list's type cannot change after it is created, and the badge's
description SHALL say that Copy as new list makes a list of another type or binding (see Copy
as new list).

#### Scenario: Sale list needs a currency
- **WHEN** the user picks the sale type and leaves currency empty
- **THEN** the form refuses to submit and marks currency

#### Scenario: Profile-bound but hidden
- **WHEN** a list is filed under a profile with the show-on-profile flag off
- **THEN** its row on `/list` carries the profile chip and the profile's Lists tab does not show it

#### Scenario: Type comes first
- **WHEN** a user opens the create list dialog
- **THEN** the first field is List type, showing General, Have, Want and Sale side by side with General selected and its description under it, and Name follows it

#### Scenario: Switching type keeps the name
- **WHEN** the user types a name, then picks Want
- **THEN** the name stays, and the form shows the Open to choice at Swaps or buying, and no linked list or Trade switch

#### Scenario: Sale form has no Trade switch
- **WHEN** the user picks the sale type in the create form
- **THEN** the form shows currency and profile binding, and no Show on Market and Trade switch

#### Scenario: Type on edit
- **WHEN** a user opens the edit dialog of a have list
- **THEN** the top of the form shows a Have badge and no control to change the type, and its description names Copy as new list

### Requirement: Show on Trade
A have, want or sale list SHALL be on Trade or not, off by default; it is what other specs call discoverable. Every one of them SHALL be put on and taken off Trade only through the post composer (see `web-trade-browse`); no list form offers a switch for it. With a list on Trade:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

Off Trade the list SHALL be in none of these, except that a want list still alerts its owner to matches (see `web-notifications`).
- A have or sale list not filed under a Cosmo profile cannot be on Trade; its Trade line SHALL say why.
- Putting a list on Trade SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case it takes that bump's time (see `web-trade-browse` Bump).
- Saving a list from its form SHALL change neither its link, nor a sale list's Open to, nor a want list's Open to while the list is on Trade, nor whether the list is on Trade; those are the post's, set through the post composer. A want list off Trade takes its Open to from its form (see Open to in the list form). A save that still carries a sale list's Trade state, from a tab opened before this rule, SHALL keep the list's current state.

#### Scenario: Turn on from the form
- **WHEN** the owner edits a want list that is off Trade, activates Post it on its Trade line and posts it as a Buy post
- **THEN** the saved list is on Trade, appears on `/trade`, and For you matches it

#### Scenario: Discoverable off takes it off Trade
- **WHEN** the owner takes the post holding want list "binary hunt" off Trade
- **THEN** the list leaves `/trade` and For you no longer matches it

#### Scenario: Unbound have list
- **WHEN** the owner opens a have list that is not filed under a Cosmo profile
- **THEN** its Trade line says it can't go on Trade and why, and the composer shows it disabled

#### Scenario: Sale list
- **WHEN** the owner edits sale list "binary sale", bound to a Cosmo profile and off Trade, activates Post it on its Trade line and posts it as a Sell post
- **THEN** its objekts appear on Market, the list appears on `/trade` as a WTS post, and For you matches it as a have list

#### Scenario: Unbound sale list
- **WHEN** the owner opens a sale list that is not filed under a Cosmo profile
- **THEN** its Trade line says it can't go on Trade and why, with no Post it

#### Scenario: Editing one half of a pair
- **WHEN** want list "binary hunt" is on Trade and linked to have list "spares", which is off Trade, and the owner edits only the description of "binary hunt"
- **THEN** "spares" stays off Trade, the two stay linked, and "binary hunt" keeps its Open to

#### Scenario: Saving a sale list keeps its post
- **WHEN** sale list "binary sale" is in a Sell post with want list "binary hunt", and the owner edits only its name
- **THEN** both lists stay on Trade, still one post, and "binary sale" stays on Market and Sell or swap

#### Scenario: Save from an old tab
- **WHEN** a tab opened before this rule saves sale list "binary sale", which is on Trade, with its switch off
- **THEN** "binary sale" stays on Trade and on Market

### Requirement: Want list match option
A want list SHALL carry an **Open to** choice, set by the post that holds it while the list is on Trade, and by its list form while it is off Trade (see Open to in the list form):
- **Swaps only**, what a Swap post saves without "also pay": it matches entries on have lists only;
- **Swaps or buying**, the default for a new want list and what a Swap post saves with "also pay": it matches entries on have lists and on sale lists;
- **Buying only**, what a Buy post saves: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list, or to a sale list open to swaps, is someone trading, so it SHALL be open to swaps.

Have and general lists carry no choice; a sale list carries its own (see Sale list Open to). A have list's entry, and the entry of a sale list open to swaps, SHALL count against a want list when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list when that want list is open to buying (Swaps or buying, or Buying only). A sale list set to Sell only SHALL never count against a want list open to swaps only. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

The server SHALL refuse saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, whether the request comes from the post composer, from creating a list or from editing one.

A request to create a want list that leaves the choice out SHALL save Swaps or buying. A save that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. An existing want list SHALL keep the choice it has when this default changes. No existing want list SHALL become Buying only unless its owner picks it.

The list page header and the list's row SHALL name a want list's choice.

#### Scenario: New want list
- **WHEN** a user creates a want list
- **THEN** the form offers Open to at Swaps or buying, and creating it untouched saves Swaps or buying

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
- **THEN** its header and its row on `/list` show the WTB tag beside On Trade, and no "Buying only" text

#### Scenario: Not a want list
- **WHEN** a user creates a have list
- **THEN** the form shows no Open to choice

#### Scenario: A linked want list can't be Buying only
- **WHEN** a request saves want list "store hunt", linked to have list "spares", as Buying only
- **THEN** it is refused, in the composer picking "store hunt" for a Buy post asks to unpair it first, and while "store hunt" is off Trade its form shows Buying only disabled with why

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

### Requirement: List rows
Lists SHALL show as rows on `/list` and on a profile's Lists tab. A row SHALL show the list's latest artworks (five slots on wider screens, dashed where the list has fewer; up to three overlapping on a phone), its name linking to the list, and one line with the objekt count, the Bound badge, On Trade with its post's tags, to its owner a want list's Open to while it is off Trade (see Open to on a want list off Trade), a sale list's currency, and chips for the linked list and the Cosmo profile; the profile chip SHALL be left out on that profile's own tab. A row's menu SHALL offer Copy link to everyone, and Edit, Copy as new list and Delete to the owner.

`/list` SHALL group the rows into Want, Have, Sale and General sections in that order, each headed by its type in the type's colour and its number of lists, and leave out a type with no list.

A profile's Lists tab SHALL show two columns side by side on wider screens, stacked on a phone: Has, holding its have and sale lists, with a Sale badge on each sale list, and Wants, holding its want lists. Its general lists SHALL follow under Other lists. A column with no list SHALL say so in its place; a profile with no have, sale or want list SHALL show neither column.

#### Scenario: Own lists by type
- **WHEN** a user with two want lists and one sale list opens `/list`
- **THEN** the page shows a Want section of two rows, then a Sale section of one, and no Have or General section

#### Scenario: A visitor reads a profile
- **WHEN** a visitor opens the Lists tab of a profile with have list "spares", sale list "binary sale" and want list "binary hunt"
- **THEN** Has lists "spares" and "binary sale", the second with a Sale badge, Wants lists "binary hunt", and no row carries the profile chip

#### Scenario: Only general lists
- **WHEN** a visitor opens the Lists tab of a profile whose only list is a general list
- **THEN** the tab shows that list under Other lists and no Has or Wants column

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to the page of the post the list is in (see `web-trade-person-pages` Post page), reached through the list's Cosmo profile, or its linked list's when the list has none; a list with neither SHALL link to `/trade`. The On Trade badge on the list's row SHALL link the same way. Neither link SHALL load the post page ahead of a click. After it, the header and the list's row on `/list` SHALL show the tags of the post the list is in, as Trade tags it (see `web-trade-browse`): its linked list joins the post when that list is on Trade too. A list off Trade SHALL show no tags. A list on Trade SHALL NOT name its Open to in words, since its tags say it; a want list off Trade names it to its owner only (see Open to on a want list off Trade).

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

#### Scenario: Either half of a Swap pair
- **WHEN** have list "spares" and want list "binary hunt", open to swaps or buying, are on Trade as one Swap post
- **THEN** both headers show On Trade, WTT and WTB

#### Scenario: Off Trade
- **WHEN** a want list set to Buying only is not on Trade
- **THEN** its header and its row on `/list` show no tag, and only its owner sees Buying only

#### Scenario: Badge opens the post
- **WHEN** a visitor activates On Trade on have list "spares", bound to rin.trades's profile and in a Swap post with "binary hunt"
- **THEN** rin.trades's post page for "spares" opens, under rin.trades's handle

#### Scenario: Want half of a pair
- **WHEN** a visitor activates On Trade on want list "binary hunt", which has no profile and is linked to "spares"
- **THEN** the same post page opens, at the anchor's slug

#### Scenario: A want list with no profile
- **WHEN** a want list with no profile and no linked list is on Trade
- **THEN** its On Trade badge links to `/trade`

#### Scenario: Idle post
- **WHEN** a list is on Trade but its post is idle, and a visitor activates its On Trade badge
- **THEN** the post page opens and says the post is no longer on Trade
