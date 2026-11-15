# Spec Delta

## ADDED Requirements

### Requirement: Open to on a sale list off Trade
A sale list bound to a Cosmo profile and not on Trade SHALL name its Open to (Sell only or Sell or swap) to its owner, as a neutral badge in its list header and on its row on `/list` and on its own profile's Lists tab, since it still decides which want lists count against it in the owner's matches and alerts. Screen readers SHALL read it as "Open to" followed by the choice. No one else SHALL see it. A sale list on Trade, and one not bound to a profile, SHALL show no such badge.

#### Scenario: Owner's header
- **WHEN** the owner opens sale list "binary sale", bound to a Cosmo profile, set to Sell or swap and not on Trade
- **THEN** its header shows the Sale badge and Sell or swap, and no On Trade badge or tag

#### Scenario: Owner's row
- **WHEN** the owner opens `/list` with that sale list
- **THEN** its row shows Sell or swap beside the objekt count

#### Scenario: Never posted
- **WHEN** the owner opens a bound sale list that has never been on Trade
- **THEN** its header and its row show Sell only

#### Scenario: Visitor
- **WHEN** a signed-out visitor opens "binary sale", or its owner's profile Lists tab
- **THEN** neither its header nor its row names its Open to

#### Scenario: Posted
- **WHEN** the owner puts "binary sale" on Trade as a Sell post with "Also open to swaps"
- **THEN** its header and its row show On Trade, WTS and WTT, and no Sell or swap

#### Scenario: Unbound sale list
- **WHEN** the owner opens a sale list not bound to a Cosmo profile
- **THEN** its header and its row name no Open to

### Requirement: Sale list Open to in the list form
The form of a sale list bound to a Cosmo profile and not on Trade, and the form creating a bound sale list, SHALL offer its Open to as one choice of Sell only and Sell or swap, each saying which want lists it matches; a new sale list starts at Sell only. A sale list paired with a want list SHALL NOT be offered Sell only. A sale list on Trade, one not bound to a profile, and a form opened from the post composer SHALL show no choice.

#### Scenario: Change it off Trade
- **WHEN** the owner edits "binary sale", bound, off Trade, set to Sell only and holding SeoYeon 204Z, which rin.trades's want list on Trade, open to swaps only, asks for, picks Sell or swap and saves
- **THEN** its header and its row show Sell or swap, it stays off Trade, and on the next load SeoYeon 204Z counts as one the user has that rin.trades wants on Browse and For you

#### Scenario: Create with a choice
- **WHEN** the user creates sale list "binary sale", bound to a Cosmo profile, and picks Sell or swap
- **THEN** "binary sale" is saved off Trade and Sell or swap, and its header and its row show Sell or swap

#### Scenario: Create unbound
- **WHEN** the user creates a sale list and turns profile binding off
- **THEN** the form shows no Open to choice, and the list is saved Sell only

#### Scenario: Copy keeps and changes it
- **WHEN** the owner copies "binary sale", set to Sell or swap, from its row as a sale list
- **THEN** the form starts at Sell or swap, and the copy saves the choice the form holds

#### Scenario: Copy as another type
- **WHEN** the owner copies "binary sale", set to Sell or swap, and picks Have
- **THEN** the form shows no sale Open to choice, and the copy is a have list

#### Scenario: On Trade
- **WHEN** the owner edits sale list "store stock", which is on Trade
- **THEN** the form shows no Open to choice, and saving keeps the Open to its post set

#### Scenario: Paired off Trade
- **WHEN** the owner edits "binary sale", paired with want list "binary hunt" and off Trade
- **THEN** Sell only is disabled and says a paired sale list takes swaps, and a request that saves it as Sell only is refused

#### Scenario: Unsaved choice
- **WHEN** the owner changes the choice and has not saved
- **THEN** the Trade line asks to save first and Post it is disabled

#### Scenario: Post it takes the choice
- **WHEN** the owner has saved "binary sale", in no post and paired with nothing, as Sell or swap, and activates Post it on its Trade line
- **THEN** the composer opens on Sell with "binary sale" picked and "Also open to swaps" ticked; saved as Sell only, it opens with it unticked

#### Scenario: Posted while the form was open
- **WHEN** the owner opens the form of off-Trade "binary sale", posts it from another tab, then saves the form with another choice
- **THEN** the save keeps the post's Open to and saves the form's other fields

#### Scenario: From the composer
- **WHEN** the owner opens Edit list, New sale list… or Copy a list… in the post composer
- **THEN** the form shows no Open to choice

#### Scenario: Old tab
- **WHEN** a tab opened before this rule saves "binary sale", or creates a sale list
- **THEN** "binary sale" keeps its Open to, and the new list is Sell only

## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, and an optional Cosmo profile it is filed under with a flag deciding whether that
profile's Lists tab shows it. A have, want or sale list's link and place on Trade are set in
the post composer (see `web-trade-browse`), and its edit form shows the Trade line instead
(see Trade line in the list form); a want list's Open to, and a bound sale list's, are set
there while the list is on Trade, and in its form while it is off (see Open to in the list
form and Sale list Open to in the list form).
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
- **WHEN** the user with a linked Cosmo profile picks the sale type in the create form
- **THEN** the form shows currency, profile binding and the Open to choice at Sell only, and no Show on Market and Trade switch

#### Scenario: Type on edit
- **WHEN** a user opens the edit dialog of a have list
- **THEN** the top of the form shows a Have badge and no control to change the type, and its description names Copy as new list

### Requirement: List rows
Lists SHALL show as rows on `/list` and on a profile's Lists tab. A row SHALL show the list's latest artworks (five slots on wider screens, dashed where the list has fewer; up to three overlapping on a phone), its name linking to the list, and one line with the objekt count, the Bound badge, On Trade with its post's tags, to its owner the Open to of a want list, or of a bound sale list, while it is off Trade (see Open to on a want list off Trade and Open to on a sale list off Trade), a sale list's currency, and chips for the linked list and the Cosmo profile; the profile chip SHALL be left out on that profile's own tab. A row's menu SHALL offer Copy link to everyone, and Edit, Copy as new list and Delete to the owner.

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

### Requirement: Show on Trade
A have, want or sale list SHALL be on Trade or not, off by default; it is what other specs call discoverable. Every one of them SHALL be put on and taken off Trade only through the post composer (see `web-trade-browse`); no list form offers a switch for it. With a list on Trade:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

Off Trade the list SHALL be in none of these for anyone else. Its owner's own matches and alerts still read it: every want list, and a have or sale list while it is bound to a Cosmo profile (see `web-trade-for-you` Account-wide matches and `web-notifications`).
- A have or sale list not filed under a Cosmo profile cannot be on Trade; its Trade line SHALL say why.
- Putting a list on Trade SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case it takes that bump's time (see `web-trade-browse` Bump).
- Saving a list from its form SHALL change neither its link, nor a want or sale list's Open to while the list is on Trade, nor whether the list is on Trade; those are the post's, set through the post composer. A want list off Trade, and a bound sale list off Trade, take their Open to from the form (see Open to in the list form and Sale list Open to in the list form). A save that still carries a sale list's Trade state, from a tab opened before this rule, SHALL keep the list's current state.

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

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to the page of the post the list is in (see `web-trade-person-pages` Post page), reached through the list's Cosmo profile, or its linked list's when the list has none; a list with neither SHALL link to `/trade`. The On Trade badge on the list's row SHALL link the same way. Neither link SHALL load the post page ahead of a click. After it, the header and the list's row on `/list` SHALL show the tags of the post the list is in, as Trade tags it (see `web-trade-browse`): its linked list joins the post when that list is on Trade too. A list off Trade SHALL show no tags. A list on Trade SHALL NOT name its Open to in words, since its tags say it; a want list, or a bound sale list, off Trade names it to its owner only (see Open to on a want list off Trade and Open to on a sale list off Trade).

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

#### Scenario: Either half of a Swap pair
- **WHEN** have list "spares" and want list "binary hunt", open to swaps or buying, are on Trade as one Swap post
- **THEN** both headers show On Trade, WTT and WTB

#### Scenario: Off Trade
- **WHEN** a want list set to Buying only is not on Trade
- **THEN** its header and its row on `/list` show no tag, and only its owner sees Buying only

#### Scenario: Sale list off Trade
- **WHEN** a bound sale list set to Sell or swap is not on Trade
- **THEN** its header and its row on `/list` show no tag, and only its owner sees Sell or swap

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

### Requirement: Copy as new list
The owner's menu on a list row and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, Open to (a want list's into a want copy, a sale list's into a sale copy), columns and hide serial.

Type and profile binding SHALL be editable. The linked list SHALL start empty and the copy SHALL start off Trade. Saving SHALL create a new list, open it, and leave the source unchanged. A copy made from the post composer SHALL be picked there and not opened, its type fixed to the composer side's (see `web-trade-browse` Composer copy form). Other visitors SHALL not see the action.

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
- **THEN** Open to starts at Swaps or buying, as Create does

#### Scenario: Copied from the composer
- **WHEN** the owner copies have list "spares" through Copy a list… in the post composer's Selling for dropdown
- **THEN** the browser stays on the composer with "spares (copy)" picked, and no list page opens

### Requirement: Sale list Open to
A sale list SHALL carry an **Open to** choice, set by its post while the list is on Trade, and by its list form while it is off Trade and bound to a Cosmo profile (see Sale list Open to in the list form): **Sell only**, the default for every new and existing sale list, or **Sell or swap**, which also matches want lists open to swaps, counting toward Can swap and alerts like a have list (see Want list match option). Prices and Market SHALL be unchanged. An update that leaves the choice out SHALL keep it. Have lists SHALL have no such choice.

#### Scenario: Existing sale list
- **WHEN** a sale list made before this change is opened
- **THEN** it is Sell only, matches only want lists open to buying, and its header shows no WTT tag

#### Scenario: Sell or swap
- **WHEN** the owner posts sale list "binary sale" as a Sell post with "Also open to swaps"
- **THEN** "binary sale" is open to swaps, its header and row show WTS and WTT, and it is still on Market at its prices

#### Scenario: Have list
- **WHEN** a user opens the post composer with a have list
- **THEN** it offers no selling or Open to choice for it

#### Scenario: Set off Trade
- **WHEN** the owner sets off-Trade sale list "binary sale" to Sell or swap in its form, then posts it as a Sell post without touching "Also open to swaps"
- **THEN** the post is tagged WTS and WTT, and "binary sale" stays Sell or swap
