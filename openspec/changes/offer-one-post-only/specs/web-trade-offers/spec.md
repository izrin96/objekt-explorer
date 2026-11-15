## MODIFIED Requirements

### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists bound to a Cosmo profile and put on Trade (idle or not), at any of the recipient's linked addresses. A bound list kept off Trade SHALL not be asked from. When the recipient has no such list and has "Let people ask for anything I hold" on (see `web-account`; off by default), each MAY instead come from what the recipient holds at any of their linked addresses (their collection): a specific objekt only, never any copy, since every copy there shows its serial. With no such list and the setting off, nothing SHALL be asked for, and an offer MAY still give objekts or a top-up. This is checked when the offer is sent: once the recipient has such a list, only its entries can be asked for, and every ask SHALL come from one of those lists (see One post per offer).

Where an offer starts (a Trade row, a Market listing, a conversation) SHALL not narrow which of the recipient's posts may be asked from: it only sets the post Offer on opens on (see Where Offer on opens), and the sender MAY choose another.

A counter-offer MAY also ask for any objekt the recipient listed under You give in the offer it counters, since the recipient already offered it.

An offer SHALL hold at least one objekt, and at most 200 on each side. On the offer card, a side longer than 6 SHALL show the first 6 and a control to show the rest. Either side may be empty. An offer MAY carry:
- a money top-up with an amount, a currency and which side pays, always shown as "paid outside, not verified";
- a note of up to 280 characters.

#### Scenario: Swap with a top-up
- **WHEN** a user offers HyeRin 301Z #1203 for rin.trades's SeoYeon 204Z #537, adding 1,000 KRW paid by the user
- **THEN** rin.trades sees an offer card with both objekts and "+ 1,000 KRW · paid outside, not verified"

#### Scenario: Cash buy
- **WHEN** a user offers nothing on the give side for SeoYeon 204Z #537, plus 6,000 KRW paid by the user
- **THEN** the offer is sent with an empty You give side

#### Scenario: Unlisted objekt
- **WHEN** a request asks for an objekt that is on none of the recipient's allowed lists
- **THEN** the offer is refused, and nothing is sent

#### Scenario: Ask from a collection with no lists
- **WHEN** rin.trades has no have or sale list on Trade and lets people ask for anything they hold, and the user asks for SeoYeon 204Z #537, which rin.trades holds at a linked address with a public profile
- **THEN** the offer is sent

#### Scenario: Collection ask by default
- **WHEN** rin.trades has no have or sale list on Trade and never turned on Let people ask for anything I hold, and the user asks for SeoYeon 204Z #537, which rin.trades holds
- **THEN** the offer is refused as unlisted, and nothing is sent

#### Scenario: Giving to someone with no lists
- **WHEN** rin.trades has no have or sale list on Trade and the setting off, and the user offers HyeRin 301Z #1203 for 6,000 KRW paid by rin.trades
- **THEN** the offer is sent

#### Scenario: Collection ask once they list
- **WHEN** rin.trades makes a bound have list shown on Trade while the user's builder, opened before it, asks for an objekt from rin.trades's collection that is not on that list
- **THEN** the send is refused as unlisted, and nothing is sent

#### Scenario: Private profile
- **WHEN** rin.trades has no list on Trade, lets people ask for anything they hold, and holds SeoYeon 204Z only at a linked address that was private before this change
- **THEN** the picker shows it, and a request for it is sent

#### Scenario: Counter keeps their objekt
- **WHEN** rin.trades offers HyeRin 301Z #1203, which is on none of their lists, and the user counters, keeping it under You get and adding a top-up
- **THEN** the counter is sent

#### Scenario: Post offer asks from another list
- **WHEN** a user makes an offer on rin.trades's post for the have list "doubles" and asks for SeoYeon 204Z #537, which is only on rin.trades's sale list "spares"
- **THEN** the offer is refused as from another post, and nothing is sent

#### Scenario: Post offer moved to another post
- **WHEN** a user starts an offer from rin.trades's post "doubles", changes Offer on to "spares", and asks for SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is sent, on "spares": the post it started from only chose where Offer on opens

#### Scenario: Post offer from a want list
- **WHEN** a user makes an offer from rin.trades's WTB post, whose list is a want list, with Offer on set to rin.trades's sale list "spares", asking for SeoYeon 204Z #537 from "spares"
- **THEN** the offer is sent on "spares", as from a conversation

#### Scenario: Want-only post with no lists to ask from
- **WHEN** a user makes an offer from rin.trades's WTT post that has only a want list, rin.trades has no have or sale list on Trade and lets people ask for anything they hold, and the user asks for an objekt rin.trades holds at a linked address with a public profile
- **THEN** the offer is sent, as an ask from rin.trades's collection

#### Scenario: Conversation after a post offer
- **WHEN** a user's offer from rin.trades's post for "doubles" opened their conversation, and rin.trades counters from the conversation
- **THEN** the counter may ask from any one of the user's have and sale lists on Trade, as in any conversation, all its new asks from that one list

#### Scenario: Recipient takes asks from one post
- **WHEN** rin.trades has "doubles" and "spares" on Trade, and a user makes an offer on "doubles" asking for one objekt on "doubles" and SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is refused as from another post, naming #537

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed entries of the post chosen under Offer on, labelled "Add from {post}" (see Choosing the post); or, when the partner has no have or sale list bound to a Cosmo profile and on Trade and lets people ask for anything they hold, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first; or, when they have no such list and don't allow that, no Add picker, and a line saying {name} has nothing on Trade to ask for and that the sender can still offer objekts or a top-up;
- the top-up and the note.

You get's picker over lists SHALL show the post chosen under Offer on, which opens as Where Offer on opens says: on the listing's sale list when opened from a Market listing.

Each picker SHALL show one tile per collection (see Copies grouped by collection in the pickers). Each pickable copy SHALL show its flags (not transferable, reserved, in another of the user's own open offers): on its tile when the tile stands for that one copy, else on its row in the serial dialog (see Serial dialog), with the tile counting the copies that can't be offered. Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch; and SHALL load more as it scrolls, up to 200 objekts at a time, so a long list does not land at once. A page SHALL end where a collection ends: a collection's copies SHALL never be split across two pages, and a collection with more than 200 copies SHALL be a page of its own. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

Below `sm`, each picker SHALL keep only its search field and a Filters button in view, the button counting the filters, List and matching switch that are set; choosing it SHALL show those controls in place. Its description SHALL be read to assistive technology only, and its footer SHALL be one row: the picked count, Cancel and Done.

You give's picker SHALL offer a **List** choice, after the filters: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, each shown with its list type badge, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of List.

You get's picker over lists SHALL offer no **List** choice: it shows only the entries of the post chosen under Offer on that the sender may ask for, and the filters and the matching switch apply on top of it. Another of the partner's posts is reached by changing Offer on.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or nothing on the post is available, since what they listed was traded away or can't be transferred. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters. In either picker, when the matching switch is on and no other filter is set, "nothing matches the filters" SHALL instead say that nothing held is on the other side's want lists ("rin.trades holds nothing on your want lists" in You get, "You hold nothing on rin.trades's want lists" in You give) and offer Turn off for the switch.

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
- **WHEN** the partner has one bound have list "doubles" on Trade
- **THEN** the builder reads "Offer on doubles", You get's button reads "Add from doubles", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's Trade row, whose lead post is "doubles"
- **THEN** Offer on reads "doubles", You get's button reads "Add from doubles", and its picker shows only the entries of "doubles", with no List choice

#### Scenario: A list kept off Trade
- **WHEN** rin.trades has the bound have list "doubles" on Trade and the bound have list "private" off Trade
- **THEN** the builder reads "Offer on doubles", You get's picker shows "doubles" only, and an offer asking for an entry only on "private" is refused when sent

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's WTB post, and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on reads "doubles" and offers "spares", You get's button reads "Add from doubles", and its picker shows the entries of "doubles" only

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
- **WHEN** rin.trades has exactly one have or sale list on Trade
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
- **WHEN** the sender opens You get's picker at 390 px with "Only what I want" on
- **THEN** the search field and "Filters 1" sit on one row above the grid, the footer is one row, and choosing Filters shows the filters and the switch, with no List

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry of the post under Offer on the sender may ask for

#### Scenario: A collection's copies on one page
- **WHEN** the sender holds one copy each of 199 collections, all received after their newest JiWoo 207Z, and three JiWoo 207Z, and opens You give's picker with All your objekts
- **THEN** the first page holds the 199 and no JiWoo 207Z, and the next page holds all three JiWoo 207Z in one tile

### Requirement: Hidden serials stay hidden in offers
When an entry on the recipient's list comes from a list that hides serial numbers, the offer builder's You get picker SHALL offer it only as "any copy" of its collection. Neither that entry nor the recipient's other copies of the collection SHALL be shown or pickable by serial through that entry.

A request asking for a specific objekt SHALL be refused unless that objekt is reachable through an entry on a list that shows serials, or it was under You give in the offer being countered, or it comes from the recipient's collection (see Offers name objekts on both sides). A copy listed only on hidden-serial lists can still be asked for as any copy.

Asking for any copy SHALL draw only on the copies the entries of the list the offer asks from open (see One post per offer), while the recipient still holds them, transferable and unreserved: an entry for the whole collection, on any list, opens every copy the recipient holds; otherwise the entries open the specific objekts they name, on a list that hides serials or on one that shows them. Copies the same offer asks for by serial SHALL not count toward its any-copy asks. The picker's "N available" and the most copies a request may ask for SHALL count only what is left.

An any-copy item SHALL read "Any serial · N available" in You get's picker and "Any serial · N held" in You give, N being the copies the holder spares. When the same copies are not also offered by serial, as on a list that hides serials, the picked item SHALL show a count from 1 up to N under its tile, with − and + buttons and "They choose the serial"; − at 1 takes it out, and + stops at N or at the side's 200. When the collection also has copies shown by serial, that count SHALL sit in the serial dialog (see Any serial in the serial dialog), the tile SHALL read "Any serial · N more", N counting only the copies no shown serial stands for, and serials checked beside it SHALL not lower N. When every copy the ask could take is also offered by serial, the item SHALL stay a single pick, the "Any serial" checkbox in the serial dialog, and more copies are picked by serial; a count above 1 already held there SHALL show as a count that can only come down. Each copy SHALL count toward the 200, and You get SHALL list the item once with "× N" when N is more than 1, as the sent offer's card does. The offer asks for each copy as its own item. When the holder now spares fewer copies than the count, the item SHALL read "Only N available" and block Send until the count comes down. On You give, a counter's any-copy ask for several copies SHALL take that many of the sender's own copies; when they hold fewer, the copies found and the rest still waiting SHALL each be removable on their own.

#### Scenario: Several copies of one collection
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on a list that hides serials, spares three copies, and the user picks it and presses + twice
- **THEN** the picker reads 3, + is disabled, You get shows "SeoYeon 204Z × 3", the side counts 3 of 200, and the offer asks for three copies

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
- **WHEN** rin.trades also lists SeoYeon 204Z #812 and #904 on the sale list "spares", which shows serials, and the sender changes Offer on to "spares"
- **THEN** the picker shows one SeoYeon 204Z tile reading "Choose from 2 serials", with no "Any serial · 1 more" for the hidden list's entry, and its serial dialog holds an "Any serial" checkbox worth one copy above the rows for #812 and #904

#### Scenario: Serials checked beside the hidden count
- **WHEN** rin.trades's hidden-serial list "quiet haves" names two SooMin 204Z, its sale list "spares" shows SooMin 204Z #615 and #1077, and a request on "spares" asks for #615, #1077 and two more copies of SooMin 204Z in any serial
- **THEN** the offer is refused naming SooMin 204Z, and nothing is sent: the two copies only "quiet haves" opens are on another post

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

### Requirement: Picks that can't be sent
A pick that can't be sent (not on their lists, not on their wants, not on the offer's post, in a trade in progress, not transferable, more copies than are spare, or refused when sent) SHALL be outlined and name its reason under its card. Its side SHALL carry a banner counting such picks, with their reasons, and Remove them, which takes only those picks out. The footer SHALL say why Send is disabled while any remain.

#### Scenario: Two blocked
- **WHEN** You get holds 31 picks, one no longer on the partner's lists and one in a trade in progress
- **THEN** both cards are outlined with their reasons, You get's banner reads that 2 can't be offered, and Send is disabled with the footer saying why

#### Scenario: Remove them
- **WHEN** the sender chooses Remove them in that banner
- **THEN** the two picks leave You get, the other 29 stay, and the banner goes away

#### Scenario: Refused on send
- **WHEN** the server refuses the offer naming one objekt as no longer owned
- **THEN** that card is outlined as refused and counted in its side's banner

#### Scenario: Not on their wants
- **WHEN** the server refuses the offer as not wanted, naming one You give objekt
- **THEN** that card is outlined with "Not on their wants" and counted in You give's banner

#### Scenario: Not on the post
- **WHEN** the server refuses the offer as from another post, naming one You get objekt
- **THEN** that card is outlined with "Not on {list}" and counted in You get's banner, and the error notice reads "An offer asks from one post. On another of their posts: {objekts}"

### Requirement: Matches added when the builder opens
Opened from a Trade row's Make offer, the builder SHALL add the sender's matches with the partner before it shows its sides, chosen by the rule the row's chip follows (see `web-trade-browse` Matches to the signed-in viewer):
- when the sender can swap with the partner (the row reads "You can swap N"), only the matches inside the pair of posts that score counts: You give gets one copy of each collection on the sender's post there that the partner's post wants, and You get one of each on the partner's post there that the sender's post wants;
- otherwise, only the direction with more matches, swaps and sales alike: one copy of each collection the sender has that the partner wants under You give, or one of each the partner has that the sender wants under You get, the latter only from one of the partner's posts (see Row matches from one post), the other side left empty. When both directions match equally, You get SHALL be filled.

The matches SHALL be read live, by the rules and the Compare with list the row counts with, up to 200 a side. You get's picker offers the post Offer on opens on, and the sender MAY change it to another of the partner's posts (see Choosing the post).

#### Scenario: A person the sender can swap with
- **WHEN** the sender's post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", jun.p's post holds Hyerin 302Z and wants Yooyeon 205Z, jun.p also holds 3 DCOs that the sender's other post P1 wants through its rule, and the sender chooses Make offer on jun.p's row, which reads "You can swap 1"
- **THEN** the builder opens with Yooyeon 205Z under You give and Hyerin 302Z under You get, and none of the DCOs

#### Scenario: A person who matches both ways across posts
- **WHEN** mina.k holds 2 DCOs on her have list "dco spares" that the sender's post P1 wants through its rule and wants Yooyeon 205Z from the sender's post P2, so her row reads "They have 2 you want · You have 1 they want" with no Can swap mark, and the sender chooses Make offer on her row
- **THEN** the builder opens with the 2 DCOs under You get and nothing under You give, Offer on reads "dco spares", and the line reads "Added from dco spares: 2 you get"

#### Scenario: From a Trade row
- **WHEN** rin.trades's row reads "They have 5 you want · You have 3 they want" with no Can swap mark, all 5 on rin.trades's "doubles", and the sender chooses Make offer on it
- **THEN** the builder opens with 5 under You get and nothing under You give

#### Scenario: Equal both ways
- **WHEN** a person's row reads "They have 2 you want · You have 2 they want" with no Can swap mark, both they have on one post, and the sender chooses Make offer on it
- **THEN** the builder opens with 2 under You get and nothing under You give

#### Scenario: Under Compare with
- **WHEN** the sender has Compare with set to their want list "ARTMS wants" on Browse, and chooses Make offer on rin.trades's row, which reads "They have 3 you want" only, all 3 on "doubles"
- **THEN** You get holds only the collections on "ARTMS wants" that rin.trades has, as the row counted them

#### Scenario: Over the limit
- **WHEN** the sender can swap with rin.trades inside one pair of posts, the sender's post there has 210 collections rin.trades's post wants, and rin.trades's post has 5 the sender's post wants
- **THEN** You give holds 200 of them, the line says more matched than fit, and the side limit doesn't keep Send disabled

#### Scenario: Adding what was left out
- **WHEN** the builder opened for mina.k with only You get filled
- **THEN** the sender can still add Yooyeon 205Z, or anything else on their lists, under You give, and the offer sends with it

### Requirement: Matches of one post
From Make offer on this post, or a conversation whose newest card is the partner's post card with a match, the builder SHALL add only matches through that post's lists: under You get those on its have or sale list, under You give those on its want list. When the sender can swap with the partner and that post is the partner's half of the pair the score counts, the builder SHALL add that pair's matches, as from the row; otherwise it SHALL add only the direction with more of the post's matches, You get on a tie. Offer on SHALL open on the post's have or sale list, as from a Market listing; for a post with none, as Where Offer on opens says. You get's picker shows the post under Offer on, and an ask from another post is refused (see One post per offer). The line SHALL name the post's list.

#### Scenario: One post of two
- **WHEN** rin.trades has the WTT post "doubles" and "wants", and the WTS post "spares", open to swaps, which reads "2 you want", rin.trades's row reads "You can swap 3" through "doubles" and the sender's post "extras" and "binary hunt", and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 3 the pair swaps under each side, none from "spares" or through the sender's other posts, the line reads "Added from doubles: 3 you give and 3 you get", and Offer on reads "doubles"

#### Scenario: A post that matches both ways across the sender's posts
- **WHEN** rin.trades's WTT post "doubles" has 2 collections the sender's post P1 wants and wants 1 on the sender's post P2, rin.trades is not Can swap through it, and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and the line reads "Added from doubles: 2 you get"

#### Scenario: Another post of a Can swap person
- **WHEN** rin.trades's row reads "You can swap 3" through the post "doubles", rin.trades also has the WTS post "spares", open to swaps, which reads "2 you want", and the sender chooses Make offer on this post on "spares"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and none from "doubles"

#### Scenario: WTB post
- **WHEN** jun.k has the WTT post "extras" and the WTB post "hunting", which reads "2 you have", and the sender chooses Make offer on this post on "hunting"
- **THEN** the builder opens with 2 under You give, nothing under You get, the line "Added from hunting: 2 you give", and Offer on on jun.k's first have or sale list, "extras"

#### Scenario: From a conversation with a post card
- **WHEN** the sender opens Make offer in their conversation with rin.trades, whose newest card is the post card for "doubles" with "They have 2 you want"
- **THEN** the builder opens with the matches through "doubles" and its want list read now, chosen by the same rule, which may differ from the 2 saved on the card, and the line names "doubles"

#### Scenario: Asking past the post
- **WHEN** the builder opened from "doubles" with its matches under You get, and a request sends them with an objekt only on "spares"
- **THEN** the offer is refused as from another post, naming that objekt, and nothing is sent

### Requirement: The added-matches line
When matches were added, the status line SHALL say how many it added to each side, with Remove matches, its counts fixed when the builder opens, and SHALL say when more matched than fit a side. It SHALL be ink on the progress tint, led by the swap arrows, with its numbers in mono. With one side added it names that side only, and "from your match" for 1. From a post, or when a row's You get matches were taken from one post (see Row matches from one post), it starts "Added from {list}:".

#### Scenario: Line
- **WHEN** the builder opens with 3 under You give and 5 under You get from the matches
- **THEN** the line reads "Added 3 you give and 5 you get from your matches" with Remove matches

#### Scenario: One side only
- **WHEN** the matches add 2 under You give and nothing under You get
- **THEN** the line reads "Added 2 you give from your matches"

#### Scenario: One match
- **WHEN** the matches add 1 under You give and nothing under You get
- **THEN** the line reads "Added 1 you give from your match"

#### Scenario: One post's matches from a row
- **WHEN** a row's matches add 2 under You get from rin.trades's "doubles" and nothing under You give
- **THEN** the line reads "Added from doubles: 2 you get"

#### Scenario: More matched than fit
- **WHEN** 210 of the sender's collections match rin.trades's wants, and 5 of rin.trades's match the sender's
- **THEN** the line reads "Added 200 you give and 5 you get from your matches. Only 200 of the 210 that matched fit on You give."

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
- **WHEN** "doubles", which sets no ratio of its own, asks ratio 2 for KimLip 108Z #133 and none for KimLip 108Z #540
- **THEN** the KimLip 108Z tile carries no chip, the row for #133 in the serial dialog carries "1:2", the row for #540 carries none, and once picked the #133 card carries "1:2"

### Requirement: Offer page layout
From `lg` up, the page SHALL hold a narrow column, the title over a sticky part with the top-up, the note, Sending as, the send hint and Send, beside a main area with the status line across its width and then You get and You give side by side. The title scrolls with the page. Back to <name> SHALL lead the page. Add SHALL open the picker in a sheet from the end edge, as wide as the main area, with the column still in view.

#### Scenario: Desktop
- **WHEN** the sender opens rin.trades's offer page at 1440 px with 200 matches from "doubles" added under You get
- **THEN** the column shows the title, top-up, note and Send, the line "Added from doubles: 200 you get…" spans the main area, and You get and You give sit side by side under it

#### Scenario: Scrolled
- **WHEN** the sender scrolls down to the last rows of the 200 picks at 1440 px
- **THEN** the title has scrolled away, and the top-up, note and Send stay in view beside the sides

#### Scenario: Picker
- **WHEN** the sender activates Add from doubles at 1440 px
- **THEN** the picker opens as a sheet over the main area, and the column with Send stays visible

### Requirement: Recipients who take only what they want
While the recipient has "Only offers with what I want" on (see `web-account`), each You give objekt of an offer that asks for an objekt the recipient did not offer in the countered offer SHALL be a collection, rules included, on the post's want list: the one paired with the offer's post, on Trade and not empty. A post without one SHALL take any give. An offer that asks for nothing, or only for objekts the recipient offered, SHALL give only collections on any of their want lists on Trade, whatever Offer on names, or anything with none. Otherwise the send SHALL be refused as not wanted, naming those objekts; an objekt they asked for in a countered offer is exempt.

#### Scenario: Unwanted give refused
- **WHEN** rin.trades has the setting on and the post "doubles" paired with the want list "hunting", and a user's offer on "doubles" asks for one objekt on "doubles" and gives HyeRin 301Z #1203, a collection not on "hunting"
- **THEN** the offer is refused as not wanted, naming #1203, and nothing is sent

#### Scenario: Wanted give sent
- **WHEN** rin.trades has the setting on, and a user's offer on "doubles" asks for one objekt on "doubles" and gives SeoYeon 204Z #88, whose collection is on "hunting"
- **THEN** the offer is sent

#### Scenario: Wanted through a rule
- **WHEN** rin.trades's "hunting" holds a rule that wants every ARTMS Double class, and a user gives one of those collections
- **THEN** the offer is sent

#### Scenario: On another post's want list
- **WHEN** rin.trades has the setting on, also has the post "spares" paired with the want list "wishlist", and a user's offer on "doubles" asks for one objekt on "doubles" and gives a collection only on "wishlist"
- **THEN** the offer is refused as not wanted: only the post's own want list counts

#### Scenario: Post without a want list
- **WHEN** rin.trades has the setting on and the have list "extras" posted alone, and a user's offer on "extras" asks for one objekt on "extras" and gives HyeRin 301Z #1203
- **THEN** the offer is sent

#### Scenario: No post
- **WHEN** rin.trades has the setting on, and a user's offer with Offer on "doubles" asks for nothing and gives one collection on "hunting" and one on "wishlist"
- **THEN** the offer is sent: an offer that asks for nothing may give from any of their want lists on Trade

#### Scenario: Asks for nothing on a post without a want list
- **WHEN** rin.trades has the setting on, the have list "extras" posted alone, and "hunting" on Trade, and a user's offer with Offer on "extras" asks for nothing and gives HyeRin 301Z #1203, a collection on none of rin.trades's want lists
- **THEN** the offer is refused as not wanted, naming #1203: an offer that asks for nothing is checked against every want list on Trade, not its post's

#### Scenario: Counter asks only for what they offered
- **WHEN** rin.trades, with the setting on, offered HyeRin 301Z #1203, and the user counters with Offer on "doubles", keeping #1203 under You get, asking for nothing else and giving a collection only on "wishlist"
- **THEN** the counter is sent: its gives are checked against every want list on Trade

#### Scenario: Want list kept off Trade
- **WHEN** rin.trades has the setting on, and a user's offer that asks for nothing gives a collection that is only on rin.trades's want list "private", which is not shown on Trade
- **THEN** the offer is refused as not wanted

#### Scenario: Cash buy
- **WHEN** rin.trades has the setting on, and a user offers nothing under You give for SeoYeon 204Z #537 plus 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Counter gives what they asked for
- **WHEN** rin.trades, with the setting on, offered to take the user's JiWoo 108Z #88, which is on none of rin.trades's want lists, and the user counters, still giving #88 and adding a top-up
- **THEN** the counter is sent

#### Scenario: No want list on Trade
- **WHEN** rin.trades has the setting on but no want list shown on Trade, and a user's offer gives any objekt they own
- **THEN** the offer is sent

#### Scenario: Open offers stay
- **WHEN** a user's offer giving an unwanted objekt is open, and rin.trades then turns the setting on
- **THEN** the offer stays open, and rin.trades may still accept it

### Requirement: Builder for a want-only recipient
When the rule filters the offer (see Recipients who take only what they want), You give's "Only what they want" SHALL be on and locked, and a line SHALL say what it keeps to. While You get holds an ask the partner did not offer in the countered offer, it keeps to the want list of the post under Offer on, and the line names the want list of {post}; on a post without a want list the switch SHALL instead be off, with no line. While You get holds no such ask, it keeps to all their want lists on Trade, and the line says their want lists. The switch and its line SHALL follow the first such ask added and the last removed. A pick refused under the rule SHALL be one that can't be sent, "Not on their wants".

#### Scenario: Switch locked on
- **WHEN** the sender opens the builder for rin.trades, who has the setting on and the want list "hunting" on Trade paired with "doubles", and adds one objekt from "doubles" under You get
- **THEN** with Offer on "doubles", You give's "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on the want list of doubles, and the picker shows only collections on "hunting"

#### Scenario: Before the first ask
- **WHEN** the sender opens the builder for rin.trades, who has the setting on and the want lists "hunting" and "wishlist" on Trade, with Offer on "doubles" and nothing under You get
- **THEN** "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on their want lists, and the picker shows collections on "hunting" or "wishlist"

#### Scenario: First ask added
- **WHEN** the sender then adds one objekt from "doubles" under You get
- **THEN** the line changes to the want list of doubles, and You give's picker shows only collections on "hunting"

#### Scenario: Changing to a post without a want list
- **WHEN** the sender changes Offer on to rin.trades's "extras", posted alone, and adds an objekt from it under You get
- **THEN** "Only what they want" turns off and may be turned on, and the line goes away

#### Scenario: Post without a want list, nothing asked
- **WHEN** Offer on reads "extras", posted alone, and You get holds nothing
- **THEN** "Only what they want" is on and can't be turned off, and the line reads that rin.trades only takes objekts on their want lists

#### Scenario: Refused on send
- **WHEN** rin.trades removes a collection from "hunting" after the sender picked it, and the sender chooses Send
- **THEN** the server refuses it as not wanted, and that pick is outlined with "Not on their wants" and counted in You give's banner

#### Scenario: Setting off
- **WHEN** the sender opens the builder for a partner with the setting off
- **THEN** "Only what they want" starts off and may be turned on, as before

### Requirement: One post per offer
While the recipient has a have or sale list on Trade, every You get item of every offer, counters included, SHALL come from the same one of those lists: the post the offer names, else one that fits every ask. An any-copy ask SHALL draw only on that list's copies. Otherwise the send SHALL be refused as from another post, naming the items: "An offer asks from one post. On another of their posts: {objekts}". Exempt: an objekt the recipient offered in the offer being countered. Offers already open SHALL stay open until they end.

#### Scenario: Asks from one post
- **WHEN** rin.trades has "doubles" and "spares" on Trade, and a user's offer on rin.trades's post "doubles" asks for two objekts on "doubles"
- **THEN** the offer is sent

#### Scenario: Ask from another post refused
- **WHEN** a user's offer on "doubles" asks for one objekt on "doubles" and SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is refused as from another post, naming #537, the refusal reads "An offer asks from one post. On another of their posts: SeoYeon 204Z #537", and nothing is sent

#### Scenario: On a post, asks only another
- **WHEN** a user's offer on "doubles" asks only for objekts on "spares"
- **THEN** the offer is refused as from another post

#### Scenario: Named no post, one post fits
- **WHEN** a request names no post and asks for two objekts that are both on "spares"
- **THEN** the offer is sent, on "spares"

#### Scenario: Named no post, two posts
- **WHEN** a request names no post and asks for one objekt on "doubles" and one only on "spares"
- **THEN** the offer is refused as from another post

#### Scenario: Objekt on two posts
- **WHEN** SeoYeon 204Z #537 is on both "doubles" and "spares", and a user's offer on "doubles" asks for #537 and another objekt on "doubles"
- **THEN** the offer is sent, both asks counted through "doubles"

#### Scenario: Counter keeps their objekt
- **WHEN** rin.trades offered HyeRin 301Z #1203, which is on none of their lists, and the user counters on "doubles", keeping #1203 under You get and asking for one objekt on "doubles"
- **THEN** the counter is sent

#### Scenario: Counter asks from two posts
- **WHEN** the user counters rin.trades's offer, asking for one objekt on rin.trades's "doubles" and SeoYeon 204Z #537, which is only on rin.trades's "spares"
- **THEN** the counter is refused as from another post, naming #537: a counter's new asks come from one of the original sender's posts

#### Scenario: Any copy from two lists
- **WHEN** "doubles" and "spares" each name one SeoYeon 204Z, and a request on "doubles" asks for two copies of SeoYeon 204Z in any serial
- **THEN** the offer is refused naming SeoYeon 204Z, and nothing is sent

#### Scenario: Counter on an offer across posts
- **WHEN** rin.trades's offer, sent before this rule and still open, asks from the user's posts "binary" and "extras", and the user counters, keeping rin.trades's gives under You get and giving the objekts it asked for
- **THEN** the counter is sent: the objekts from "binary" and "extras" are now under You give, which no post rule checks, and the kept gives are exempt

#### Scenario: Replacing an offer across posts
- **WHEN** the sender of that open offer sends a new one in its place, asking from the user's "binary" and "extras" again
- **THEN** the new offer is refused as from another post, and the open one stays as it was

#### Scenario: Open offers across posts stay
- **WHEN** an offer to rin.trades asking from "doubles" and "spares" was sent before this rule and is still open
- **THEN** it stays open until it is answered, withdrawn or expires, and rin.trades may accept, decline or counter it

### Requirement: Choosing the post
When the partner has a have or sale list on Trade (One post per offer), the builder's header SHALL hold an **Offer on** choice: each of those lists, by type badge and name, with no "No post". With exactly one such list it SHALL instead read the line "Offer on {post}", with no choice. Where it opens is in Where Offer on opens. You get's button SHALL read "Add from {post}" and its picker SHALL show only that post, with no List choice. With two or more such lists, a line under You get SHALL say another post takes a separate offer; with one, no such line shows. A pick from another list SHALL be one that can't be sent, "Not on {post}".

#### Scenario: From a post
- **WHEN** the sender chooses Make offer on rin.trades's post "doubles"
- **THEN** Offer on reads "doubles", You get's button reads "Add from doubles", and its picker shows only the entries of "doubles", with no List choice

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's Market listing from the sale list "spares"
- **THEN** Offer on reads "spares"

#### Scenario: From chat
- **WHEN** the sender opens the builder from their conversation with rin.trades, whose lists on Trade are "doubles" then "spares"
- **THEN** Offer on reads "doubles" and offers "doubles" and "spares" only, with no "No post"

#### Scenario: One post
- **WHEN** rin.trades's only have or sale list on Trade is "doubles"
- **THEN** the header reads "Offer on doubles" as a line, with no choice to open, You get's button reads "Add from doubles", and no line under You get speaks of another post

#### Scenario: Gives only
- **WHEN** the sender gives HyeRin 301Z #1203 for 6,000 KRW and asks for nothing
- **THEN** Offer on still names one of rin.trades's posts, and the offer is sent

#### Scenario: Changing the post
- **WHEN** the sender has two picks from "doubles" and changes Offer on to "spares"
- **THEN** both picks are outlined with "Not on spares", You get's banner counts them, and Send is disabled until they are removed or Offer on goes back

#### Scenario: Partner with no lists
- **WHEN** rin.trades has no have or sale list on Trade
- **THEN** the header has no Offer on choice

### Requirement: Row matches from one post
Opened from a Trade row's Make offer for a partner with a have or sale list on Trade, when the matches don't come from a Can swap pair, the builder SHALL count You get matches only from the partner's have or sale post with the most of them (on a tie, the row's lead post, then list order), and only then choose the direction with more. When You get is filled, the added-matches line SHALL name that post and Offer on SHALL open on it. When You give wins, You get SHALL stay empty. Can swap pairs, whose You get comes from one post already, and You give matches SHALL stay as in Matches added when the builder opens.

#### Scenario: Matches across two posts
- **WHEN** rin.trades's row reads "They have 5 you want" with no Can swap mark, 3 of them on "doubles" and 2 on "spares", and the sender chooses Make offer on the row
- **THEN** the builder opens with the 3 from "doubles" under You get, the line reads "Added from doubles: 3 you get", Offer on reads "doubles", and Send is enabled

#### Scenario: Tie between posts
- **WHEN** rin.trades has 2 matches each on "doubles", the lead post of their row, and "spares"
- **THEN** the builder adds the 2 from "doubles"

#### Scenario: You give wins after the cut
- **WHEN** rin.trades's row reads "They have 4 you want · You have 3 they want" with no Can swap mark, 2 of the 4 on "doubles", the row's lead post, and 2 on "spares", and the sender chooses Make offer on the row
- **THEN** the builder opens with the 3 under You give, nothing under You get, and Offer on on "doubles"

#### Scenario: Can swap pair unchanged
- **WHEN** the sender's row with rin.trades reads "You can swap 3" through "doubles"
- **THEN** the builder adds that pair's matches as before, all of You get on "doubles"

### Requirement: The post an offer is on
An offer SHALL store the post its asks all come from: the Offer on choice or the post it started from, else the one list they fit. An offer giving only, or asking only for objekts the recipient offered, is on no post, whatever Offer on read; so is an offer sent across posts before every offer had to ask from one. After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people. An offer on no post SHALL show no "Offer on" line and no other mark about posts, and a post deleted later SHALL drop it.

#### Scenario: Both sides see it
- **WHEN** an offer on "doubles" is sent
- **THEN** both the sender's and rin.trades's card in their conversation read "Offer on doubles"

#### Scenario: Gives only
- **WHEN** an offer to rin.trades gives objekts for a top-up and asks for nothing, whatever Offer on reads
- **THEN** neither card reads "Offer on"

#### Scenario: Partner with no lists
- **WHEN** a user asks rin.trades, who has no have or sale list on Trade and lets people ask for anything they hold, for an objekt from their collection
- **THEN** neither card reads "Offer on"

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "doubles" after the offer was sent
- **THEN** neither card reads "Offer on"

#### Scenario: Across posts
- **WHEN** an offer to rin.trades asking from "doubles" and "spares" was sent before every offer had to ask from one post
- **THEN** neither card reads "Offer on" or names rin.trades's posts, and its items, Accept, Decline and Counter are as on any offer

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
- **WHEN** "spares" lists SooMin 204Z #615, "quiet haves" lists two SooMin 204Z, and Offer on reads "spares"
- **THEN** the SooMin 204Z tile reads "#615" with no "Any serial · 2 more", and choosing it picks #615 at once

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
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on "doubles", which shows serials, and holds five, and the sender has checked #537 and "Any serial"
- **THEN** the tile reads "2 of 5 picked"

### Requirement: Serial dialog
The serial dialog SHALL be a modal over the picker, titled with the collection, under it its artist and season and, in You get, the names of the lists its copies come from. It SHALL list each copy shown by serial as a checkbox row, the whole row its target, in ascending serial order, with its serial and, when they apply, its list (when the copies span lists), its ratio (when ratios differ) and its flag. It SHALL open with the picker's current picks of those copies checked.

#### Scenario: Opening
- **WHEN** the sender chooses the HeeJin 101Z tile in You get's picker, its twelve copies all on "doubles"
- **THEN** the dialog is titled "HeeJin 101Z", reads "ARTMS · Atom01 · doubles" and "Pick the copies you want from rin.trades.", lists #8 to #1499 in ascending order, and focus is on the first row that can be checked

#### Scenario: Your own copies
- **WHEN** the sender chooses the Mayu 210Z tile in You give's picker
- **THEN** the dialog reads "tripleS · Binary01" and "Pick the copies you'll give.", with a row for each of the sender's copies

#### Scenario: Copies on two lists
- **WHEN** rin.trades lists KimLip 108Z #133 and #540 on "doubles" and #2048 on "spares", and Offer on reads "doubles"
- **THEN** the dialog reads "ARTMS · Atom01 · doubles", and its rows read "#133" and "#540", with no list name and no row for #2048

#### Scenario: Estimated serials
- **WHEN** the four Nien 402Z copies rin.trades lists have estimated serials
- **THEN** the rows read "~#12", "~#57", "~#88" and "~#140", each read as "estimated #12" and so on, and the dialog says once below the rows "~ marks a serial we estimated. Cosmo may show a different number, so check the objekt in Cosmo before you send it."

#### Scenario: Reopening
- **WHEN** the sender has picked SeoYeon 204Z #537 and #904 and chooses its tile again
- **THEN** the dialog opens with #537 and #904 checked

### Requirement: Any serial in the serial dialog
In You get over lists, the serial dialog SHALL put an "Any serial" control above the rows when the collection allows one: a count from 0 to N with − and +, reading "They choose the serial · N available", when copies only any serial reaches remain (see Hidden serials stay hidden in offers); else a checkbox worth one copy, reading "They choose the serial", when two or more shown copies are available. You give and the collection picker SHALL offer none.

#### Scenario: Checkbox worth one copy
- **WHEN** rin.trades lists five SeoYeon 204Z by serial on "doubles", and the sender checks "Any serial" in its dialog
- **THEN** the footer reads "1 of 5 picked", and the confirm button reads "Pick 1 copy"

#### Scenario: Every serial checked
- **WHEN** "Any serial" is checked and the sender checks all five SeoYeon 204Z serials
- **THEN** "Any serial" unchecks itself and is disabled, and the footer reads "5 of 5 picked"

#### Scenario: Count for copies only any serial reaches
- **WHEN** rin.trades lists SooMin 204Z #615 and #1077 on "spares" and two more on "quiet haves", which hides serials, and the sender opens the SooMin 204Z dialog with Offer on "spares"
- **THEN** "Any serial" is a checkbox worth one copy reading "They choose the serial", with no count: the copies only any serial reaches are on "quiet haves", another post

#### Scenario: One available copy
- **WHEN** rin.trades lists JiWoo 207Z #221 and #640 by serial, and #640 is in a trade in progress
- **THEN** the JiWoo 207Z dialog offers no "Any serial"

#### Scenario: A count held from before
- **WHEN** You get holds three copies of SeoYeon 204Z in any serial from a whole-collection entry on "doubles", which shows serials, and the sender opens its dialog
- **THEN** "Any serial" shows as a count at 3 whose + is disabled, so it can only come down, its buttons named "One fewer copy of SeoYeon 204Z" and "One more copy of SeoYeon 204Z" and its field "Any serial of SeoYeon 204Z"

### Requirement: Serial dialog across posts
A tile SHALL stand for the copies the picker shows: in You get, only those of the post chosen under Offer on, "Any serial" included; in You give narrowed by List, only that list's. Confirming SHALL change only the picks of the copies the dialog shows, so a pick of the same collection from another post stays, and the builder marks it as one that can't be sent, "Not on {post}".

#### Scenario: One post
- **WHEN** Offer on reads "doubles", and rin.trades lists SeoYeon 204Z #537 and #812 on "doubles" and #904 on "spares"
- **THEN** the SeoYeon 204Z tile reads "Choose from 2 serials", its dialog reads "tripleS · Cream01 · doubles" with rows for #537 and #812 only, and its "Any serial" asks for one of those two

#### Scenario: Across posts
- **WHEN** the sender changes Offer on to "spares" and opens You get's picker
- **THEN** the SeoYeon 204Z tile reads "#904", choosing it picks #904 at once, and no row reads "#537 · doubles" or "#812 · doubles"

#### Scenario: A pick from another post stays
- **WHEN** the sender picked #904 from "spares", changed Offer on to "doubles", and confirms #537 in the SeoYeon 204Z dialog
- **THEN** You get holds #537 and #904, and #904 is outlined with "Not on doubles"

## REMOVED Requirements

### Requirement: Recipients who take asks across posts
**Reason**: Every offer to a recipient with a have or sale list on Trade asks from one of those lists. The switch "Let people ask from more than one post" is removed (see `web-account` Offer rules).
**Migration**: One post per offer applies to every such recipient, and the builder always shows Offer on (see Choosing the post). Offers already open across posts stay open until they end.

### Requirement: An offer on no post
**Reason**: Offer on no longer offers "No post" for a partner with a have or sale list on Trade.
**Migration**: An offer that asks for nothing is still stored on no post (see The post an offer is on), and its gives are checked against every want list on Trade (see Recipients who take only what they want).

### Requirement: Asks from your posts mark
**Reason**: A new offer can no longer ask across posts, so the mark would show only on offers sent before this change, and stay on their closed cards for good.
**Migration**: An offer across posts reads as any offer on no post, with no "Offer on" line; its items, Accept, Decline and Counter are unchanged.

### Requirement: Notice after declining an offer across posts
**Reason**: Its only action turned off "Let people ask from more than one post", which is removed.
**Migration**: None. A decline shows at most the nudge to turn on Only offers with what I want (see Nudge after declining an unwanted offer).

### Requirement: One notice per decline
**Reason**: With the notice after declining an offer across posts gone, a decline has only one notice about offer rules left to show.
**Migration**: None. Nudge after declining an unwanted offer keeps its own rules.
