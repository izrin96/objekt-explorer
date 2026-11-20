# Spec Delta

## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed entries of the post chosen under Offer on, labelled "Add from {post}", and no Add picker while Offer on names one of the partner's Buy posts (see Choosing the post); or, when the partner has no have or sale list bound to a Cosmo profile and on Trade and lets people ask for anything they hold, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first unless Sort is set to Collection No. (see Sort in the pickers); or, when they have no such list and don't allow that, no Add picker, and a line saying {name} has nothing on Trade to ask for and that the sender can still offer objekts or a top-up;
- the top-up and the note.

You get's picker over lists SHALL show the post chosen under Offer on, which opens as Where Offer on opens says: on the listing's sale list when opened from a Market listing.

Each picker SHALL show one tile per collection (see Copies grouped by collection in the pickers). Each copy a picker shows SHALL show its flags (not transferable, reserved, in another of the user's own open offers), whatever Sort and Hide not transferable are set to: on its tile when the tile stands for that one copy, else on its row in the serial dialog (see Serial dialog), with the tile counting the copies it shows that can't be offered. Hide not transferable decides which copies are shown (see Hide not transferable in the pickers). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch, Sort and Hide not transferable; and SHALL load more as it scrolls, up to 200 objekts at a time, so a long list does not land at once. A page SHALL end where a collection ends: a collection's copies SHALL never be split across two pages, and a collection with more than 200 copies SHALL be a page of its own. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

Each picker SHALL also offer Sort and Hide not transferable, after the matching switch (see Sort in the pickers and Hide not transferable in the pickers).

Below `sm`, each picker SHALL keep only its search field and a Filters button in view, the button counting the filters, List, matching switch and Hide not transferable that are set, and not Sort; choosing it SHALL show those controls in place. Its description SHALL be read to assistive technology only, and its footer SHALL be one row: the picked count, Cancel and Done.

You give's picker SHALL offer a **List** choice, after the filters: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, each shown with its list type badge, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of List.

You get's picker over lists SHALL offer no **List** choice: it shows only the entries of the post chosen under Offer on that the sender may ask for, and the filters and the matching switch apply on top of it. Another of the partner's posts is reached by changing Offer on.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or nothing on the post is available, since what they listed was traded away or can't be transferred. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters. In either picker, when the matching switch is on and no other filter is set, "nothing matches the filters" SHALL instead say that nothing held is on the other side's want lists ("rin.trades holds nothing on your want lists" in You get, "You hold nothing on rin.trades's want lists" in You give) and offer Turn off for the switch. When Hide not transferable is what empties a picker, the picker says so instead (see Hide not transferable in the pickers).

#### Scenario: Partner lists nothing
- **WHEN** the partner's only list on Trade is a have list with no entries, and the sender opens You get's picker with "Only what I want" on
- **THEN** the picker says the partner lists nothing the sender can ask for, not that the filters match nothing

#### Scenario: Partner with no lists
- **WHEN** the partner has no have or sale list on Trade, lets people ask for anything they hold, and the sender opens the builder
- **THEN** You get's button reads "Add from {name}'s collection", and its picker shows the objekts the partner holds, newest first, loading more as it scrolls

#### Scenario: Partner with no lists who takes no asks
- **WHEN** the partner has no have or sale list on Trade and hasn't turned on Let people ask for anything I hold, and the sender opens the builder
- **THEN** You get has no Add button, the line says the partner has nothing on Trade to ask for, and the sender can still send an offer that only gives objekts or a top-up

#### Scenario: Partner with a list
- **WHEN** the partner has one bound have list "doubles" on Trade, and no Buy post
- **THEN** the builder reads "Offer on doubles", You get's button reads "Add from doubles", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's Trade row, whose lead post is "doubles"
- **THEN** Offer on reads "doubles", You get's button reads "Add from doubles", and its picker shows only the entries of "doubles", with no List choice

#### Scenario: A list kept off Trade
- **WHEN** rin.trades has the bound have list "doubles" on Trade and the bound have list "private" off Trade, and no Buy post
- **THEN** the builder reads "Offer on doubles", You get's picker shows "doubles" only, and an offer asking for an entry only on "private" is refused when sent

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's Buy post "looking for", and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on reads "looking for" and offers "doubles" and "spares", and You get has no Add button until the sender changes Offer on to one of them, when it reads "Add from {post}" and its picker shows that post's entries only

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's listing in an objekt's Market tab, which comes from the sale list "spares"
- **THEN** the builder opens with that objekt under You get, Offer on reads "spares", and You get's picker shows only the entries of "spares"

#### Scenario: From a conversation
- **WHEN** the sender opens the builder from their conversation with rin.trades, who has "doubles" then "spares" on Trade
- **THEN** Offer on reads "doubles", You get's button reads "Add from doubles", and its picker shows the entries of "doubles" only

#### Scenario: Pick one of my lists
- **WHEN** the sender picks their sale list "doubles" under List, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: Pick one of their lists
- **WHEN** the sender, in their conversation with rin.trades, changes Offer on to rin.trades's sale list "spares" and opens You get's picker
- **THEN** the picker shows only the entries of "spares" the sender may ask for, with no List choice

#### Scenario: Their List shown for one list
- **WHEN** rin.trades has exactly one have or sale list on Trade and no Buy post
- **THEN** the builder reads "Offer on {that list}", and You get's picker shows that list's entries with no List choice

#### Scenario: Their List hidden over a collection
- **WHEN** rin.trades has no have or sale list on Trade and lets people ask for anything they hold, and the sender opens You get's picker
- **THEN** the collection picker offers no List choice

#### Scenario: Artist narrows members
- **WHEN** the sender picks ARTMS under Artist
- **THEN** the member choice offers only ARTMS members, and the picker shows only ARTMS objekts

#### Scenario: Online and collection number
- **WHEN** the sender picks Offline and collection number 204Z
- **THEN** the picker shows only offline objekts of collections numbered 204Z

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

#### Scenario: Picker on a phone
- **WHEN** the sender opens You get's picker at 390 px with "Only what I want" on and Hide not transferable off
- **THEN** the search field and "Filters 1" sit on one row above the grid, the footer is one row, and choosing Filters shows the filters, the matching switch, Sort and Hide not transferable, with no List

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry of the post under Offer on the sender may ask for

#### Scenario: A collection's copies on one page
- **WHEN** the sender holds one copy each of 199 collections, all received after their newest JiWoo 207Z, and three JiWoo 207Z, and opens You give's picker with All your objekts and Sort on "Newest received"
- **THEN** the first page holds the 199 and no JiWoo 207Z, and the next page holds all three JiWoo 207Z in one tile

## ADDED Requirements

### Requirement: Sort in the pickers
Each picker (You give, You get over lists, and You get over a partner's collection) SHALL offer a **Sort** select, labelled "Sort by", with two orders. The first is the picker's default order, selected until the user picks another: "Newest received" in You give and the collection picker, collections by their most recently received copy, newest first; "List order" in You get over lists, collections in the order the post lists them. The second is "Collection No.".

#### Scenario: List order in You get
- **WHEN** rin.trades's post "doubles" lists HeeJin 101Z, then Kaede 301Z, then YooYeon 110Z, and the sender opens You get's picker
- **THEN** Sort reads "List order" and the tiles follow the list, and after the sender picks "Collection No." they read HeeJin 101Z, YooYeon 110Z, Kaede 301Z

### Requirement: Collection number order
Under "Collection No.", collections SHALL come by collection number, low to high, compared character by character: 101A before 101Z, 101Z before 110Z, 110Z before 201Z. Collections with the same number SHALL come by member, in the member's place in their artist's roster, a member missing from the roster last. Collections that tie on both SHALL keep the default order. Artist, season and class SHALL not order them.

#### Scenario: Collection number in You give
- **WHEN** the sender holds HeeJin 110Z received today, JiWoo 207Z received yesterday and SeoYeon 101Z received last month, and opens You give's picker
- **THEN** the tiles read HeeJin 110Z, JiWoo 207Z, SeoYeon 101Z under "Newest received", and SeoYeon 101Z, HeeJin 110Z, JiWoo 207Z after the sender picks "Collection No."

#### Scenario: Same number, roster order
- **WHEN** the sender holds tripleS JiWoo 101Z, received today, and tripleS SeoYeon 101Z, received last week, and sorts by "Collection No."
- **THEN** SeoYeon 101Z comes before JiWoo 101Z, since SeoYeon comes first in the tripleS roster

#### Scenario: Same number and member in two seasons
- **WHEN** the sender holds SeoYeon Atom01 101Z, received last week, and SeoYeon Binary01 101Z, received today, and sorts by "Collection No."
- **THEN** SeoYeon Binary01 101Z comes first, as it does under "Newest received"

### Requirement: Sorting keeps collections whole
Sort SHALL order whole collections, each tile's copies in ascending serial order, and a page SHALL still end where a collection ends. Loading more SHALL continue in the chosen order. "From your have lists" SHALL follow Collection No. when chosen, else keep its list order. Collections a countered offer gave SHALL still lead the collection picker's first page. Changing Sort SHALL show the first page again and keep every pick.

#### Scenario: Paging by collection number
- **WHEN** the sender holds one copy each of 260 collections and sorts You give's picker by "Collection No."
- **THEN** the first page holds the 200 collections that come first by number, and the next page holds the other 60, still by number

#### Scenario: Changing Sort keeps picks
- **WHEN** the sender has picked Mayu 210Z #212 and HeeJin 110Z #3 and changes Sort
- **THEN** the picker shows its first page in the new order, and both picks stay checked and counted in the footer

### Requirement: Hide not transferable in the pickers
Each picker SHALL offer a **Hide not transferable** switch. While it is on, the picker SHALL leave out every copy that is not transferable before it pages, so no page comes back short. Tiles, their counts and the serial dialog SHALL cover only the copies left, and a collection with none left SHALL have no tile. The switch applies to "From your have lists" too, and on top of the filters, List and the matching switch.

#### Scenario: Copies left out of a tile
- **WHEN** the sender holds Mayu 210Z #57, which is not transferable, and #212 and #498, and turns on Hide not transferable in You give's picker
- **THEN** the Mayu 210Z tile reads "Choose from 2 serials" with no "can't be offered" line, and its serial dialog lists #212 and #498 only

#### Scenario: A collection with nothing left
- **WHEN** the sender's only Kaede 301Z, #9, is not transferable, and the switch is on
- **THEN** You give's picker shows no Kaede 301Z tile

### Requirement: What Hide not transferable keeps
Copies in a trade in progress, and copies in another of the sender's open offers, SHALL stay shown with their flags while the switch is on, as SHALL "Any serial" and its count in You get, which count only copies that can be sent. A pick of a copy the switch leaves out, made before or outside the picker, SHALL stay on its side, and confirming the serial dialog SHALL leave it. The switch never changes what may be sent.

#### Scenario: Reserved copies stay
- **WHEN** rin.trades lists YooYeon 310Z #44, #318, #702, #955 and #1460 on "spares", #318 is not transferable and #702 is in a trade in progress, and the sender turns the switch on in You get's picker
- **THEN** the tile reads "Choose from 3 serials" and "1 can't be offered", and the serial dialog lists #44, #702, #955 and #1460, with #702 reading "In a trade in progress"

#### Scenario: A hidden pick stays
- **WHEN** You give holds Kaede 301Z #9 from a counter, #9 is not transferable, and the sender opens You give's picker with the switch on
- **THEN** no tile shows #9, the footer still counts it, and after Done You give still holds #9 marked as one that can't be sent

### Requirement: Empty picker under Hide not transferable
When the switch is on and the picker is empty, and no search, facet or matching switch is set, the picker SHALL read "Nothing transferable to show" and offer Turn off, which turns the switch off. With any of those also set, it SHALL read "Nothing matches these filters". In You get over lists, "{name} hasn't listed anything to trade" SHALL still win over both.

#### Scenario: Everything left out
- **WHEN** every copy rin.trades lists on "doubles" is not transferable, the sender turns the switch on in You get's picker, and no filter is set
- **THEN** the picker reads "Nothing transferable to show" with Turn off, and choosing Turn off shows those copies again with "Not transferable"

#### Scenario: Left out with a filter set
- **WHEN** the switch is on, the sender picks ARTMS under Artist, and the only ARTMS copy they hold is not transferable
- **THEN** the picker reads "Nothing matches these filters"

### Requirement: Sort and the switch beside the filters
Reset SHALL leave Sort and Hide not transferable as they are, as it leaves the matching switch. Below `sm`, the Filters button's count SHALL include Hide not transferable while it is on, and SHALL never count Sort, which hides nothing.

#### Scenario: Counted on a phone
- **WHEN** the sender opens You give's picker at 390 px with the switch on, Sort on "Collection No." and nothing else set
- **THEN** the Filters button reads "Filters 1"

#### Scenario: Reset leaves the switch and Sort
- **WHEN** the switch is on, Sort reads "Collection No.", the sender has picked Season Atom01 and chooses Reset
- **THEN** Season is cleared, and the switch stays on and Sort stays on "Collection No."

### Requirement: Remembered picker view
Sort SHALL start on the default order and Hide not transferable SHALL start off. Once the user changes either one, this browser SHALL remember the choice. The choice applies in every picker the next time one opens, for any partner and on either side, and it lasts after a reload. It is kept in the browser only and is not tied to the account. Where the browser stores nothing, the pickers SHALL still work, and a choice lasts until the page reloads.

#### Scenario: First open
- **WHEN** a sender who has never changed either control opens You give's picker
- **THEN** Sort reads "Newest received" and Hide not transferable is off

#### Scenario: Remembered across sides and reloads
- **WHEN** the sender turns the switch on and picks "Collection No." in You give's picker, closes it, and opens You get's picker over rin.trades's "doubles"
- **THEN** the switch is on and Sort reads "Collection No.", and both stay so after the page reloads

#### Scenario: Default order on each side
- **WHEN** the sender picks "Newest received" again in You give's picker and then opens You get's picker over lists
- **THEN** Sort reads "List order"

#### Scenario: Browser storage blocked
- **WHEN** the browser refuses site storage, and the sender turns the switch on
- **THEN** the picker hides the copies that are not transferable, and after a reload the switch is off again
