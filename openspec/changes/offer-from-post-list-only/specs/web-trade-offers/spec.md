## MODIFIED Requirements

### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists bound to a Cosmo profile, at any of the recipient's linked addresses. When the recipient has no have or sale list bound to a Cosmo profile and shown on Trade, each MAY instead come from what the recipient holds at a linked address whose profile is not private to the sender (their collection): a specific objekt from an address that shows serials, any copy from one that hides them. This is checked when the offer is sent: once the recipient has such a list, only its entries can be asked for.

An offer addressed to one of the recipient's lists, as Make offer on a Trade post (see `web-trade-browse`) and on a Market listing are, SHALL ask only for entries on that list when it is a have or sale list bound to a Cosmo profile and shown on Trade. Such an offer never draws on the recipient's other lists or on their collection. An offer addressed to any other list, such as a want list, follows the rule above. So do offers made inside a conversation, including one that began with an offer from a post.

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
- **WHEN** rin.trades has no have or sale list on Trade, and the user asks for SeoYeon 204Z #537, which rin.trades holds at a linked address with a public profile
- **THEN** the offer is sent

#### Scenario: Collection ask once they list
- **WHEN** rin.trades makes a bound have list shown on Trade while the user's builder, opened before it, asks for an objekt from rin.trades's collection that is not on that list
- **THEN** the send is refused as unlisted, and nothing is sent

#### Scenario: Private profile
- **WHEN** rin.trades has no list on Trade and holds SeoYeon 204Z only at a linked address whose profile is private
- **THEN** the picker does not show it, and a request for it is refused as unlisted

#### Scenario: Counter keeps their objekt
- **WHEN** rin.trades offers HyeRin 301Z #1203, which is on none of their lists, and the user counters, keeping it under You get and adding a top-up
- **THEN** the counter is sent

#### Scenario: Post offer asks from another list
- **WHEN** a user makes an offer from rin.trades's post for the have list "doubles", asking for SeoYeon 204Z #537, which is only on rin.trades's sale list "spares"
- **THEN** the offer is refused as unlisted, naming SeoYeon 204Z #537, and nothing is sent

#### Scenario: Post offer from a want list
- **WHEN** a user makes an offer from rin.trades's WTB post, whose list is a want list, asking for SeoYeon 204Z #537 from rin.trades's sale list "spares"
- **THEN** the offer is sent, as from a conversation

#### Scenario: Want-only post with no lists to ask from
- **WHEN** a user makes an offer from rin.trades's WTT post that has only a want list, rin.trades has no have or sale list on Trade, and the user asks for an objekt rin.trades holds at a linked address with a public profile
- **THEN** the offer is sent, as an ask from rin.trades's collection

#### Scenario: Conversation after a post offer
- **WHEN** a user's offer from rin.trades's post for "doubles" opened their conversation, and rin.trades counters from the conversation
- **THEN** the counter may ask for entries on any of the user's have and sale lists on Trade, as in any conversation

### Requirement: Offer builder
The builder SHALL open as a dialog, and as a full-height sheet on a phone. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists"; or, when the partner has no have or sale list bound to a Cosmo profile and on Trade, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at linked addresses whose profile is not private to the sender, newest received first;
- the top-up and the note.

Opened for one of the partner's have or sale lists on Trade (from a Trade post or a Market listing), You get's Add picker SHALL list only that list's entries, labelled "Add from {name}'s list", with the same empty-picker reasons as over lists. Opened for any other list, such as a WTB post's want list, You get SHALL work as from a conversation.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another open offer). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, online or offline, and collection number, where picking an artist limits the member choices to that artist's members, and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

You give's picker SHALL offer a **From** choice: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of From.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters.

#### Scenario: Partner lists nothing
- **WHEN** the partner has only want lists and the sender opens You get's picker with "Only what I want" on
- **THEN** the picker says the partner lists nothing the sender can ask for, not that the filters match nothing

#### Scenario: Partner with no lists
- **WHEN** the partner has no have or sale list on Trade and the sender opens the builder
- **THEN** You get's button reads "Add from {name}'s collection", and its picker shows the objekts the partner holds, newest first, loading more as it scrolls

#### Scenario: Partner with a list
- **WHEN** the partner has one bound have list on Trade
- **THEN** You get's button reads "Add from {name}'s lists", and its picker shows only that list's entries

#### Scenario: From a post
- **WHEN** rin.trades has the have list "doubles" and the sale list "spares" on Trade, and the sender opens the builder from rin.trades's post for "doubles"
- **THEN** You get's button reads "Add from rin.trades's list", and its picker shows only the entries of "doubles"

#### Scenario: From a WTB post
- **WHEN** the sender opens the builder from rin.trades's WTB post, and rin.trades has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From a Market listing
- **WHEN** the sender chooses Make offer on rin.trades's listing in an objekt's Market tab, which comes from the sale list "spares"
- **THEN** the builder opens with that objekt under You get, and You get's picker shows only the entries of "spares"

#### Scenario: From a conversation
- **WHEN** the sender opens the builder from their conversation with rin.trades, who has "doubles" and "spares" on Trade
- **THEN** You get's button reads "Add from rin.trades's lists", and its picker shows the entries of both lists

#### Scenario: From one of my lists
- **WHEN** the sender picks their sale list "doubles" under From, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: Artist narrows members
- **WHEN** the sender picks ARTMS under Artist
- **THEN** the member choice offers only ARTMS members, and the picker shows only ARTMS objekts

#### Scenario: Online and collection number
- **WHEN** the sender picks Offline and collection number 204Z
- **THEN** the picker shows only offline objekts of collections numbered 204Z

#### Scenario: Phone width
- **WHEN** the builder is open at 390 px
- **THEN** the two sides stack vertically, and the page doesn't scroll sideways

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for
