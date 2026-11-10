## ADDED Requirements

### Requirement: Recipients who take only what they want
While the recipient has "Only offers with what I want" on (see `web-account`), each You give objekt SHALL be a collection, rules included, on the post's want list: the one paired with the offer's post, on Trade and not empty. A post without one SHALL take any give. With no post, the gives SHALL be on any of their want lists on Trade, or anything with none. Otherwise the send SHALL be refused as not wanted, naming those objekts; an objekt they asked for in a countered offer is exempt.

#### Scenario: Unwanted give refused
- **WHEN** rin.trades has the setting on and the post "doubles" paired with the want list "hunting", and a user's offer on "doubles" gives HyeRin 301Z #1203, a collection not on "hunting"
- **THEN** the offer is refused as not wanted, naming #1203, and nothing is sent

#### Scenario: Wanted give sent
- **WHEN** rin.trades has the setting on, and a user's offer on "doubles" gives SeoYeon 204Z #88, whose collection is on "hunting"
- **THEN** the offer is sent

#### Scenario: Wanted through a rule
- **WHEN** rin.trades's "hunting" holds a rule that wants every ARTMS Double class, and a user gives one of those collections
- **THEN** the offer is sent

#### Scenario: On another post's want list
- **WHEN** rin.trades has the setting on, also has the post "spares" paired with the want list "wishlist", and a user's offer on "doubles" gives a collection only on "wishlist"
- **THEN** the offer is refused as not wanted: only the post's own want list counts

#### Scenario: Post without a want list
- **WHEN** rin.trades has the setting on and the have list "extras" posted alone, and a user's offer on "extras" gives HyeRin 301Z #1203
- **THEN** the offer is sent

#### Scenario: No post
- **WHEN** rin.trades has the setting on, and a user's offer on no post gives one collection on "hunting" and one on "wishlist"
- **THEN** the offer is sent: an offer on no post may give from any of their want lists on Trade

#### Scenario: Want list kept off Trade
- **WHEN** rin.trades has the setting on, and a user's offer on no post gives a collection that is only on rin.trades's want list "private", which is not shown on Trade
- **THEN** the offer is refused as not wanted

#### Scenario: Cash buy
- **WHEN** rin.trades has the setting on, and a user offers nothing under You give for SeoYeon 204Z #537 plus 6,000 KRW
- **THEN** the offer is sent

#### Scenario: Counter gives what they asked for
- **WHEN** rin.trades, with the setting on, offered to take the user's JiWoo 108Z #88, which is on none of rin.trades's want lists, and the user counters, still giving #88 and adding a top-up
- **THEN** the counter is sent

#### Scenario: No want list on Trade
- **WHEN** rin.trades has the setting on but no want list shown on Trade, and a user's offer on no post gives any objekt they own
- **THEN** the offer is sent

#### Scenario: Open offers stay
- **WHEN** a user's offer giving an unwanted objekt is open, and rin.trades then turns the setting on
- **THEN** the offer stays open, and rin.trades may still accept it

### Requirement: Builder for a want-only recipient
When the rule filters the offer (see Recipients who take only what they want), You give's "Only what they want" SHALL be on and locked, keeping to the post's want list, or with no post to all their want lists on Trade, and a line SHALL say which: the want list of {post}, or their want lists. On a post without a want list the switch SHALL start off, with no line. A pick refused under the rule SHALL be one that can't be sent, "Not on their wants".

#### Scenario: Switch locked on
- **WHEN** the sender opens the builder for rin.trades, who has the setting on and the want list "hunting" on Trade
- **THEN** with Offer on "doubles", You give's "Only what they want" is on and can't be turned off, the line reads that rin.trades only takes objekts on the want list of doubles, and the picker shows only collections on "hunting"

#### Scenario: Changing to a post without a want list
- **WHEN** the sender changes Offer on to rin.trades's "extras", posted alone
- **THEN** "Only what they want" turns off and may be turned on, and the line goes away

#### Scenario: Refused on send
- **WHEN** rin.trades removes a collection from "hunting" after the sender picked it, and the sender chooses Send
- **THEN** the server refuses it as not wanted, and that pick is outlined with "Not on their wants" and counted in You give's banner

#### Scenario: Setting off
- **WHEN** the sender opens the builder for a partner with the setting off
- **THEN** "Only what they want" starts off and may be turned on, as before

### Requirement: One post per offer
While the recipient has "Let people ask from more than one post" off (see `web-account`; on by default) and a have or sale list on Trade, every You get item SHALL come from the same one of those lists: the post the offer names, else one that fits every ask. Otherwise the send SHALL be refused as from another post, naming the items. Exempt: an objekt the recipient offered in the offer being countered. Offers already open SHALL stay.

#### Scenario: Asks from one post
- **WHEN** rin.trades has "Let people ask from more than one post" off, and a user's offer on rin.trades's post "doubles" asks for two objekts on "doubles"
- **THEN** the offer is sent

#### Scenario: Ask from another post refused
- **WHEN** a user's offer on "doubles" asks for one objekt on "doubles" and SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is refused as from another post, naming #537, and nothing is sent

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

### Requirement: Recipients who take asks across posts
While the recipient has "Let people ask from more than one post" on, the default, an offer MAY ask from any of their have and sale lists on Trade, as before this change. The builder SHALL then show no Offer on choice: a line "Offer on {post}" when it started from one of those posts (a post, a Market listing or a post's matches), and You get's picker SHALL offer the List choice with All their lists.

#### Scenario: Asks from two posts
- **WHEN** rin.trades has the setting on, and a user asks for one objekt on "doubles" and one only on "spares"
- **THEN** the offer is sent, on no one post

#### Scenario: Started from a post
- **WHEN** rin.trades has the setting on, and the sender chooses Make offer on "doubles"
- **THEN** the builder reads "Offer on doubles", and You get's List opens on "doubles" and offers All their lists

#### Scenario: Turned off
- **WHEN** rin.trades turns the setting off, and a user then asks from "doubles" and "spares" in one offer
- **THEN** the offer is refused as from another post

### Requirement: Choosing the post
When the partner takes asks from one post (One post per offer), the builder's header SHALL hold an **Offer on** choice: each of those lists, by type badge and name, then "No post". Where it opens is in Where Offer on opens. You get's button SHALL read "Add from {post}" and its picker SHALL show only that post, with no List choice. A line under You get SHALL say another post takes a separate offer. A pick from another list SHALL be one that can't be sent, "Not on {post}".

#### Scenario: From a post
- **WHEN** the sender chooses Make offer on rin.trades's post "doubles"
- **THEN** Offer on reads "doubles", You get's button reads "Add from doubles", and its picker shows only the entries of "doubles", with no List choice

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's Market listing from the sale list "spares"
- **THEN** Offer on reads "spares"

#### Scenario: From chat
- **WHEN** the sender opens the builder from their conversation with rin.trades, whose lists on Trade are "doubles" then "spares"
- **THEN** Offer on reads "doubles"

#### Scenario: Changing the post
- **WHEN** the sender has two picks from "doubles" and changes Offer on to "spares"
- **THEN** both picks are outlined with "Not on spares", You get's banner counts them, and Send is disabled until they are removed or Offer on goes back

#### Scenario: Partner with no lists
- **WHEN** rin.trades has no have or sale list on Trade
- **THEN** the header has no Offer on choice

### Requirement: Where Offer on opens
Offer on SHALL open on the post the builder started from (a post or a Market listing), else the post a row's matches came from, else the row's lead post when it is one of the partner's have or sale lists, else the list of the first You get pick, else the partner's first list.

#### Scenario: From a WTB row
- **WHEN** the sender opens the builder from rin.trades's row, whose lead post is a WTB post, with no matches, and rin.trades has "doubles" then "spares" on Trade
- **THEN** Offer on opens on "doubles"

#### Scenario: Counter
- **WHEN** rin.trades counters the user's offer, keeping the objekt the user gave under You get, and the user has "sale1" then "doubles" on Trade
- **THEN** Offer on opens on "sale1", and the kept objekt can be sent whichever post is chosen, since the user offered it

### Requirement: An offer on no post
With No post chosen under Offer on, You get SHALL have no Add button, its line SHALL say to choose a post to ask for objekts, and any You get pick SHALL be one that can't be sent, "No post chosen". The offer MAY still give objekts or a top-up, and is sent on no post.

#### Scenario: Gives only
- **WHEN** the sender changes Offer on to No post and gives HyeRin 301Z #1203 for 6,000 KRW
- **THEN** You get has no Add button, and the offer is sent on no post

#### Scenario: A pick left behind
- **WHEN** the sender has one pick from "doubles" and changes Offer on to No post
- **THEN** that pick is outlined with "No post chosen", and Send is disabled until it is removed or a post is chosen

### Requirement: Row matches from one post
Opened from a Trade row's Make offer for a partner who takes asks from one post, when the matches fill You get and don't come from a Can swap pair, the builder SHALL add You get matches only from the partner's have or sale post with the most of them (on a tie, the row's lead post), and the added-matches line SHALL name that post. Offer on SHALL open on it. Can swap pairs, whose You get comes from one post already, and You give matches SHALL stay as in Matches added when the builder opens.

#### Scenario: Matches across two posts
- **WHEN** rin.trades's row reads "They have 5 you want" with no Can swap mark, 3 of them on "doubles" and 2 on "spares", and the sender chooses Make offer on the row
- **THEN** the builder opens with the 3 from "doubles" under You get, the line reads "Added from doubles: 3 you get", Offer on reads "doubles", and Send is enabled

#### Scenario: Tie between posts
- **WHEN** rin.trades has 2 matches each on "doubles", the lead post of their row, and "spares"
- **THEN** the builder adds the 2 from "doubles"

#### Scenario: Can swap pair unchanged
- **WHEN** the sender's row with rin.trades reads "You can swap 3" through "doubles"
- **THEN** the builder adds that pair's matches as before, all of You get on "doubles"

### Requirement: Not on your wants label
On an offer card and the offer page, the recipient (never the sender) SHALL see "Not on your wants" on a You give item whose collection is on none of their want lists, shown on Trade or not, unless they asked for it in the offer being countered. The label SHALL be information only and SHALL not block accept, decline or counter.

#### Scenario: Unwanted give labelled
- **WHEN** rin.trades opens an offer giving HyeRin 301Z #1203, which is on none of rin.trades's want lists, and SeoYeon 204Z #88, which is on "hunting"
- **THEN** #1203 reads "Not on your wants", #88 has no label, and rin.trades can still accept

#### Scenario: Counter gives what they asked for
- **WHEN** rin.trades asked for the user's JiWoo 108Z #88, which is on none of rin.trades's want lists, and the user counters, still giving #88
- **THEN** #88 has no "Not on your wants" label on rin.trades's side

#### Scenario: Sender sees no wants label
- **WHEN** the user who sent the offer opens it
- **THEN** no item reads "Not on your wants"

### Requirement: Nudge after declining an unwanted offer
When the recipient declines an offer holding a "Not on your wants" item, while their "Only offers with what I want" is off and they have a want list shown on Trade, a notice SHALL offer to turn it on, with a button that saves the setting. Once it has shown, that browser SHALL not show it again, since a notice that closes on its own can't be told from one dismissed. Turning the setting on SHALL not touch other open offers.

#### Scenario: Nudge shown
- **WHEN** rin.trades, with the setting off and "hunting" on Trade, declines an offer whose HyeRin 301Z #1203 reads "Not on your wants"
- **THEN** a notice offers to turn on Only offers with what I want

#### Scenario: Turn it on
- **WHEN** rin.trades chooses Turn on in that notice
- **THEN** the setting is saved on, Account › General shows it on, and the notice closes

#### Scenario: Shown once
- **WHEN** the notice has shown, and rin.trades declines another such offer in the same browser
- **THEN** no notice shows

#### Scenario: No nudge for wanted gives
- **WHEN** rin.trades declines an offer whose gives are all on their want lists
- **THEN** no notice shows

#### Scenario: No nudge without a want list on Trade
- **WHEN** rin.trades has no want list shown on Trade and declines an offer with a "Not on your wants" item
- **THEN** no notice shows, since the setting would not filter anything

#### Scenario: Setting already on
- **WHEN** rin.trades has the setting on and declines an offer that was open before they turned it on, holding a "Not on your wants" item
- **THEN** no notice shows

### Requirement: The post an offer is on
An offer SHALL store the post its asks all come from: the Offer on choice or the post it started from, else the one list they fit. An offer asking across posts, giving only, or asking only for objekts the recipient offered, is on no post. After sending, the offer card and the offer page SHALL read "Offer on {post}" for both people. An offer on no post SHALL show no line, and a post deleted later SHALL drop it.

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

### Requirement: Notice of Only offers with what I want
A user whose "Only offers with what I want" is off and who has a want list shown on Trade SHALL see one notice at the top of Messages introducing it, with Turn on, which saves the setting, and Not now. Once either is chosen, that browser SHALL not show it again.

#### Scenario: Shown once
- **WHEN** rin.trades, with "hunting" on Trade and the setting off, opens Messages
- **THEN** the notice introduces Only offers with what I want, with Turn on and Not now

#### Scenario: Turn on from the notice
- **WHEN** rin.trades chooses Turn on
- **THEN** the setting is saved on, the notice closes, and Account › General shows it on

#### Scenario: Not now
- **WHEN** rin.trades chooses Not now, then opens Messages again in the same browser
- **THEN** no notice shows

#### Scenario: No want list on Trade
- **WHEN** a user with the setting off and no want list on Trade opens Messages
- **THEN** no notice shows, since the setting would not filter anything

## MODIFIED Requirements

### Requirement: Offer builder
The builder SHALL be a page, `/trade/@<handle>/offer` (see Offer page), never a dialog. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists" (for a partner who takes asks from one post, over the post chosen under Offer on, labelled "Add from {post}"; see Choosing the post); or, when the partner has no have or sale list bound to a Cosmo profile and on Trade and lets people ask for anything they hold, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first; or, when they have no such list and don't allow that, no Add picker, and a line saying {name} has nothing on Trade to ask for and that the sender can still offer objekts or a top-up;
- the top-up and the note.

Opened from a Market listing, You get's picker SHALL open with its List choice on the listing's sale list; opened anywhere else, on All their lists.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another of the user's own open offers). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch; and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
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


### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists bound to a Cosmo profile and put on Trade (idle or not), at any of the recipient's linked addresses. A bound list kept off Trade SHALL not be asked from. When the recipient has no such list and has "Let people ask for anything I hold" on (see `web-account`; off by default), each MAY instead come from what the recipient holds at any of their linked addresses (their collection): a specific objekt only, never any copy, since every copy there shows its serial. With no such list and the setting off, nothing SHALL be asked for, and an offer MAY still give objekts or a top-up. This is checked when the offer is sent: once the recipient has such a list, only its entries can be asked for.

Where an offer starts (a Trade row, a Market listing, a conversation) SHALL not narrow what may be asked for: every offer follows the rule above. The one exception is a recipient who takes asks from one post (see One post per offer).

A counter-offer MAY also ask for any objekt the recipient listed under You give in the offer it counters, since the recipient already offered it.

An offer SHALL hold at least one objekt, and at most 50 on each side. On the offer card, a side longer than 6 SHALL show the first 6 and a control to show the rest. Either side may be empty. An offer MAY carry:
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
- **WHEN** a user makes an offer from rin.trades's post for the have list "doubles", switches You get's list from "doubles" to rin.trades's sale list "spares", and asks for SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is sent: the post only chose the list You get opens on

#### Scenario: Post offer from a want list
- **WHEN** a user makes an offer from rin.trades's WTB post, whose list is a want list, asking for SeoYeon 204Z #537 from rin.trades's sale list "spares"
- **THEN** the offer is sent, as from a conversation

#### Scenario: Want-only post with no lists to ask from
- **WHEN** a user makes an offer from rin.trades's WTT post that has only a want list, rin.trades has no have or sale list on Trade and lets people ask for anything they hold, and the user asks for an objekt rin.trades holds at a linked address with a public profile
- **THEN** the offer is sent, as an ask from rin.trades's collection

#### Scenario: Conversation after a post offer
- **WHEN** a user's offer from rin.trades's post for "doubles" opened their conversation, and rin.trades counters from the conversation
- **THEN** the counter may ask for entries on any of the user's have and sale lists on Trade, as in any conversation

#### Scenario: Recipient takes asks from one post
- **WHEN** rin.trades has turned Let people ask from more than one post off, and a user makes an offer from the post "doubles" and asks for SeoYeon 204Z #537, which is only on "spares"
- **THEN** the offer is refused as from another post

### Requirement: Picks that can't be sent
A pick that can't be sent (not on their lists, not on their wants, not on the offer's post, no post chosen, in a trade in progress, not transferable, more copies than are spare, or refused when sent) SHALL be outlined and name its reason under its card. Its side SHALL carry a banner counting such picks, with their reasons, and Remove them, which takes only those picks out. The footer SHALL say why Send is disabled while any remain.

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
- **THEN** that card is outlined with "Not on {list}" and counted in You get's banner
