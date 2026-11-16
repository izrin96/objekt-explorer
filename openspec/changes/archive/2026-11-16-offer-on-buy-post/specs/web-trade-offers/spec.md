## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed entries of the post chosen under Offer on, labelled "Add from {post}", and no Add picker while Offer on names one of the partner's Buy posts (see Choosing the post); or, when the partner has no have or sale list bound to a Cosmo profile and on Trade and lets people ask for anything they hold, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first; or, when they have no such list and don't allow that, no Add picker, and a line saying {name} has nothing on Trade to ask for and that the sender can still offer objekts or a top-up;
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
- **WHEN** the sender opens You get's picker at 390 px with "Only what I want" on
- **THEN** the search field and "Filters 1" sit on one row above the grid, the footer is one row, and choosing Filters shows the filters and the switch, with no List

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry of the post under Offer on the sender may ask for

#### Scenario: A collection's copies on one page
- **WHEN** the sender holds one copy each of 199 collections, all received after their newest JiWoo 207Z, and three JiWoo 207Z, and opens You give's picker with All your objekts
- **THEN** the first page holds the 199 and no JiWoo 207Z, and the next page holds all three JiWoo 207Z in one tile

### Requirement: Matches of one post
From Make offer on this post, or a conversation whose newest card is the partner's post card with a match, the builder SHALL add only matches through that post's lists: under You get those on its have or sale list, under You give those on its want list. When the sender can swap with the partner and that post is the partner's half of the pair the score counts, the builder SHALL add that pair's matches, as from the row; otherwise it SHALL add only the direction with more of the post's matches, You get on a tie. Offer on SHALL open on the post's have or sale list, as from a Market listing; on a Buy post, on that Buy post (see Where Offer on opens). You get's picker shows the post under Offer on, and an ask from another post is refused (see One post per offer). The line SHALL name the post's list.

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
- **THEN** the builder opens with 2 under You give, nothing under You get, the line "Added from hunting: 2 you give", and Offer on reads "hunting" and offers "extras"

#### Scenario: From a conversation with a post card
- **WHEN** the sender opens Make offer in their conversation with rin.trades, whose newest card is the post card for "doubles" with "They have 2 you want"
- **THEN** the builder opens with the matches through "doubles" and its want list read now, chosen by the same rule, which may differ from the 2 saved on the card, and the line names "doubles"

#### Scenario: Asking past the post
- **WHEN** the builder opened from "doubles" with its matches under You get, and a request sends them with an objekt only on "spares"
- **THEN** the offer is refused as from another post, naming that objekt, and nothing is sent

### Requirement: Recipients who take only what they want
While the recipient has "Only offers with what I want" on (see `web-account`), each You give objekt SHALL be a collection, rules included, on the one want list the offer is held to, on Trade and not empty. That list SHALL be the first of these that applies:

1. An offer that asks for an objekt the recipient did not offer in the countered offer: the want list paired with the offer's post. An offer to a partner with no have or sale list on Trade is on no post: any of their want lists on Trade.
2. A counter that asks for nothing but objekts the recipient offered: any of their want lists on Trade.
3. An offer on one of the recipient's Buy posts (see Choosing the post), asking for nothing: that Buy post's want list. The request names the Buy post, as `wantList`: the builder sends it while Offer on names the Buy post, or, for a recipient with no have or sale list on Trade, while the builder started from it.
4. An offer asking for nothing on a post: that post's want list.
5. An offer on no post (a partner with no have or sale list on Trade, or a tab loaded before every offer had to ask from one post that names no post): any of their want lists on Trade.

An offer held to a post without a want list (an empty one counts as none) SHALL give no objekts, whether or not it asks for anything: only a top-up. Where any of their want lists counts and they have none on Trade, any give SHALL be taken. Otherwise the send SHALL be refused as not wanted, naming those objekts; an objekt they asked for in a countered offer is exempt from every case.

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
- **THEN** the offer is refused as not wanted, naming #1203: an offer on a post without a want list gives no objekts

#### Scenario: Top-up on a post without a want list
- **WHEN** the user's offer on "extras" instead asks for one objekt on "extras" and gives nothing but 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Asks for nothing
- **WHEN** rin.trades has the setting on, and a user's offer with Offer on "doubles" asks for nothing and gives one collection on "hunting" and one only on "wishlist"
- **THEN** the offer is refused as not wanted, naming the "wishlist" give: an offer that asks for nothing is held to its post's want list

#### Scenario: Asks for nothing, wanted
- **WHEN** rin.trades has the setting on, and a user's offer with Offer on "doubles" asks for nothing and gives SeoYeon 204Z #88, on "hunting", for a top-up
- **THEN** the offer is sent

#### Scenario: Asks for nothing on a post without a want list
- **WHEN** rin.trades has the setting on, "extras" posted alone, and "hunting" and "wishlist" on Trade, and a user's offer with Offer on "extras" asks for nothing
- **THEN** any objekt it gives, even one on "wishlist", is refused as not wanted

#### Scenario: From a Buy post
- **WHEN** rin.trades has the setting on and the Buy post "looking for" (a want list leading its own post), and a user's offer with Offer on "looking for" asks for nothing
- **THEN** a give on "looking for" is sent, and a give only on "hunting" is refused as not wanted

#### Scenario: From a Buy post, then an ask
- **WHEN** a request names the Buy post "looking for" and also asks for one objekt from "doubles"
- **THEN** it is not refused for asking: the gives are held to "hunting", a give only on "looking for" is refused as not wanted, and the offer is on "doubles"

#### Scenario: Counter asks only for what they offered
- **WHEN** rin.trades, with the setting on, offered HyeRin 301Z #1203, and the user counters, keeping #1203 under You get, asking for nothing else and giving a collection only on "wishlist"
- **THEN** the counter is sent: its gives are checked against every want list on Trade, whatever Offer on reads

#### Scenario: Gives only from an older tab
- **WHEN** a tab loaded before every offer had to ask from one post sends an offer to rin.trades that asks for nothing, names no post, and gives a collection only on "wishlist"
- **THEN** the offer is sent: its gives are checked against every want list on Trade

#### Scenario: No post
- **WHEN** rin.trades has the setting on, no have or sale list on Trade, and the want lists "hunting" and "wishlist" on Trade, and a user's offer gives one collection on each
- **THEN** the offer is sent: an offer on no post may give from any of their want lists on Trade

#### Scenario: Want list kept off Trade
- **WHEN** rin.trades has the setting on and no have or sale list on Trade, and a user's offer gives a collection that is only on rin.trades's want list "private", which is not shown on Trade
- **THEN** the offer is refused as not wanted

#### Scenario: Cash buy
- **WHEN** rin.trades has the setting on, and a user offers nothing under You give for SeoYeon 204Z #537 plus 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Counter gives what they asked for
- **WHEN** rin.trades, with the setting on, offered to take the user's JiWoo 108Z #88, which is on none of rin.trades's want lists, and the user counters, still giving #88 and adding a top-up
- **THEN** the counter is sent

#### Scenario: No want list on Trade
- **WHEN** rin.trades has the setting on, no have or sale list and no want list shown on Trade, and a user's offer gives any objekt they own
- **THEN** the offer is sent

#### Scenario: Posts but no want list on Trade
- **WHEN** rin.trades has the setting on, "extras" as their only post and no want list on Trade, and a user's offer on "extras" gives an objekt
- **THEN** the offer is refused as not wanted

#### Scenario: Open offers stay
- **WHEN** a user's offer giving an unwanted objekt is open, and rin.trades then turns the setting on
- **THEN** the offer stays open, and rin.trades may still accept it

### Requirement: Builder for a want-only recipient
When the rule filters the offer (see Recipients who take only what they want), You give's "Only what they want" SHALL be on and locked from the first frame, and a line SHALL say what it keeps to. It keeps to the want list the rule holds the offer to, and the line names the want list of {list}: the post under Offer on, a Buy post included, or, for a partner with no have or sale list on Trade, the Buy post the builder started from. Where any of their want lists counts, it keeps to all their want lists on Trade, and the line says their want lists. Where the rule holds the offer to a post without a want list, You give SHALL have no Add button and the line SHALL say that {name} takes no objekts on {post} and a top-up can be offered instead. The switch, its line and You give's picker SHALL follow the first ask added under You get, the last one removed, and Offer on when it changes. Offer on itself SHALL keep choosing where You get's asks come from. A pick refused under the rule SHALL be one that can't be sent, "Not on their wants".

#### Scenario: Switch locked on
- **WHEN** the sender opens the builder for rin.trades, who has the setting on and the want list "hunting" on Trade paired with "doubles"
- **THEN** with Offer on "doubles", You give's "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on the want list of doubles, and the picker shows only collections on "hunting"

#### Scenario: Before the first ask
- **WHEN** rin.trades also has "wishlist" on Trade paired with "spares", Offer on reads "doubles", and You get holds nothing
- **THEN** You give's picker shows only collections on "hunting", never one only on "wishlist", and the line names the want list of doubles

#### Scenario: Changing the post
- **WHEN** the sender changes Offer on from "doubles" to "spares"
- **THEN** the line names the want list of spares, and You give's picker shows only collections on "wishlist"

#### Scenario: Started from a Buy post
- **WHEN** the sender chooses Make offer on rin.trades's Buy post "looking for", and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on reads "looking for", the line reads that rin.trades only takes objekts on the want list of looking for, and You give's picker shows only collections on "looking for"

#### Scenario: Buy post start, changing the post
- **WHEN** You get holds nothing and the sender changes Offer on to "spares"
- **THEN** the line names the want list of spares, and You give's picker shows only collections on "wishlist"

#### Scenario: First ask added
- **WHEN** the sender, started from "looking for", changes Offer on to "doubles" and adds one objekt from it under You get
- **THEN** the line names the want list of doubles and You give's picker shows only collections on "hunting"; changing Offer on back to "looking for" brings back looking for and outlines that ask with "Not on looking for"

#### Scenario: Changing to a post without a want list
- **WHEN** the sender changes Offer on to rin.trades's "extras", posted alone, whether or not You get holds anything
- **THEN** "Only what they want" stays on and locked, You give has no Add button, and the line reads that extras has no want list, so rin.trades takes no objekts on it, and a top-up can be offered

#### Scenario: Post without a want list, nothing asked
- **WHEN** Offer on reads "extras", posted alone, and You get holds nothing
- **THEN** "Only what they want" stays on and locked, You give has no Add button, and the line reads that extras has no want list, so rin.trades takes no objekts on it: a top-up can still be offered

#### Scenario: Gives already on the side
- **WHEN** You give holds picks and the sender changes Offer on to "extras"
- **THEN** the picks stay until Send, where the server refuses them as not wanted and each is outlined with "Not on their wants"

#### Scenario: Counter asking for nothing new
- **WHEN** the sender counters rin.trades's offer, keeping under You get only objekts rin.trades offered
- **THEN** the line reads that rin.trades only takes objekts on their want lists, and the picker shows collections on any of them, whatever Offer on reads

#### Scenario: Partner with no posts
- **WHEN** rin.trades has the setting on, no have or sale list on Trade, and the want lists "hunting" and "wishlist" on Trade
- **THEN** "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on their want lists, and the picker shows collections on "hunting" or "wishlist"

#### Scenario: Partner with no posts, from their Buy post
- **WHEN** rin.trades, as above, has "hunting" as a Buy post and lets people ask for anything they hold, and the sender chooses Make offer on "hunting"
- **THEN** the line names the want list of hunting and the picker shows only collections on "hunting"; once the sender asks for an objekt from rin.trades's collection, the line says their want lists

#### Scenario: Refused on send
- **WHEN** rin.trades removes a collection from "hunting" after the sender picked it, and the sender chooses Send
- **THEN** the server refuses it as not wanted, and that pick is outlined with "Not on their wants" and counted in You give's banner

#### Scenario: Setting off
- **WHEN** the sender opens the builder for a partner with the setting off
- **THEN** "Only what they want" starts off and may be turned on, as before

### Requirement: Choosing the post
A **Buy post** is a want list of the partner's on Trade, with at least one entry, that leads its own post: no have or sale list is paired with it.

When the partner has a have or sale list on Trade (One post per offer), the builder's header SHALL hold an **Offer on** choice: each of those lists, then each of their Buy posts, each by type badge and name, with no "No post". A counter SHALL offer no Buy post. With exactly one choice it SHALL instead read the line "Offer on {post}", with no choice. Where it opens is in Where Offer on opens. You get's button SHALL read "Add from {post}" and its picker SHALL show only that post, with no List choice. With two or more have or sale lists, a line under You get SHALL say another post takes a separate offer; with one, no such line shows. A pick from another list SHALL be one that can't be sent, "Not on {post}".

While Offer on names a Buy post, the offer asks for nothing: You get SHALL have no Add button, and a line under You get SHALL say "{post} is a Buy post, so an offer on it asks for nothing. To ask for objekts, change Offer on." in place of the line about another post. Every You get pick is then one that can't be sent, "Not on {post}". The offer may give objekts and a top-up, and is sent naming the Buy post.

When the partner has no have or sale list on Trade, the header SHALL have no Offer on choice. When the builder started from one of their Buy posts (its Make offer, its matches, or a row whose lead post it is), it SHALL read the line "Offer on {Buy post}" while You get asks for nothing; an ask from their collection takes the offer off the Buy post, and the line goes.

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
- **WHEN** rin.trades's only have or sale list on Trade is "doubles", and rin.trades has no Buy post
- **THEN** the header reads "Offer on doubles" as a line, with no choice to open, You get's button reads "Add from doubles", and no line under You get speaks of another post

#### Scenario: One have post and one Buy post
- **WHEN** rin.trades has the have list "doubles", paired with the want list "wishlist", and the Buy post "looking for" on Trade, and the sender opens the builder from their conversation with rin.trades
- **THEN** Offer on reads "doubles" and offers "doubles", then "looking for" with the Want badge; "wishlist" is not offered, and no line under You get speaks of another post

#### Scenario: Choosing a Buy post
- **WHEN** You get holds nothing and the sender changes Offer on to "looking for"
- **THEN** You get has no Add button, the line under You get reads "looking for is a Buy post, so an offer on it asks for nothing. To ask for objekts, change Offer on.", and an offer giving HyeRin 301Z #1203 for a top-up is sent on "looking for"

#### Scenario: Choosing a Buy post with asks
- **WHEN** the sender has two picks from "doubles" and changes Offer on to "looking for"
- **THEN** both picks are outlined with "Not on looking for", You get's banner counts them, and Send is disabled until they are removed or Offer on goes back to "doubles"

#### Scenario: Counter
- **WHEN** the user counters rin.trades's offer, and rin.trades has "doubles" and the Buy post "looking for" on Trade
- **THEN** the header reads "Offer on doubles" as a line, and "looking for" is not offered

#### Scenario: Gives only
- **WHEN** the sender gives HyeRin 301Z #1203 for 6,000 KRW and asks for nothing
- **THEN** Offer on still names one of rin.trades's posts, and the offer is sent

#### Scenario: Changing the post
- **WHEN** the sender has two picks from "doubles" and changes Offer on to "spares"
- **THEN** both picks are outlined with "Not on spares", You get's banner counts them, and Send is disabled until they are removed or Offer on goes back

#### Scenario: Partner with no lists
- **WHEN** rin.trades has no have or sale list on Trade
- **THEN** the header has no Offer on choice

#### Scenario: Partner whose only post is a Buy post
- **WHEN** rin.trades has no have or sale list on Trade and the Buy post "looking for", lets people ask for anything they hold, and the sender chooses Make offer on "looking for"
- **THEN** the header reads "Offer on looking for" as a line; once the sender asks for an objekt from rin.trades's collection, the line goes, and the offer is sent on no post

### Requirement: Where Offer on opens
Offer on SHALL open on the post the builder started from (a post or a Market listing), else the post a row's matches came from, else the row's lead post when it is one of the partner's have or sale lists, else the list of the first You get pick, else the partner's first list. Where the start or the matches name a want list paired with one of those posts, Offer on SHALL open on that post. Where they name a Buy post (that post's own Make offer, a conversation whose newest card is that post's card with a match, or a row's You give matches from it), Offer on SHALL open on the Buy post. A row's lead post never opens Offer on a Buy post: a row whose lead post is a Buy post opens on the first list that follows. A partner with no have or sale list on Trade has no Offer on choice, and there a start from their Buy post, a row's lead post included, reads as Choosing the post says.

#### Scenario: From a WTB row
- **WHEN** the sender opens the builder from rin.trades's row, whose lead post is the Buy post "looking for", with no matches, and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on opens on "doubles", and offers "looking for" after "spares"

#### Scenario: From a Buy post
- **WHEN** the sender chooses Make offer on rin.trades's Buy post "looking for", with or without matches, and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on opens on "looking for"

#### Scenario: You give matches from a Buy post
- **WHEN** the builder opens from rin.trades's row with only You give matches, all on the Buy post "looking for"
- **THEN** Offer on opens on "looking for"

#### Scenario: You give matches from a paired want list
- **WHEN** the builder opens from rin.trades's row with only You give matches, all on "wishlist", the want list of "spares"
- **THEN** Offer on opens on "spares"

#### Scenario: Counter
- **WHEN** rin.trades counters the user's offer, keeping the objekt the user gave under You get, and the user has "sale1" then "doubles" on Trade
- **THEN** Offer on opens on "sale1", and the kept objekt can be sent whichever post is chosen, since the user offered it

### Requirement: Row matches from one post
Opened from a Trade row's Make offer for a partner with a have or sale list on Trade, when the matches don't come from a Can swap pair, the builder SHALL count You get matches only from the partner's have or sale post with the most of them (on a tie, the row's lead post, then list order), and You give matches only from the partner's want list with the most of them (on a tie, the row's lead post when it is that want list, then list order), and only then choose the direction with more, You get on a tie. When You get is filled, the added-matches line SHALL name that post and Offer on SHALL open on it. When You give wins, You get SHALL stay empty, the line SHALL name that want list, and Offer on SHALL open on it when it is a Buy post, else on the post it pairs with, so You give is held to it (see Recipients who take only what they want). Can swap pairs, whose sides come from one post already, SHALL stay as in Matches added when the builder opens.

#### Scenario: Matches across two posts
- **WHEN** rin.trades's row reads "They have 5 you want" with no Can swap mark, 3 of them on "doubles" and 2 on "spares", and the sender chooses Make offer on the row
- **THEN** the builder opens with the 3 from "doubles" under You get, the line reads "Added from doubles: 3 you get", Offer on reads "doubles", and Send is enabled

#### Scenario: Tie between posts
- **WHEN** rin.trades has 2 matches each on "doubles", the lead post of their row, and "spares"
- **THEN** the builder adds the 2 from "doubles"

#### Scenario: You give wins after the cut
- **WHEN** rin.trades's row reads "They have 4 you want · You have 4 they want" with no Can swap mark, 2 of the 4 on "doubles", the row's lead post, and 2 on "spares", and of the user's 4, 3 are on rin.trades's Buy post "looking for" and 1 on "hunting"
- **THEN** the builder opens with the 3 on "looking for" under You give, nothing under You get, the line "Added from looking for: 3 you give", Offer on reading "looking for", and You give held to "looking for"

#### Scenario: You give across want lists
- **WHEN** rin.trades's row has no Can swap mark, 1 match under You get on "doubles", and of the user's matches 2 are on "hunting" and 2 on "wishlist", "hunting" first in list order
- **THEN** the builder opens with the 2 on "hunting" under You give and nothing under You get

#### Scenario: Can swap pair unchanged
- **WHEN** the sender's row with rin.trades reads "You can swap 3" through "doubles"
- **THEN** the builder adds that pair's matches as before, all of You get on "doubles"

### Requirement: The post an offer is on
An offer SHALL store its post: the Offer on choice or the post it started from, else the one list its asks fit. An offer that asks for nothing new SHALL be on the post under Offer on too, and an offer that names a Buy post and asks for nothing new SHALL be on that Buy post, for a partner with or without a have or sale list on Trade. A counter that asks only for objekts the recipient offered is on no post. An offer to a partner with no have or sale list on Trade that names no Buy post or asks for something, one from a client that named no post and asks for nothing new, and one sent across posts before every offer had to ask from one, are on no post. After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people. An offer on no post SHALL show no "Offer on" line and no other mark about posts, and a post deleted later SHALL drop it.

#### Scenario: Both sides see it
- **WHEN** an offer on "doubles" is sent
- **THEN** both the sender's and rin.trades's card in their conversation read "Offer on doubles"

#### Scenario: Gives only
- **WHEN** an offer to rin.trades with Offer on "doubles" gives objekts for a top-up and asks for nothing
- **THEN** both cards read "Offer on doubles"

#### Scenario: Gives only from a Buy post
- **WHEN** an offer with Offer on rin.trades's Buy post "looking for" gives objekts and asks for nothing
- **THEN** both cards read "Offer on looking for"

#### Scenario: Buy post named, with an ask
- **WHEN** a request names the Buy post "looking for" and asks for one objekt on "doubles"
- **THEN** both cards read "Offer on doubles"

#### Scenario: Gives only from a Buy post of a partner with no lists
- **WHEN** rin.trades has no have or sale list on Trade, and an offer started from their Buy post "looking for" gives objekts and asks for nothing
- **THEN** both cards read "Offer on looking for"

#### Scenario: Counter asking for nothing new
- **WHEN** the user counters rin.trades's offer, keeping only objekts rin.trades offered under You get
- **THEN** neither card reads "Offer on", whatever Offer on read in the builder

#### Scenario: Gives only from an older tab
- **WHEN** a tab loaded before every offer had to ask from one post sends an offer that asks for nothing and names no post
- **THEN** neither card reads "Offer on", and its gives are checked against every want list on Trade

#### Scenario: Partner with no lists
- **WHEN** a user asks rin.trades, who has no have or sale list on Trade and lets people ask for anything they hold, for an objekt from their collection
- **THEN** neither card reads "Offer on"

#### Scenario: Post deleted
- **WHEN** rin.trades deletes "doubles" after the offer was sent
- **THEN** neither card reads "Offer on"

#### Scenario: Across posts
- **WHEN** an offer to rin.trades asking from "doubles" and "spares" was sent before every offer had to ask from one post
- **THEN** neither card reads "Offer on" or names rin.trades's posts, and its items, Accept, Decline and Counter are as on any offer

