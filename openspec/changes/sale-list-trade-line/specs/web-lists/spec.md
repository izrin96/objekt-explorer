## MODIFIED Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, and an optional Cosmo profile it is filed under with a flag deciding whether that
profile's Lists tab shows it. A have, want or sale list's link, Open to and place on Trade are
set in the post composer (see `web-trade-browse`), and its edit form shows the Trade line instead
(see Trade line in the list form). Every want list alerts its owner to new matches, whether or
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
- **THEN** its card on `/list` carries the profile chip and the profile's Lists tab does not show it

#### Scenario: Type comes first
- **WHEN** a user opens the create list dialog
- **THEN** the first field is List type, showing General, Have, Want and Sale side by side with General selected and its description under it, and Name follows it

#### Scenario: Switching type keeps the name
- **WHEN** the user types a name, then picks Want
- **THEN** the name stays, and the form shows no Open to choice, linked list or Trade switch

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
- Saving a list from its form SHALL change neither its link, nor a want or sale list's Open to, nor whether the list is on Trade; those are the post's, set through the post composer. A save that still carries a sale list's Trade state, from a tab opened before this rule, SHALL keep the list's current state.

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

### Requirement: Copy as new list
The owner's menu on a list card and in the list header SHALL offer Copy as new list. It SHALL open the create form filled in from the source list:
- the name with a copy suffix;
- description, profile, currency, Open to (from a want list only), columns and hide serial.

Type and profile binding SHALL be editable. The linked list SHALL start empty and the copy SHALL start off Trade. Saving SHALL create a new list, open it, and leave the source unchanged. Other visitors SHALL not see the action.

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

### Requirement: Trade line in the list form
The edit form of a have, want or sale list SHALL show one Trade line: the post that holds the list, with its tags, pair and option, or that the list is off Trade. On a sale list in a post it SHALL also name the list's Open to, Sell only or Sell or swap, and say it is also on Market. It SHALL offer Edit post when the list is in a post and Post it otherwise, each opening the post composer with this list picked (see `web-trade-browse`). Creating a have or want list, or a sale list bound to a Cosmo profile, SHALL offer Post it.

#### Scenario: List in a post
- **WHEN** the owner edits want list "binary hunt", which is in a Swap post with "spares" that would also pay
- **THEN** the Trade line reads "In your Swap post" with WTT and WTB, "Paired with spares · Would also pay", and Edit post

#### Scenario: Paired, off Trade
- **WHEN** the owner took that Swap post off Trade and edits "binary hunt"
- **THEN** the Trade line reads "Paired with spares · Off Trade" with Post it, which opens the composer on Swap with both lists picked

#### Scenario: Not on Trade
- **WHEN** the owner edits a want list in no post and paired with nothing
- **THEN** the Trade line reads "Not on Trade" with Post it

#### Scenario: Just created
- **WHEN** the owner creates have list "spares"
- **THEN** the dialog offers Post it, which opens the composer with "spares" picked

#### Scenario: Sale list, Sell only
- **WHEN** the owner edits sale list "store stock", alone in a Sell post and Sell only
- **THEN** the Trade line reads "In your Sell post" with WTS, "Sell only · Also on Market", and Edit post

#### Scenario: Sale list, Sell or swap with a want list
- **WHEN** the owner edits sale list "binary sale", in a Sell post with want list "binary hunt" that would also pay
- **THEN** the Trade line reads "In your Sell post" with WTS, WTT and WTB, "Sell or swap · Paired with binary hunt · Would also pay · Also on Market", and Edit post, which opens the composer on Sell with both lists picked

#### Scenario: Sale pair off Trade
- **WHEN** the owner took that Sell post off Trade and edits "binary sale"
- **THEN** the Trade line reads "Paired with binary hunt · Off Trade", says posting it again brings back the same Sell post, and offers Post it, which opens the composer on Sell with both lists picked and "Also open to swaps" ticked

#### Scenario: Sale list never posted
- **WHEN** the owner edits a bound sale list in no post and paired with nothing
- **THEN** the Trade line reads "Not on Trade", says posting it shows it on Market, in Browse and in others' matches, and offers Post it, which opens the composer on Sell with the list picked

#### Scenario: Sale list just created
- **WHEN** the owner creates sale list "binary sale" bound to a Cosmo profile
- **THEN** the dialog offers Post it, which opens the composer on Sell with "binary sale" picked

#### Scenario: Unbound sale list just created
- **WHEN** the owner creates a sale list not bound to a Cosmo profile
- **THEN** the dialog closes without offering Post it

#### Scenario: Want list in a Sell post
- **WHEN** the owner edits want list "binary hunt", in a Sell post with sale list "binary sale", open to swaps, that would also pay
- **THEN** the Trade line reads "In your Sell post" with WTS, WTT and WTB, and "Paired with binary sale · Would also pay", naming neither Open to nor Market

#### Scenario: Want list paired with a sale list, off Trade
- **WHEN** the owner took that Sell post off Trade and edits "binary hunt"
- **THEN** the Trade line reads "Paired with binary sale · Off Trade", says posting it again brings back the same Sell post, and offers Post it, which opens the composer on Sell with both lists picked
