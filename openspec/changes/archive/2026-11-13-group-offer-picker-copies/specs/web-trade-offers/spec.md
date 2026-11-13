# Spec Delta

## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists" (for a partner who takes asks from one post, over the post chosen under Offer on, labelled "Add from {post}"; see Choosing the post); or, when the partner has no have or sale list bound to a Cosmo profile and on Trade and lets people ask for anything they hold, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first; or, when they have no such list and don't allow that, no Add picker, and a line saying {name} has nothing on Trade to ask for and that the sender can still offer objekts or a top-up;
- the top-up and the note.

Opened from a Market listing, You get's picker SHALL open with its List choice on the listing's sale list; opened anywhere else, on All their lists.

Each picker SHALL show one tile per collection (see Copies grouped by collection in the pickers). Each pickable copy SHALL show its flags (not transferable, reserved, in another of the user's own open offers): on its tile when the tile stands for that one copy, else on its row in the serial dialog (see Serial dialog), with the tile counting the copies that can't be offered. Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch; and SHALL load more as it scrolls, up to 200 objekts at a time, so a long list does not land at once. A page SHALL end where a collection ends: a collection's copies SHALL never be split across two pages, and a collection with more than 200 copies SHALL be a page of its own. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

Below `sm`, each picker SHALL keep only its search field and a Filters button in view, the button counting the filters, List and matching switch that are set; choosing it SHALL show those controls in place. Its description SHALL be read to assistive technology only, and its footer SHALL be one row: the picked count, Cancel and Done.

You give's picker SHALL offer a **List** choice, after the filters: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, each shown with its list type badge, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of List.

You get's picker over lists SHALL offer a **List** choice, after the filters, when the partner has a have or sale list on Trade: All their lists; or one of those lists, shown as its name after its list type badge as in Compare with, which shows only that list's entries the sender may ask for. The filters and the matching switch apply on top of List. List changes only what the picker shows, not what may be sent. With a list picked, an empty picker SHALL say that nothing matches the filters, or else that nothing on that list is available. For a partner who takes asks from one post there is no List choice: the picker shows the post chosen under Offer on.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters. In either picker, when the matching switch is on and no other filter is set, "nothing matches the filters" SHALL instead say that nothing held is on the other side's want lists ("rin.trades holds nothing on your want lists" in You get, "You hold nothing on rin.trades's want lists" in You give) and offer Turn off for the switch.

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
- **WHEN** the partner has one bound have list on Trade
- **THEN** You get's button reads "Add from {name}'s lists", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's Trade row, whose lead post is "doubles"
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker opens on All their lists, showing the entries of both

#### Scenario: A list kept off Trade
- **WHEN** rin.trades has the bound have list "doubles" on Trade and the bound have list "private" off Trade
- **THEN** You get's picker and its List choice show "doubles" only, and an offer asking for an entry only on "private" is refused when sent

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's WTB post, and rin.trades has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's listing in an objekt's Market tab, which comes from the sale list "spares"
- **THEN** the builder opens with that objekt under You get, and You get's picker opens on "spares" under List, from which the sender MAY switch to All their lists

#### Scenario: From a conversation
- **WHEN** the sender opens the builder from their conversation with rin.trades, who has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: Pick one of my lists
- **WHEN** the sender picks their sale list "doubles" under List, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: Pick one of their lists
- **WHEN** the sender, in their conversation with rin.trades, opens You get's picker and picks rin.trades's sale list "spares" under List
- **THEN** the picker shows only the entries of "spares" the sender may ask for

#### Scenario: Their List shown for one list
- **WHEN** rin.trades has exactly one have or sale list on Trade
- **THEN** You get's picker offers a List choice of All their lists and that list

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
- **WHEN** the sender opens You get's picker at 390 px with "Only what I want" on
- **THEN** the search field and "Filters 1" sit on one row above the grid, the footer is one row, and choosing Filters shows the filters, List and the switch

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for

#### Scenario: A collection's copies on one page
- **WHEN** the sender holds one copy each of 199 collections, all received after their newest JiWoo 207Z, and three JiWoo 207Z, and opens You give's picker with All your objekts
- **THEN** the first page holds the 199 and no JiWoo 207Z, and the next page holds all three JiWoo 207Z in one tile

### Requirement: Hidden serials stay hidden in offers
When an entry on the recipient's list comes from a list that hides serial numbers, the offer builder's You get picker SHALL offer it only as "any copy" of its collection. Neither that entry nor the recipient's other copies of the collection SHALL be shown or pickable by serial through that entry.

A request asking for a specific objekt SHALL be refused unless that objekt is reachable through an entry on a list that shows serials, or it was under You give in the offer being countered, or it comes from the recipient's collection (see Offers name objekts on both sides). A copy listed only on hidden-serial lists can still be asked for as any copy.

Asking for any copy SHALL draw only on the copies the recipient's entries open, while the recipient still holds them, transferable and unreserved: an entry for the whole collection, on any list, opens every copy the recipient holds; otherwise the entries open the specific objekts they name, on a list that hides serials or on one that shows them. Copies the same offer asks for by serial SHALL not count toward its any-copy asks. The picker's "N available" and the most copies a request may ask for SHALL count only what is left.

An any-copy item SHALL read "Any serial · N available" in You get's picker and "Any serial · N held" in You give, N being the copies the holder spares. When the same copies are not also offered by serial, as on a list that hides serials, the picked item SHALL show a count from 1 up to N under its tile, with − and + buttons and "They choose the serial"; − at 1 takes it out, and + stops at N or at the side's 50. When the collection also has copies shown by serial, that count SHALL sit in the serial dialog (see Any serial in the serial dialog), the tile SHALL read "Any serial · N more", N counting only the copies no shown serial stands for, and serials checked beside it SHALL not lower N. When every copy the ask could take is also offered by serial, the item SHALL stay a single pick, the "Any serial" checkbox in the serial dialog, and more copies are picked by serial; a count above 1 already held there SHALL show as a count that can only come down. Each copy SHALL count toward the 50, and You get SHALL list the item once with "× N" when N is more than 1, as the sent offer's card does. The offer asks for each copy as its own item. When the holder now spares fewer copies than the count, the item SHALL read "Only N available" and block Send until the count comes down. On You give, a counter's any-copy ask for several copies SHALL take that many of the sender's own copies; when they hold fewer, the copies found and the rest still waiting SHALL each be removable on their own.

#### Scenario: Several copies of one collection
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on a list that hides serials, spares three copies, and the user picks it and presses + twice
- **THEN** the picker reads 3, + is disabled, You get shows "SeoYeon 204Z × 3", the side counts 3 of 50, and the offer asks for three copies

#### Scenario: Copies shown by serial
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on a list that shows serials, and spares three copies, #537, #812 and #904
- **THEN** the picker shows one SeoYeon 204Z tile reading "Choose from 3 serials", whose serial dialog holds an "Any serial" checkbox worth one copy with no count, then a row each for #537, #812 and #904, and the user checks exact serials for more

#### Scenario: Copies named on a list that shows serials
- **WHEN** rin.trades's sale list "spares", which shows serials, names SeoYeon 204Z #537, #812 and #904 by serial, and the user checks "Any serial" in its serial dialog and sends
- **THEN** the offer is sent asking for one copy of SeoYeon 204Z, which may be any of the three

#### Scenario: Any serial beside every serial
- **WHEN** a request asks for SeoYeon 204Z #537, #812 and #904 and one more copy of SeoYeon 204Z in any serial, and "spares" names only those three
- **THEN** the offer is refused naming SeoYeon 204Z, and nothing is sent

#### Scenario: One copy shown
- **WHEN** "spares" names only SeoYeon 204Z #537, and no other list of rin.trades's holds SeoYeon 204Z
- **THEN** the picker's SeoYeon 204Z tile reads "#537", choosing it picks #537 at once, and no "Any serial" is offered for it

#### Scenario: Collection at a hidden-serial address
- **WHEN** rin.trades has no list on Trade and holds three SeoYeon 204Z at a linked address that hid serials before this change
- **THEN** the collection picker shows one SeoYeon 204Z tile, its serial dialog lists each copy by serial with no "Any serial", and a request for #537 by its objekt id is sent

#### Scenario: Hidden list in the picker
- **WHEN** rin.trades's have list hides serials and lists SeoYeon 204Z #537, and the user opens You get
- **THEN** the picker shows SeoYeon 204Z as "Any serial · 1 available", with no serial and no specific copies

#### Scenario: Same collection on a visible list
- **WHEN** rin.trades also lists SeoYeon 204Z #812 and #904 on a sale list that shows serials
- **THEN** the picker shows one SeoYeon 204Z tile reading "Choose from 2 serials" and "Any serial · 1 more", and its serial dialog shows the "Any serial" count for the hidden list's entry, with no serial, above the rows for #812 and #904

#### Scenario: Serials checked beside the hidden count
- **WHEN** rin.trades's hidden-serial list names two SooMin 204Z, its sale list "spares" shows SooMin 204Z #615 and #1077, and the user checks both serials in the serial dialog
- **THEN** the "Any serial" count still goes up to 2, and with it at 2 the offer asks for four copies of SooMin 204Z and is sent

#### Scenario: Listed one, holds three
- **WHEN** rin.trades's hidden-serial list names one SeoYeon 204Z, and rin.trades holds three spare copies, none listed elsewhere
- **THEN** the picker shows "Any serial · 1 available", its count stops at 1, and a request for two copies is refused

#### Scenario: Listed token gone
- **WHEN** the only SeoYeon 204Z a hidden-serial list names has left rin.trades's wallet
- **THEN** the picker shows no SeoYeon 204Z from that list, even if rin.trades holds other copies

#### Scenario: Specific request through the API
- **WHEN** a request asks for SeoYeon 204Z #537 by its objekt id, and it is listed only on rin.trades's hidden-serial list
- **THEN** the offer is refused as unlisted, and nothing is sent

#### Scenario: Counter keeps a shown objekt
- **WHEN** rin.trades offers SeoYeon 204Z #537 under You give, and the user counters, keeping it under You get
- **THEN** the counter is sent, even though #537 is on a hidden-serial list

### Requirement: Picks in the builder
Each side of the offer builder SHALL show its picks as a grid of small cards, as many a row as the side's width allows (six at 1280 px, four on a phone), each with its art, collection code and serial (or its any-copy count) and a remove button named for the objekt. The grid SHALL grow with the page rather than scroll inside its side; the column keeps the top-up, the note and Send in reach whatever the count, and on a phone Send stays in the bottom bar. A pick's warnings SHALL show with its card. Each copy picked by serial SHALL keep a card of its own, however it was picked. A collection's cards SHALL sit together, its any-copy card first and then its serials in ascending order, the collections in the order they joined the side.

#### Scenario: Serials picked in one dialog
- **WHEN** the sender checks SeoYeon 204Z #904 and #537 in the serial dialog, confirms, and chooses Done
- **THEN** You get shows two cards side by side, SeoYeon 204Z #537 then #904, each with its own remove button, and the side counts 2

#### Scenario: Any card first
- **WHEN** You get holds SooMin 204Z #1077 and then two copies of SooMin 204Z in any serial
- **THEN** the SooMin 204Z card marked "×2" comes first, then #1077

#### Scenario: Large offer
- **WHEN** the sender holds 24 picks under You give and 31 under You get
- **THEN** each side shows its picks six a row at 1280 px, the page scrolls to show them all, and the column with the top-up, note and Send stays on screen

#### Scenario: Remove one
- **WHEN** the sender chooses the remove button on SeoAh 203Z #722
- **THEN** that pick leaves the side, and the side's count drops by one

#### Scenario: Several copies
- **WHEN** You get holds 3 copies of Lynn 301A in any serial
- **THEN** one card shows Lynn 301A marked "×3"

### Requirement: Ratio hint in the builder
In the offer builder, a get-side item drawn from an entry of the partner's have list that carries a ratio, its own or its list's, SHALL show the ratio chip with "They ask N for this", in the picker and once picked. In the picker, a collection's tile SHALL carry the chip when every copy it stands for, any serial included, asks the same ratio, and the serial dialog's header SHALL repeat it; otherwise the tile SHALL carry none, and each row of the serial dialog, and its "Any serial" control, SHALL carry its own. The hint SHALL NOT block sending, change what is added when the builder opens, or warn about the counts on either side.

#### Scenario: Picking an item with a ratio
- **WHEN** the viewer opens the builder with jinsoul.blue, whose have list holds Lynn SCO with ratio 2, and picks it
- **THEN** the tile reads "1:2" with "They ask 2 for this", and the offer can be sent with any number of items on the give side

#### Scenario: No ratio
- **WHEN** a picked item's entry has no ratio
- **THEN** no chip shows

#### Scenario: Every copy asks the same ratio
- **WHEN** rin.trades's have list "doubles" asks ratio 2 for Lynn 312Z #301, #455 and #1290
- **THEN** the Lynn 312Z tile reads "Choose from 3 serials" with the "1:2" chip, and the serial dialog's header carries the same chip

#### Scenario: Copies ask different ratios
- **WHEN** "doubles" asks ratio 2 for KimLip 108Z #133, and the sale list "spares" holds KimLip 108Z #2048 with no ratio
- **THEN** the KimLip 108Z tile carries no chip, the row for #133 in the serial dialog carries "1:2", the row for #2048 carries none, and once picked the #133 card carries "1:2"

### Requirement: Offer page on a phone
Below `lg`, the page SHALL stack the title, the status line, You get, You give, the top-up and the note, with Send and the send hint in a bottom bar, and the picker, and the serial dialog over it, SHALL take the full screen. The page SHALL not scroll sideways.

#### Scenario: Phone
- **WHEN** the sender opens the offer page at 390 px
- **THEN** the sides stack, Send sits in the bottom bar, and Add opens the picker full screen

#### Scenario: Serial dialog on a phone
- **WHEN** the sender opens HeeJin 101Z's serial dialog at 390 px
- **THEN** it covers the whole screen over the picker, its description is read to assistive technology only, Select all and Clear stay under the header while the rows scroll, each row is at least 44 px tall, and the footer is one row: the picked count, Cancel and the confirm button

## ADDED Requirements

### Requirement: Copies grouped by collection in the pickers
Each picker (You give, and You get over lists or over a collection) SHALL show one tile per collection, standing for every copy of it the picker shows. A collection with exactly one copy shown by serial and none reached only in any serial SHALL toggle that copy at once. One whose copies are all in any serial SHALL pick one copy and show the count under it. Any other SHALL open the serial dialog over the picker, which stays a side sheet.

#### Scenario: Several copies
- **WHEN** rin.trades's have list "doubles" shows serials and lists twelve HeeJin 101Z, and the sender opens You get's picker
- **THEN** HeeJin 101Z is one tile reading "Choose from 12 serials", and choosing it opens its serial dialog over the picker

#### Scenario: One copy
- **WHEN** rin.trades's sale list "spares" lists HyeRin 301Z #1203 and no other HyeRin 301Z, and the sender chooses its tile
- **THEN** the tile reads "#1203", #1203 is picked with a check on the card, and choosing the tile again unpicks it

#### Scenario: Serials hidden
- **WHEN** rin.trades's list "quiet haves" hides serials and lists three ChaeYeon 105Z, and the sender chooses its tile
- **THEN** the tile reads "Any serial · 3 available", one copy is picked, the count under the tile reads 1 with "They choose the serial", and focus stays on the tile

#### Scenario: One shown copy and hidden copies
- **WHEN** "spares" lists SooMin 204Z #615, and "quiet haves" lists two SooMin 204Z
- **THEN** the SooMin 204Z tile reads "Choose from 1 serial" and "Any serial · 2 more", and choosing it opens the serial dialog

#### Scenario: Your own copies
- **WHEN** the sender holds Mayu 210Z #57, #212 and #498 and opens You give's picker
- **THEN** Mayu 210Z is one tile reading "Choose from 3 serials", and its serial dialog offers no "Any serial"

### Requirement: Grouped tile lines
Under its collection label, a tile that opens the serial dialog SHALL read "Choose from N serials" ("Choose from 1 serial"), N counting the available copies shown by serial, until one is picked; then "{picked} of {count} picked", or "All {count} picked" once every available copy is, any serial counting in both. A mark on its card SHALL show how many are picked. The tile's accessible name SHALL be its label and its first line.

#### Scenario: Partly picked
- **WHEN** rin.trades lists five SeoYeon 204Z by serial on "doubles", and the sender has picked #537 and #904
- **THEN** the tile reads "2 of 5 picked", its card is marked "2", and it is named "SeoYeon 204Z, 2 of 5 picked"

#### Scenario: All picked
- **WHEN** the sender has picked JiWoo 207Z #221, #640 and #1002, the only three on rin.trades's lists
- **THEN** the tile reads "All 3 picked" and its card is marked "3"

#### Scenario: Any serial counted
- **WHEN** SooMin 204Z has #615 and #1077 on "spares" and two copies on "quiet haves", and the sender has checked #615 and set "Any serial" to 1
- **THEN** the tile reads "2 of 4 picked"

### Requirement: Copies that can't be offered on a tile
A copy that is not transferable or in a trade in progress can't be offered. A tile for one such copy SHALL show its serial and its flag, stay focusable, and do nothing when chosen. A tile for several copies SHALL add "{count} can't be offered" for those, read "None available" when none is left, and still open the serial dialog, read-only then. A copy in another of the sender's open offers stays pickable, its warning on its row, or on the tile that stands for it alone.

#### Scenario: Some copies can't be offered
- **WHEN** rin.trades lists YooYeon 310Z #44, #318, #702, #955 and #1460 on "spares", #318 is not transferable and #702 is in a trade in progress
- **THEN** the tile reads "Choose from 3 serials" and "2 can't be offered", and in the serial dialog the rows for #318 and #702 read "Not transferable" and "In a trade in progress" and can't be checked

#### Scenario: One copy in a trade
- **WHEN** rin.trades's only JinSoul 203Z, #77, is in a trade in progress
- **THEN** the tile reads "#77" and "In a trade in progress", and choosing it does nothing

#### Scenario: None left
- **WHEN** both copies of a collection rin.trades lists by serial are in trades in progress
- **THEN** the tile reads "None available" and "2 can't be offered", and its serial dialog shows both rows unchecked and disabled, with the confirm button disabled

#### Scenario: Copy in another open offer
- **WHEN** HeeJin 101Z #588, one of twelve on "doubles", is in the sender's open offer O-874
- **THEN** the HeeJin 101Z tile shows no warning, the row for #588 reads "Also in your open offer O-874" and can be checked, and once picked its card in the builder shows the same warning

### Requirement: Serial dialog
The serial dialog SHALL be a modal over the picker, titled with the collection, under it its artist and season and, in You get, the names of the lists its copies come from. It SHALL list each copy shown by serial as a checkbox row, the whole row its target, in ascending serial order, with its serial and, when they apply, its list (when the copies span lists), its ratio (when ratios differ) and its flag. It SHALL open with the picker's current picks of those copies checked.

#### Scenario: Opening
- **WHEN** the sender chooses the HeeJin 101Z tile in You get's picker, its twelve copies all on "doubles"
- **THEN** the dialog is titled "HeeJin 101Z", reads "ARTMS · Atom01 · doubles" and "Pick the copies you want from rin.trades.", lists #8 to #1499 in ascending order, and focus is on the first row that can be checked

#### Scenario: Your own copies
- **WHEN** the sender chooses the Mayu 210Z tile in You give's picker
- **THEN** the dialog reads "tripleS · Binary01" and "Pick the copies you'll give.", with a row for each of the sender's copies

#### Scenario: Copies on two lists
- **WHEN** rin.trades lists KimLip 108Z #133 on "doubles" and #2048 on "spares"
- **THEN** the dialog reads "ARTMS · Atom01 · doubles, spares", and its rows read "#133 · doubles" and "#2048 · spares"

#### Scenario: Estimated serials
- **WHEN** the four Nien 402Z copies rin.trades lists have estimated serials
- **THEN** the rows read "~#12", "~#57", "~#88" and "~#140", each read as "estimated #12" and so on, and the dialog says once below the rows "~ marks a serial we estimated. Cosmo may show a different number, so check the objekt in Cosmo before you send it."

#### Scenario: Reopening
- **WHEN** the sender has picked SeoYeon 204Z #537 and #904 and chooses its tile again
- **THEN** the dialog opens with #537 and #904 checked

### Requirement: Select all and Clear
The serial dialog SHALL offer "Select all", which checks each available row not yet checked, in order, until the side is full, and leaves "Any serial" as it is, except that a checked "Any serial" over shown copies only is unchecked once every available row is checked, as when the last row is checked by hand; and "Clear", which unchecks every row and sets "Any serial" to none. "Select all" SHALL be disabled when every available row is checked, and "Clear" when nothing in the dialog is picked.

#### Scenario: Select all
- **WHEN** the sender opens the YooYeon 310Z dialog, three of whose five copies can be offered, and chooses "Select all"
- **THEN** #44, #955 and #1460 are checked, the other two stay unchecked, and "Select all" is disabled

#### Scenario: Select all with Any serial checked
- **WHEN** a collection's three copies are all shown by serial, "Any serial" is checked, and the sender chooses "Select all"
- **THEN** the three serials are checked and "Any serial" is unchecked, since no copy is left for it

#### Scenario: Clear
- **WHEN** the dialog has two rows checked and "Any serial" set to 1, and the sender chooses "Clear"
- **THEN** nothing is checked, "Any serial" is at none, and "Clear" is disabled

### Requirement: Any serial in the serial dialog
In You get over lists, the serial dialog SHALL put an "Any serial" control above the rows when the collection allows one: a count from 0 to N with − and +, reading "They choose the serial · N available", when copies only any serial reaches remain (see Hidden serials stay hidden in offers); else a checkbox worth one copy, reading "They choose the serial", when two or more shown copies are available. You give and the collection picker SHALL offer none.

#### Scenario: Checkbox worth one copy
- **WHEN** rin.trades lists five SeoYeon 204Z by serial on "doubles", and the sender checks "Any serial" in its dialog
- **THEN** the footer reads "1 of 5 picked", and the confirm button reads "Pick 1 copy"

#### Scenario: Every serial checked
- **WHEN** "Any serial" is checked and the sender checks all five SeoYeon 204Z serials
- **THEN** "Any serial" unchecks itself and is disabled, and the footer reads "5 of 5 picked"

#### Scenario: Count for copies only any serial reaches
- **WHEN** the sender opens the SooMin 204Z dialog, with #615 and #1077 on "spares" and two copies on "quiet haves"
- **THEN** "Any serial" is a count from 0 to 2 reading "They choose the serial · 2 available", its buttons named "One fewer copy of SooMin 204Z" and "One more copy of SooMin 204Z" and its field "Any serial of SooMin 204Z"

#### Scenario: One available copy
- **WHEN** rin.trades lists JiWoo 207Z #221 and #640 by serial, and #640 is in a trade in progress
- **THEN** the JiWoo 207Z dialog offers no "Any serial"

#### Scenario: A count held from before
- **WHEN** You get holds three copies of SeoYeon 204Z in any serial from a whole-collection entry on "doubles", which shows serials, and the sender opens its dialog
- **THEN** "Any serial" shows as a count at 3 whose + is disabled, so it can only come down

### Requirement: Confirming or leaving the serial dialog
The serial dialog's footer SHALL read "{picked} of {count} picked" and "{count} of 50 on this side", with Cancel and a confirm button reading "Pick 1 copy" or "Pick {count} copies"; with nothing picked, "Remove all" when the collection had picks, else a disabled "Pick copies". Confirming SHALL set the picks of the copies the dialog shows in the picker's selection, and Done writes them to the builder. Enter SHALL never confirm: Space checks a row.

#### Scenario: Confirm
- **WHEN** the sender checks SeoYeon 204Z #537 and #812 and chooses "Pick 2 copies"
- **THEN** the dialog closes, focus is on the SeoYeon 204Z tile, which reads "2 of 5 picked", the picker's footer counts the two, and the builder's You get is unchanged until Done

#### Scenario: Remove all
- **WHEN** the sender opens the dialog with #537 and #904 picked, unchecks both, and chooses "Remove all"
- **THEN** SeoYeon 204Z has no picks, and its tile reads "Choose from 5 serials"

#### Scenario: Dismissed
- **WHEN** the sender checks #812 and then presses Escape, chooses Cancel or Close, or clicks outside the dialog
- **THEN** the dialog closes without #812, the picker stays open, and focus is on the tile that opened it

#### Scenario: Escape with the dialog open
- **WHEN** the serial dialog is open over the picker and the sender presses Escape once
- **THEN** only the dialog closes

### Requirement: Side limit in the serial dialog
The serial dialog's room SHALL be 50 less the side's other picks in the picker. When its picks reach the room, each unchecked available row, an unchecked "Any serial", the count's + and "Select all" SHALL be disabled, and the footer SHALL read "This side is full. Remove one to pick another." On a full side, a tile with no picks SHALL do nothing when chosen; a tile with picks SHALL open the dialog, where copies can only be taken out.

#### Scenario: Room runs out
- **WHEN** the side holds 47 other picks and the sender chooses "Select all" in the twelve-copy HeeJin 101Z dialog
- **THEN** #8, #73 and #140 are checked, every other row is disabled, and the footer reads "This side is full. Remove one to pick another."

#### Scenario: Full side
- **WHEN** You get holds 50, two of them SeoYeon 204Z serials
- **THEN** choosing an unpicked tile does nothing, and the SeoYeon 204Z dialog lets the sender uncheck its two rows but check none

### Requirement: Serial dialog across posts
A tile SHALL stand for the copies the picker shows: with You get fixed to one post, or narrowed by List, only that list's, "Any serial" included. Confirming SHALL change only the picks of the copies the dialog shows, so a pick of the same collection from another list stays, and the builder marks it as it does now.

#### Scenario: One post
- **WHEN** rin.trades takes asks from one post, Offer on reads "doubles", and rin.trades lists SeoYeon 204Z #537 and #812 on "doubles" and #904 on "spares"
- **THEN** the SeoYeon 204Z tile reads "Choose from 2 serials", its dialog reads "tripleS · Cream01 · doubles" with rows for #537 and #812 only, and its "Any serial" asks for one of those two

#### Scenario: Across posts
- **WHEN** rin.trades takes asks across posts and the sender opens You get's picker on All their lists
- **THEN** the SeoYeon 204Z tile reads "Choose from 3 serials", and the rows read "#537 · doubles", "#812 · doubles" and "#904 · spares"

#### Scenario: A pick from another post stays
- **WHEN** the sender picked #904 from "spares", changed Offer on to "doubles", and confirms #537 in the SeoYeon 204Z dialog
- **THEN** You get holds #537 and #904, and #904 is outlined with "Not on doubles"

### Requirement: Picks made outside the picker
Picks the builder opens with or gains outside the picker (matches added when the builder opens, near matches, Make offer for one objekt of a post, a Market listing, a counter) SHALL stay one pick per copy or one any-copy pick, chosen by the rules they follow now. The grouped picker SHALL show each as its own: a copy as a checked row or a picked tile, an any-copy pick as its count or its checked "Any serial".

#### Scenario: Match asks for the lowest serial
- **WHEN** rin.trades lists HaSeul 302Z #88 and #140 by serial on "doubles", both sendable, and the builder opens with the matches
- **THEN** You get holds #88, and its HaSeul 302Z tile reads "1 of 2 picked" with #88 checked in the dialog

#### Scenario: Match through a list that shows serials
- **WHEN** rin.trades lists SooMin 204Z #615 and #1077 on "spares" and two more on "quiet haves", which hides serials, and the builder opens with a match that runs through "spares" only
- **THEN** You get holds #615, not a copy in any serial

#### Scenario: One objekt of a post
- **WHEN** "doubles" names SeoYeon 204Z #12 and #40, #12 is in a trade in progress, and the sender starts from Make offer for this objekt on SeoYeon 204Z
- **THEN** You get holds #40, and its dialog opens with #40 checked

#### Scenario: Counter with an any-copy ask
- **WHEN** the sender counters an offer whose You get holds two ChaeYeon 105Z in any serial from "quiet haves"
- **THEN** the ChaeYeon 105Z tile shows its count at 2, and the builder lists it once with "× 2"
