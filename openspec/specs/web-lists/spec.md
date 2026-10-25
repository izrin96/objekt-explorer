# web-lists Specification

## Purpose
Lists on `apps/web`: collections of objekts a signed-in user curates, trades from and
shares, including sale lists with prices.

## Requirements

### Requirement: Manage lists
A signed-in user SHALL see their lists at `/list` and create, edit and delete them. A list
has a name, a type (general, have, want, sale), a currency when it is a sale list, a
description, an optional Cosmo profile it is filed under with a flag deciding whether that
profile's Lists tab shows it, and, on a sale list, one Show on Market and Trade switch (see
Show on Trade). A have or want list's link, Open to and place on Trade are set in the post
composer (see `web-trade-browse`), and its form shows the Trade line instead (see Trade line in
the list form). Every want list alerts its owner to new matches, whether or not it is on Trade
(see `web-notifications`). A signed-out visitor SHALL be sent to `/login?redirect=/list`.

List type SHALL be the first field of the create form, above Name. It SHALL be a segmented
control showing all four types at once, one selected, operable by keyboard as one radio
group, with the chosen type's description under it. Changing the type SHALL show or hide the
fields that depend on it (currency, profile binding, Show on Market and Trade) without clearing
what the user already typed in Name or Description. The edit form SHALL show the list's type at
the top as a read-only type badge, since a list's type cannot change after it is created, and
the badge's description SHALL say that Copy as new list makes a list of another type or binding
(see Copy as new list).

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
- **THEN** the name stays, and the form shows no Open to choice, linked list or Show on Trade switch

#### Scenario: Type on edit
- **WHEN** a user opens the edit dialog of a have list
- **THEN** the top of the form shows a Have badge and no control to change the type, and its description names Copy as new list

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
On their own want list, or their own have or sale list bound to a Cosmo profile, the owner SHALL see a Find matches control in the list header. Once it is known, and only for a list that compares both ways, the control SHALL show the number of mutual people for that list: the number the Mutual option reads (Mutual N) when the link opens, so people whose posts are all idle are left out of both and the two numbers never disagree. A list that opens on Any SHALL show no number. Activating it SHALL open For you with Compare with naming that list:
- `/trade/for-you?match=mutual&list=<slug>` when the list compares both ways, because its linked list also takes part in Trade;
- `/trade/for-you?match=any&list=<slug>` otherwise.

Other visitors SHALL not see the control.

#### Scenario: Owner opens matches
- **WHEN** the owner of have list "spares", linked to want list "binary hunt", activates Find matches
- **THEN** the browser is at `/trade/for-you?match=mutual&list=spares`, with Matches on Mutual and Compare with naming "spares"

#### Scenario: Owner opens matches for a lone list
- **WHEN** the owner of sale list "duplicates" activates Find matches
- **THEN** the browser is at `/trade/for-you?match=any&list=duplicates`, with Matches on Any and Compare with naming "duplicates"

#### Scenario: Visitor
- **WHEN** a signed-in user opens someone else's have list
- **THEN** no Find matches control is shown

#### Scenario: Count agrees with Mutual
- **WHEN** have list "spares" has 3 mutual people, one of whom has only idle posts, and the owner views its header
- **THEN** Find matches reads 2, and the link opens on Mutual, its button reading "Can swap 2"

#### Scenario: Lone list has no count
- **WHEN** the owner views sale list "duplicates"
- **THEN** Find matches shows no number

### Requirement: Show on Trade
A have, want or sale list SHALL be on Trade or not, off by default; it is what other specs call discoverable. A have or want list SHALL be put on and taken off Trade through the post composer (see `web-trade-browse`). A sale list's form SHALL offer exactly one switch, Show on Market and Trade, whose description names everything it turns on. With a list on Trade:
- a have or want list SHALL be on the `/trade` feed (see `web-trade-browse`) and take part in matching (For you, want alerts and the offer picker);
- a sale list SHALL additionally be on Market and in each objekt's Market tab.

Off Trade the list SHALL be in none of these, except that a want list still alerts its owner to matches (see `web-notifications`).
- A have or sale list not filed under a Cosmo profile cannot be on Trade; the sale list's switch SHALL be disabled and say why.
- Putting a list on Trade SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case it takes that bump's time (see `web-trade-browse` Bump).
- Saving a list from its form SHALL change neither its link nor a want list's Open to, nor a have or want list's switch; those are the post's, set through the post composer. A sale list's form saves its switch.

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
- **WHEN** the owner turns Show on Market and Trade on for a sale list bound to a Cosmo profile
- **THEN** its objekts appear on Market, the list appears on `/trade` as a WTS post, and For you matches it as a have list

#### Scenario: Unbound sale list
- **WHEN** the owner opens a sale list that is not filed under a Cosmo profile
- **THEN** Show on Market and Trade is off and disabled with the reason shown

#### Scenario: Editing one half of a pair
- **WHEN** want list "binary hunt" is on Trade and linked to have list "spares", which is off Trade, and the owner edits only the description of "binary hunt"
- **THEN** "spares" stays off Trade, the two stay linked, and "binary hunt" keeps its Open to

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to `/trade`. After it, the header and the list's card on `/list` SHALL show the tags of the post the list is in, as Trade tags it (see `web-trade-browse`): its linked list joins the post when that list is on Trade too. A list off Trade SHALL show no tags, and no list SHALL name its Open to in words, since the post sets it.

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

#### Scenario: Either half of a Swap pair
- **WHEN** have list "spares" and want list "binary hunt", open to swaps or buying, are on Trade as one Swap post
- **THEN** both headers show On Trade, WTT and WTB

#### Scenario: Off Trade
- **WHEN** a want list set to Buying only is not on Trade
- **THEN** its header and card show no tag and no Open to

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
A want list SHALL carry an **Open to** choice, set by the post that holds it, not by the list form:
- **Swaps only**, the default for a new want list and what a Swap post saves without "also pay": it matches entries on have lists only;
- **Swaps or buying**, what a Swap post saves with "also pay": it matches entries on have lists and on sale lists;
- **Buying only**, what a Buy post saves: it matches entries on sale lists only. Only a want list on its own SHALL be Buying only: a want list linked to a have list, or to a sale list open to swaps, is someone trading, so it SHALL be open to swaps.

Have and general lists carry no choice; a sale list carries its own (see Sale list Open to). A have list's entry, and the entry of a sale list open to swaps, SHALL count against a want list when that want list is open to swaps (Swaps only, or Swaps or buying). A sale list's entry SHALL count against a want list when that want list is open to buying (Swaps or buying, or Buying only). A sale list set to Sell only SHALL never count against a want list open to swaps only. Linking a have list and a want list SHALL NOT change what either list matches. This applies wherever Trade matches a want list against a have or sale list:
- Trade match counts on Browse and For you, in both directions;
- Matches Any and Mutual, and Mutual N;
- want-list alerts and "Someone wants what you have" alerts.

The server SHALL refuse saving a want list linked to a have list as Buying only, and linking a want list set to Buying only to a have list, whether the request comes from the post composer or from creating a list.

A request to create a want list that leaves the choice out SHALL save Swaps only. A save that turns buying off SHALL leave the list open to swaps, so a want list is never open to nothing. A want list made before Swaps only became the default keeps the choice it had, Swaps or buying. No existing want list SHALL become Buying only unless its owner picks it.

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
- **THEN** Open to starts at Swaps only, as Create does

### Requirement: Copied entries
A copy SHALL carry the source's entries in their order, converted to the new list's binding:
- unbound to unbound: every collection, duplicates included;
- bound to unbound: each collection once;
- to a bound list: on the same profile, the copies it still owns; otherwise every copy it owns of each collection.

On a sale to sale copy, price, quote-your-own-price and note SHALL go with an entry that carries over one to one. Otherwise they SHALL be empty.

#### Scenario: Bound to unbound
- **WHEN** the owner copies a bound have list holding serials #12 and #40 of one collection and one copy of another as a general list
- **THEN** the new list holds two entries, one per collection

#### Scenario: Unbound to bound
- **WHEN** the owner copies an unbound general list of three collections as a have list bound to a profile that owns two copies of the first collection and none of the others
- **THEN** the new list holds those two copies, and two collections are reported left out

#### Scenario: Same profile keeps owned copies
- **WHEN** the owner copies a bound sale list of five copies, one of which the profile has since sent away, as a sale list on the same profile
- **THEN** the new list holds the four owned copies with their prices and notes, and one is reported left out

#### Scenario: Type change drops prices
- **WHEN** the owner copies a sale list with priced entries as a have list
- **THEN** the new list's entries carry no price, quote-your-own-price or note

### Requirement: Copy carry-over count
While the copy form's binding or profile differs from the source, the form SHALL show how many entries will be carried over and how many left out, and update it as either changes. After saving, the success message SHALL give the same two numbers.

#### Scenario: Count before saving
- **WHEN** the owner copying an unbound list of ten collections turns on profile binding for a profile owning copies of seven of them
- **THEN** the form says seven collections carry over and three are left out, before anything is saved

#### Scenario: Count after saving
- **WHEN** that copy is saved
- **THEN** the success message says seven were carried over and three left out

### Requirement: Trade line in the list form
The edit form of a have or want list SHALL show one Trade line in place of a switch: the post that holds the list, with its tags, pair and option, or that the list is off Trade. It SHALL offer Edit post when the list is in a post and Post it otherwise, each opening the post composer with this list picked (see `web-trade-browse`). Creating a have or want list SHALL offer Post it.

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

### Requirement: Want list rules
A want list SHALL hold rules beside its objekts. A rule is one of:
- **Any member of a collection**: a season and collection number, any member, with optional prio members;
- **Class, season and edition**: a class, a season, editions (or any edition) and any member or chosen members. Only First, Special and Motion have editions, and no class of idntt does: there the dialog SHALL offer no Edition choice, and the server SHALL drop any edition sent, so the rule never asks for one that matches nothing.

Each rule SHALL carry Skip ones I own, on by default. Only want lists SHALL hold rules; the server SHALL refuse a rule on any other list.

#### Scenario: Any member of a collection
- **WHEN** the owner of want list "binary hunt" adds the rule CC366, any member, prio YooYeon and NaKyoung
- **THEN** the list holds that rule, and every Cream02 366 collection of every member is wanted, whatever the prio

#### Scenario: idntt has no editions
- **WHEN** the owner picks idntt and First in Add rule
- **THEN** no Edition choice shows, and a rule sent with an edition is saved with none

#### Scenario: Class, season and edition
- **WHEN** the owner adds the rule First, Cream02, 3rd edition, any member
- **THEN** cc117–cc120 of every member are wanted

#### Scenario: Not a want list
- **WHEN** a request adds a rule to have list "spares"
- **THEN** it is refused

### Requirement: What a rule wants
A rule SHALL want each collection it describes, except, with Skip ones I own on, one the owner holds on any linked address. What a rule wants SHALL follow new collections and the owner's holdings within 15 minutes. Its objekts SHALL count everywhere an objekt added by hand counts. A collection both on the list and in a rule SHALL count once.

#### Scenario: Owner gets one
- **WHEN** the owner of rule CC366, any member, receives YooYeon CC366 on a linked address
- **THEN** within 15 minutes the rule no longer wants YooYeon CC366, and its "can match" count drops by one

#### Scenario: Owner sends one away
- **WHEN** the owner sends Lynn CC366 to someone else
- **THEN** within 15 minutes the rule wants Lynn CC366 again

#### Scenario: Skip ones I own off
- **WHEN** the rule has Skip ones I own off
- **THEN** it wants every collection it describes, held or not

### Requirement: Rule limits
A rule SHALL describe at most 500 objekts before owned ones are skipped; a wider rule SHALL be refused, and the dialog SHALL say how many it covers and to pick a season or edition. With Skip ones I own on, a rule that has nothing left to match SHALL NOT be added, and the dialog SHALL say so and offer to turn Skip ones I own off.

#### Scenario: Too wide
- **WHEN** the owner sets First, any season, any edition
- **THEN** the dialog says how many objekts that covers and that a rule covers up to 500, and Add rule is disabled

#### Scenario: Nothing to match
- **WHEN** the owner holds every member's CC366 and sets the rule CC366, any member, with Skip ones I own on
- **THEN** the dialog reads "0 can match", says why, and Add rule is disabled until Skip ones I own is off

### Requirement: Add rule
The owner of a want list SHALL see an Add rule button in the list header, beside Find matches. It SHALL open a dialog with the two kinds of rule as choices that each say what they take and show an example ("One collection, every member", e.g. any CC366; "Every collection of a class, for the members you pick", e.g. Cream02 FCO 3rd), the fields of the kind picked, Skip ones I own, and a live line naming the rule with how many objekts it covers, how many the owner holds and how many can match. Exact objekts SHALL still be added from the objekt pages, as today.

#### Scenario: Live count
- **WHEN** the owner picks First, Cream02, 3rd edition, any member, holding 18 of them
- **THEN** the dialog reads "Cream02 · FCO · 3rd · any member", "96 objekts · you own 18 · 78 can match"

#### Scenario: Each kind explains itself
- **WHEN** the owner opens Add rule
- **THEN** Any member of a collection reads "One collection, every member." with "e.g. any CC366: Lynn CC366, Nien CC366 …", and Class, season and edition reads "Every collection of a class, for the members you pick." with "e.g. Cream02 FCO 3rd: 117Z to 120Z, every member"

#### Scenario: Visitor
- **WHEN** someone else opens the list
- **THEN** no Add rule button shows

#### Scenario: Changing the artist
- **WHEN** the owner has typed collection number 366 under tripleS and switches the artist to ARTMS
- **THEN** the collection number is cleared, the season moves to ARTMS's newest, the class stays if ARTMS has it and otherwise becomes ARTMS's first class, and the editions, members and priority members are cleared, so the dialog never carries over a number or class the new artist doesn't have

### Requirement: Rules strip
A list holding rules SHALL show a Rules strip between its header and the filter bar: a header with the number of rules and how many objekts they can match, collapsible, and one row per rule with its label, what it skips, its "N can match" and, for the owner, a menu. The filters SHALL NOT hide rules. A rule's objekts SHALL stay out of the objekt grid and its count. A visitor SHALL see the strip without the menu, and a See the objekts button on each row in its place. What a rule skips is the list owner's holdings, so only the owner SHALL read "skips the N you own" and "includes ones you own"; everyone else, signed out too, SHALL read "skips the N they own" and "includes ones they own".

#### Scenario: Strip
- **WHEN** "binary hunt" holds two rules matching 78 and 21 objekts and five objekts added by hand
- **THEN** the strip reads "Rules 2 · 99 can match" with one row per rule, and the grid shows the five objekts and reads "5 objekts"

#### Scenario: No rules
- **WHEN** a list holds no rules
- **THEN** no Rules strip shows

#### Scenario: A visitor reads whose they are
- **WHEN** a signed-out visitor opens "binary hunt", whose rule skips 2 objekts its owner holds
- **THEN** the row reads "skips the 2 they own" and offers See the objekts, and opening it notes "Faded = they own it"

### Requirement: Rule menu
Each rule row's menu SHALL offer See the objekts, Edit rule, Turn into objekts and Delete rule. See the objekts SHALL expand the row into one scrolling grid of every objekt the rule describes, ordered by collection number then season, each card labelled with its member and collection, the ones it skips faded, with no tabs. When the rule spans several collections holding three or more cards each on average, each collection SHALL get a heading of its season and number with what it can match ("cc117 · 19 can match"); one collection, or one or two chosen members a collection, SHALL stay one flat grid. An any-season rule SHALL keep the same number of different seasons apart. Turn into objekts SHALL replace the rule with the objekts it wants now, as objekts on the list.

#### Scenario: See the objekts
- **WHEN** the owner opens See the 96 objekts on the 3rd edition rule, holding 5 of cc117
- **THEN** the row expands into one grid headed cc117 · 19 can match, cc118, cc119 and cc120, with those 5 faded and no tabs

#### Scenario: Chosen member reads flat
- **WHEN** the owner opens See the objekts on "any season · FCO · NaKyoung", one card a collection
- **THEN** the objekts show as one flat grid with no headings

#### Scenario: Turn into objekts
- **WHEN** the owner turns that rule into objekts
- **THEN** the rule is gone, the list holds its 78 objekts as objekts, and they no longer follow holdings

### Requirement: Show my matches
On someone else's list that is on Trade, a signed-in viewer SHALL have a Show my matches toggle in the filter bar, off by default. On, the grid SHALL show only the objekts whose collection matches the viewer's lists by the rules For you uses (on a have or sale list the viewer's want lists, on a want list the viewer's have and sale lists, as its Open to allows), together with the filters, and its total SHALL count only those; a rule's objekts stay in the Rules strip and are not counted. Beside the toggle the count SHALL read "N you want" or on a want list "N you have", counting collections, and open "Matched with your lists", naming each of those lists. The matches SHALL load only while the toggle is on; while they load the toggle SHALL show a spinner and the grid stays whole, and a refusal SHALL show its reason beside it. When nothing matches, the page SHALL say so and offer Show all, which turns the toggle off. It SHALL NOT show on the viewer's own list, to a signed-out visitor, on a list off Trade, or while a Compare is active, whose result already answers its own question.

#### Scenario: Turn it on
- **WHEN** a signed-in viewer opens sale list "WTS" on Trade, 2,407 objekts of which 58 collections are on the viewer's want list "binary hunt", and turns on Show my matches
- **THEN** the grid shows only those objekts, the count reads "58 you want", and it opens a popover naming "binary hunt"

#### Scenario: Nothing matches
- **WHEN** the viewer turns it on and none of the list's objekts match
- **THEN** the page reads "Nothing here matches your lists" with Show all, which brings the whole list back

#### Scenario: While comparing
- **WHEN** the viewer compares the list with a profile
- **THEN** the toggle is gone, and the grid shows the Compare result, until the Compare is cleared

### Requirement: Add to list adds objekts only
The Add to list dialog SHALL add the picked objekts, never a rule, whatever list is picked. A rule SHALL be added from the want list's own page.

#### Scenario: Want list picked
- **WHEN** a user opens Add to list on Lynn CC366 and picks want list "binary hunt"
- **THEN** the dialog offers no rule option, its button reads Add, and the list gains Lynn CC366

### Requirement: Rules in exports
Share text, export and the Discord format SHALL write each rule as one line in its own words, before the objekts: "any CC366 (prio Lynn)", "any Cream02 FCO 3rd". Copy as new list SHALL keep the rules when the copy is a want list, and drop them, with the objekts they want, when it is not.

#### Scenario: Discord format
- **WHEN** the owner copies "binary hunt" in the Discord format
- **THEN** the Want part starts with "any CC366 (prio YooYeon, NaKyoung)" and "any Cream02 FCO 3rd", then the objekts, and no line per rule objekt

### Requirement: Sale list Open to
A sale list SHALL carry an **Open to** choice, set by its post, not by the list form: **Sell only**, the default for every new and existing sale list, or **Sell or swap**, which also matches want lists open to swaps, counting toward Can swap and alerts like a have list (see Want list match option). Prices and Market SHALL be unchanged. An update that leaves the choice out SHALL keep it. Have lists SHALL have no such choice.

#### Scenario: Existing sale list
- **WHEN** a sale list made before this change is opened
- **THEN** it is Sell only, matches only want lists open to buying, and its header shows no WTT tag

#### Scenario: Sell or swap
- **WHEN** the owner posts sale list "binary sale" as a Sell post with "Also open to swaps"
- **THEN** "binary sale" is open to swaps, its header and card show WTS and WTT, and it is still on Market at its prices

#### Scenario: Have list
- **WHEN** a user opens the post composer with a have list
- **THEN** it offers no selling or Open to choice for it

### Requirement: Sale list pairs
Only a sale list open to swaps SHALL be linkable to a want list; the pair is one post (see `web-trade-browse`), and its want side SHALL be open to swaps: Swaps only, or Swaps or buying when the seller would also pay. The server SHALL refuse linking a want list to a sale list set to Sell only, and setting a linked sale list to Sell only.

#### Scenario: Pair with a want list
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps only

#### Scenario: Pair that would also pay
- **WHEN** the owner also picks want list "binary hunt" for the Sell post of "binary sale", open to swaps, and ticks "also pay"
- **THEN** "binary sale" is linked to "binary hunt", which saves open to swaps or buying

#### Scenario: Link to a Sell only list
- **WHEN** a request links want list "binary hunt" to sale list "store stock", set to Sell only
- **THEN** it is refused

#### Scenario: Sell only while linked
- **WHEN** a request sets linked sale list "binary sale" to Sell only
- **THEN** it is refused
