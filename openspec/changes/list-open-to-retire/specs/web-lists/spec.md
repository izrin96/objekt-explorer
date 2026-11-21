## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, and an optional Cosmo profile it is filed under with a flag deciding whether that
profile's Lists tab shows it. A have, want or sale list's link and place on Trade are set in
the post composer (see `web-trade-browse`), and its edit form shows the Trade line instead
(see Trade line in the list form); a want list's Open to, and a sale list's, are set only
there (see Want list match option and Sale list Open to), and no list form offers them.
Every want list alerts its owner to new matches, whether or not it is on Trade (see
`web-notifications`). A signed-out visitor SHALL be sent to `/login?redirect=/list`.

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
- **THEN** the name stays, and the form shows no Open to choice, no linked list and no Trade switch

#### Scenario: Sale form has no Trade switch
- **WHEN** the user with a linked Cosmo profile picks the sale type in the create form
- **THEN** the form shows currency and profile binding, and no Open to choice and no Show on Market and Trade switch

#### Scenario: Type on edit
- **WHEN** a user opens the edit dialog of a have list
- **THEN** the top of the form shows a Have badge and no control to change the type, and its description names Copy as new list

### Requirement: Show on Trade
A have, want or sale list SHALL be on Trade or not, off by default; it is what other specs call discoverable. Every one of them SHALL be put on and taken off Trade only through the post composer (see `web-trade-browse`); no list form offers a switch for it. With a list on Trade:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

Off Trade the list SHALL be in none of these for anyone else. Its owner's own matches and alerts still read it: every want list, and a have or sale list while it is bound to a Cosmo profile (see `web-trade-for-you` Account-wide matches and `web-notifications`).
- A have or sale list not filed under a Cosmo profile cannot be on Trade; its Trade line SHALL say why.
- Putting a list on Trade SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case it takes that bump's time (see `web-trade-browse` Bump).
- Saving a list from its form SHALL change neither its link, nor a want or sale list's Open to, nor whether the list is on Trade; those are the post's, set through the post composer. A save that still carries an Open to or a sale list's Trade state, from a tab opened before this rule, SHALL keep the list's current state and save its other fields.

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

#### Scenario: Open to from an old tab
- **WHEN** a tab opened before this rule saves off-Trade want list "bulk buys" with Buying only picked, and a new description
- **THEN** the description saves, and "bulk buys" matches as it did before the save

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to the page of the post the list is in (see `web-trade-person-pages` Post page), reached through the list's Cosmo profile, or its linked list's when the list has none; a list with neither SHALL link to `/trade`. The On Trade badge on the list's row SHALL link the same way. Neither link SHALL load the post page ahead of a click. After it, the header and the list's row on `/list` SHALL show the tags of the post the list is in, as Trade tags it (see `web-trade-browse`): its linked list joins the post when that list is on Trade too. A list off Trade SHALL show no tags. No list SHALL name its Open to in words, to its owner or anyone else: on Trade its tags say it, and off Trade it has no post to show.

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

#### Scenario: Either half of a Swap pair
- **WHEN** have list "spares" and want list "binary hunt", open to swaps or buying, are on Trade as one Swap post
- **THEN** both headers show On Trade, WTT and WTB

#### Scenario: Off Trade
- **WHEN** the owner takes the Buy post of want list "bulk buys" off Trade
- **THEN** its header and its row on `/list` show no tag and no Open to, for its owner too

#### Scenario: Sale list off Trade
- **WHEN** the owner takes the Sell post of bound sale list "binary sale", Sell or swap, off Trade
- **THEN** its header and its row on `/list` show no tag and no Open to, for its owner too

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

### Requirement: Want list match option
A want list SHALL be **Open to** one choice, set only by the post that holds it, through the post composer (see `web-trade-browse`):
- **Swaps only**, what a Swap post saves without "also pay": it matches entries on have lists only;
- **Swaps or buying**, the default and what a Swap post saves with "also pay": it matches entries on have lists and on sale lists;
- **Buying only**, what a Buy post saves: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list, or to a sale list open to swaps, is someone trading, so it SHALL be open to swaps.

A want list SHALL match with what its posts on Trade are open to; with all its posts off Trade, with what they were set to; and in no post, as Swaps or buying. Have and general lists carry no choice; a sale list carries its own (see Sale list Open to). A have list's entry, and the entry of a sale list open to swaps, SHALL count against a want list when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list when that want list is open to buying (Swaps or buying, or Buying only). A sale list set to Sell only SHALL never count against a want list open to swaps only. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

The server SHALL refuse saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, whether the request comes from the post composer or from creating a list.

Creating or editing a want list SHALL take no choice. A request from a tab opened before this rule that still sends one SHALL save without it. A want list in a post when this rule came SHALL keep the choice it had. No want list SHALL become Buying only unless its owner posts it so.

A want list's choice SHALL show only through its post's tags while it is on Trade (see On Trade mark in the list header).

#### Scenario: New want list
- **WHEN** a user creates a want list
- **THEN** the form offers no Open to choice, and the list matches as Swaps or buying until a post sets it

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

#### Scenario: Taken off Trade keeps the post's choice
- **WHEN** the user takes the Buy post of that want list off Trade
- **THEN** the list still matches as Buying only in the user's For you and want-list alerts

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
The owner's menu on a list row and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, columns and hide serial.

The copy SHALL carry no Open to: like any new list, it matches with the defaults until a post sets it. Type and profile binding SHALL be editable. The linked list SHALL start empty and the copy SHALL start off Trade. Saving SHALL create a new list, open it, and leave the source unchanged. A copy made from the post composer SHALL be picked there and not opened, its type fixed to the composer side's (see `web-trade-browse` Composer copy form). Other visitors SHALL not see the action.

#### Scenario: Owner copies a have list as a sale list
- **WHEN** the owner of have list "spares", bound to a profile and linked to want list "binary hunt", activates Copy as new list, picks Sale, enters a currency and saves
- **THEN** a sale list "spares (copy)" bound to the same profile exists with the entries of "spares", the browser shows it, and "spares" is still a have list linked to "binary hunt"

#### Scenario: Copy starts off Trade
- **WHEN** the owner copies a want list that is on Trade
- **THEN** the form opens with no linked list, and saving it as is adds no post to `/trade`

#### Scenario: Copying a sale list on Trade
- **WHEN** the owner copies sale list "binary sale", which is on Trade, as a sale list
- **THEN** the form shows no Trade switch, and the copy is off Trade and off Market

#### Scenario: Visitor
- **WHEN** a signed-in user opens the menu on someone else's list
- **THEN** no Copy as new list item is shown

#### Scenario: Open to from another type
- **WHEN** the owner copies a sale list and picks Want
- **THEN** the form shows no Open to choice, and the copy matches as Swaps or buying, as any new want list does

#### Scenario: Copy carries no Open to
- **WHEN** the owner copies want list "bulk buys", in a Buy post, as a want list
- **THEN** the form shows no Open to choice, and the copy matches as Swaps or buying

#### Scenario: Copied from the composer
- **WHEN** the owner copies have list "spares" through Copy a list… in the post composer's Selling for dropdown
- **THEN** the browser stays on the composer with "spares (copy)" picked, and no list page opens

### Requirement: Sale list Open to
A sale list SHALL be **Open to** one choice, set only by its post, through the post composer (see `web-trade-browse`): **Sell only**, the default, or **Sell or swap**, which also matches want lists open to swaps, counting toward Can swap and alerts like a have list (see Want list match option). A sale list SHALL match with what its posts on Trade are open to; with all its posts off Trade, with what they were set to; and in no post, as Sell only. Prices and Market SHALL be unchanged. Have lists SHALL have no such choice.

#### Scenario: Existing sale list
- **WHEN** a sale list that has never been in a post is opened
- **THEN** it is Sell only, matches only want lists open to buying, and its header shows no WTT tag

#### Scenario: Sell or swap
- **WHEN** the owner posts sale list "binary sale" as a Sell post with "Also open to swaps"
- **THEN** "binary sale" is open to swaps, its header and row show WTS and WTT, and it is still on Market at its prices

#### Scenario: Have list
- **WHEN** a user opens the post composer with a have list
- **THEN** it offers no selling or Open to choice for it

#### Scenario: Taken off Trade keeps the post's choice
- **WHEN** the owner takes that Sell post off Trade
- **THEN** "binary sale" still matches want lists open to swaps in the owner's For you and alerts, and Post it opens the composer with "Also open to swaps" ticked

#### Scenario: Set off Trade
- **WHEN** the owner opens Edit list on off-Trade sale list "binary sale", last posted as Sell or swap
- **THEN** the form offers no Open to choice, and "binary sale" still matches as Sell or swap

#### Scenario: Create a sale list
- **WHEN** the user creates sale list "binary sale", bound to a Cosmo profile
- **THEN** the form offers no Open to choice, and the list matches as Sell only until a post sets it

### Requirement: Sale list pairs
Only a sale list open to swaps SHALL be linkable to a want list; the pair is one post (see `web-trade-browse`), and its want side SHALL be open to swaps: Swaps only, or Swaps or buying when the seller would also pay. A sale list's Open to here is its post's, and a sale list in no post is Sell only. The server SHALL refuse linking a want list to a sale list set to Sell only, and setting a linked sale list to Sell only.

#### Scenario: Pair with a want list
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps only

#### Scenario: Pair that would also pay
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps, and ticks "also pay"
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps or buying

#### Scenario: Link to a Sell only list
- **WHEN** a request links want list "binary hunt" to sale list "store stock", set to Sell only
- **THEN** it is refused

#### Scenario: Link to a sale list in no post
- **WHEN** a request creates want list "binary hunt" linked to sale list "fresh stock", which has never been in a post
- **THEN** it is refused, since "fresh stock" is Sell only

#### Scenario: Sell only while linked
- **WHEN** a request sets linked sale list "binary sale" to Sell only
- **THEN** it is refused

## REMOVED Requirements

### Requirement: Open to on a want list off Trade
**Reason**: Open to is a post setting. A want list off Trade has no post whose tags could show it, and no form sets it any more, so the owner-only badge goes.
**Migration**: An off-Trade want list matches with what its posts were set to, or as Swaps or buying in no post (see Want list match option). Its Trade line still says it is off Trade.

### Requirement: Open to in the list form
**Reason**: Open to is chosen only in the Post composer (owner decision, 2026-11-21). Create, Edit and Copy list lose the choice.
**Migration**: Post or edit the list's post to set it. Step 1's migration copies each list's own value into its off-Trade post, so a choice already saved in the form is kept for a list that is in a post.

### Requirement: Open to on a sale list off Trade
**Reason**: as for want lists: a sale list's Open to is its post's, and an off-Trade sale list has no post to show it.
**Migration**: An off-Trade sale list matches with what its posts were set to, or as Sell only in no post (see Sale list Open to).

### Requirement: Sale list Open to in the list form
**Reason**: Open to is chosen only in the Post composer. Create, Edit and Copy list lose the Sell only / Sell or swap choice.
**Migration**: Post the list as a Sell post with or without "Also open to swaps". Step 1's migration copies each bound sale list's own value into its off-Trade post.
