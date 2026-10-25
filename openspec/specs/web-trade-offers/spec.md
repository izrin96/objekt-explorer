# web-trade-offers Specification

## Purpose
Offers between two accounts on `apps/web`: specific objekts (or any copy) on each side with an optional unverified money top-up, sent and countered inside a conversation, accepted into a trade that reserves its objekts, and tracked under Trade › My trades (`/trade/mine`).

## Requirements

### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists bound to a Cosmo profile, at any of the recipient's linked addresses. When the recipient has no have or sale list bound to a Cosmo profile and shown on Trade, each MAY instead come from what the recipient holds at any of their linked addresses (their collection): a specific objekt or any copy. This is checked when the offer is sent: once the recipient has such a list, only its entries can be asked for.

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
- **WHEN** rin.trades has no list on Trade and holds SeoYeon 204Z only at a linked address that was private before this change
- **THEN** the picker shows it, and a request for it is sent

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

### Requirement: Checks before sending
Before an offer is sent, each specific objekt SHALL be checked against current on-chain ownership:
- each one must be owned by an address linked to the side that gives it;
- each one must be transferable;
- none may be in an accepted trade that is still in progress.

An offer that fails any of these checks SHALL be refused, naming the objekt. An objekt that is already in another open offer SHALL show a warning naming that offer, and SHALL still be sendable.

#### Scenario: Not transferable
- **WHEN** the user adds Kaede Divine01 322Z #14, which is not transferable
- **THEN** the builder marks it "Not transferable" and it can't be added

#### Scenario: Already offered elsewhere
- **WHEN** the user adds JiWoo Cream01 108Z #88, which is in open offer O-874
- **THEN** the builder shows "Also in open offer O-874" and the offer can still be sent

#### Scenario: Reserved
- **WHEN** the user adds an objekt that is part of an accepted trade in progress
- **THEN** the offer is refused for that objekt

### Requirement: Offer lifecycle
A conversation SHALL hold at most one open offer:
- **Counter**: when the recipient of the open offer sends one, it replaces that offer, which becomes Countered.
- **Replace**: when the sender of the open offer sends one, it replaces their own, which becomes Withdrawn.
- **Recipient** actions on an open offer: Accept, Decline or Counter.
- **Sender** actions on an open offer: Withdraw.
- **Expiry**: an open offer SHALL expire 7 days after it was sent, and can't be accepted after that.

#### Scenario: Counter
- **WHEN** rin.trades counters O-881 with O-882
- **THEN** O-881 shows Countered and collapses, and O-882 shows "waiting for you" to the original sender

#### Scenario: Expired
- **WHEN** a user opens an offer sent 8 days ago that nobody answered
- **THEN** it shows Expired and has no Accept action

### Requirement: Accept creates a trade
Accepting SHALL first recheck every objekt in the offer against current ownership and transferability. For any-copy items, the giver must hold enough copies that are transferable and not reserved. If the recheck passes, accepting SHALL:
- create a trade, shown as T-<number>, with one leg per objekt;
- reserve every specific objekt in it;
- cancel every other open offer that holds one of those objekts, with the reason "an objekt in it was traded", and notify both parties of each cancelled offer.

Of two offers holding the same objekt, the first accepted wins. Either party SHALL be able to cancel an in-progress trade until its first leg is verified (see `web-verified-trades`). Cancelling releases its reservations.

#### Scenario: First accepted wins
- **WHEN** O-874 and O-881 both hold JiWoo 108Z #88, and O-881 is accepted
- **THEN** O-881 becomes trade T-1042, and O-874 shows Cancelled with the reason

#### Scenario: Owner sold it meanwhile
- **WHEN** the recipient accepts an offer whose objekt has left the sender's wallet
- **THEN** the accept is refused, naming the objekt, and the offer stays open

#### Scenario: Racing accepts
- **WHEN** two offers holding the same objekt are accepted at the same moment
- **THEN** exactly one becomes a trade, and the other is refused as reserved

### Requirement: Offer builder
The builder SHALL open as a dialog, and as a full-height sheet on a phone. It shows:
- You give, with an Add picker over the sender's own objekts, entries on their bound have and sale lists first;
- You get, with an Add picker over the allowed list entries, labelled "Add from {name}'s lists"; or, when the partner has no have or sale list bound to a Cosmo profile and on Trade, an Add picker over their collection, labelled "Add from {name}'s collection", listing what they hold at their linked addresses, newest received first;
- the top-up and the note.

Opened for one of the partner's have or sale lists on Trade (from a Trade post or a Market listing), You get's Add picker SHALL list only that list's entries, labelled "Add from {name}'s list", with the same empty-picker reasons as over lists. Opened for any other list, such as a WTB post's want list, You get SHALL work as from a conversation.

Each pickable objekt SHALL show its flags (not transferable, reserved, in another open offer). Send SHALL stay disabled until the offer holds at least one objekt.

Each picker SHALL narrow by artist, member, season, class, collection number, and online or offline, in that order, with the same controls as the page filter bar, where artist, member, season, class and collection number each take more than one value, picking artists limits the member choices to those artists' members, and a Reset clears every filter but the matching switch; and SHALL load more as it scrolls, 200 objekts at a time, so a long list does not land at once. Each SHALL also offer a matching switch:
- You give: "Only what they want", off by default, keeps collections on the partner's discoverable want lists.
- You get: "Only what I want", off by default, keeps collections on the sender's want lists.

You give's picker SHALL offer a **List** choice, after the filters: All your objekts, the default, which shows the have and sale list entries first as above; or one of the sender's have, sale or general lists, each shown with its list type badge, which shows only the objekts on that list the sender still holds at a linked address, with no separate list-first section. The filters and the matching switch apply on top of List.

You get's picker over lists SHALL offer a **List** choice, after the filters, when the offer is not scoped to one list and the partner has a have or sale list on Trade: All their lists, the default; or one of those lists, shown as its name after its list type badge as in Compare with, which shows only that list's entries the sender may ask for. The filters and the matching switch apply on top of List. List changes only what the picker shows, not what may be sent. With a list picked, an empty picker SHALL say that nothing matches the filters, or else that nothing on that list is available.

An empty You get picker over lists SHALL say why: the partner lists nothing the sender may ask for; nothing matches the filters; or the partner no longer holds anything they listed. The first reason SHALL win over the filters. An empty picker over their collection SHALL say the partner holds nothing the sender can ask for, or that nothing matches the filters. In either picker, when the matching switch is on and no other filter is set, "nothing matches the filters" SHALL instead say that nothing held is on the other side's want lists ("rin.trades holds nothing on your want lists" in You get, "You hold nothing on rin.trades's want lists" in You give) and offer Turn off for the switch.

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

#### Scenario: Pick one of my lists
- **WHEN** the sender picks their sale list "doubles" under List, and holds 4 of its 6 entries
- **THEN** the picker shows those 4 objekts only

#### Scenario: Pick one of their lists
- **WHEN** the sender, in their conversation with rin.trades, opens You get's picker and picks rin.trades's sale list "spares" under List
- **THEN** the picker shows only the entries of "spares" the sender may ask for

#### Scenario: Their List hidden when scoped
- **WHEN** the sender opens You get's picker from rin.trades's post for the have list "doubles"
- **THEN** the picker offers no List choice, and shows only the entries of "doubles"

#### Scenario: Their List shown for one list
- **WHEN** rin.trades has exactly one have or sale list on Trade, and the offer is not scoped to it
- **THEN** You get's picker offers a List choice of All their lists and that list

#### Scenario: Their List hidden over a collection
- **WHEN** rin.trades has no have or sale list on Trade, and the sender opens You get's picker
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

#### Scenario: Switches start off
- **WHEN** a sender with a want list opens the builder
- **THEN** both "Only what they want" and "Only what I want" are off, and You get's picker lists every entry the sender may ask for

### Requirement: Hidden serials stay hidden in offers
When an entry on the recipient's list comes from a list that hides serial numbers, the offer builder's You get picker SHALL offer it only as "any copy" of its collection. Neither that entry nor the recipient's other copies of the collection SHALL be shown or pickable by serial through that entry.

A request asking for a specific objekt SHALL be refused unless that objekt is reachable through an entry on a list that shows serials, or it was under You give in the offer being countered, or it comes from the recipient's collection (see Offers name objekts on both sides). A copy listed only on hidden-serial lists can still be asked for as any copy.

Asking for any copy through hidden-serial entries that name specific objekts SHALL draw only on those objekts, while the recipient still holds them, transferable and unreserved. The picker's "N you can ask for" and the most copies a request may ask for SHALL count only those. An entry for the whole collection, on any list, opens every copy the recipient holds.

#### Scenario: Collection at a hidden-serial address
- **WHEN** rin.trades has no list on Trade and holds three SeoYeon 204Z at a linked address that hid serials before this change
- **THEN** the collection picker shows each copy by serial, and a request for #537 by its objekt id is sent

#### Scenario: Hidden list in the picker
- **WHEN** rin.trades's have list hides serials and lists SeoYeon 204Z #537, and the user opens You get
- **THEN** the picker shows SeoYeon 204Z as "Any copy · 1 you can ask for", with no serial and no specific copies

#### Scenario: Same collection on a visible list
- **WHEN** rin.trades also lists SeoYeon 204Z on a sale list that shows serials
- **THEN** the picker shows the specific copies from that sale list, and still no serial for the hidden list's entry

#### Scenario: Listed one, holds three
- **WHEN** rin.trades's hidden-serial list names one SeoYeon 204Z, and rin.trades holds three spare copies, none listed elsewhere
- **THEN** the picker shows "Any copy · 1 you can ask for", and a request for two copies is refused

#### Scenario: Listed token gone
- **WHEN** the only SeoYeon 204Z a hidden-serial list names has left rin.trades's wallet
- **THEN** the picker shows no SeoYeon 204Z from that list, even if rin.trades holds other copies

#### Scenario: Specific request through the API
- **WHEN** a request asks for SeoYeon 204Z #537 by its objekt id, and it is listed only on rin.trades's hidden-serial list
- **THEN** the offer is refused as unlisted, and nothing is sent

#### Scenario: Counter keeps a shown objekt
- **WHEN** rin.trades offers SeoYeon 204Z #537 under You give, and the user counters, keeping it under You get
- **THEN** the counter is sent, even though #537 is on a hidden-serial list

### Requirement: Estimated serials are marked
A serial for an objekt minted at or after Cosmo's v1 metadata cutoff (2026-06-04 08:07:02 UTC) is one the system estimated, not one Cosmo supplied. Wherever a trade surface shows a specific objekt's serial, an estimated serial SHALL read with a leading "~", as in "HyeRin 301Z ~#1203", and its accessible name SHALL say it is an estimate. A serial from before the cutoff SHALL read as today ("#1203"). An objekt not yet numbered SHALL show its name with no serial.

The trade surfaces are:
- the offer builder's pickers and its chosen items;
- offer cards in chat;
- My trades rows;
- the trade page's legs, including a wrong copy's serial (see `web-verified-trades`).

When any objekt shown in the builder, or any waiting leg on the trade page, has an estimated serial, the surface SHALL say once that "~" marks an estimated number which Cosmo may show differently, and to check the objekt in Cosmo before sending.

#### Scenario: New collection
- **WHEN** the user adds a copy of a collection minted last month to You give
- **THEN** the picker tile and the chosen item read "~#88", and the builder shows the note about estimated numbers once

#### Scenario: Older objekt
- **WHEN** an offer holds an objekt minted in 2025
- **THEN** its serial reads "#537" with no mark, and no note shows for it

#### Scenario: Not numbered yet
- **WHEN** an offer holds an objekt minted a minute ago, before the worker numbered it
- **THEN** the item shows its collection name with no serial

### Requirement: My trades
`/trade/mine` SHALL list the signed-in user's offers and trades in four groups:
- **Needs you**: open offers sent to the user;
- **Waiting on them**: open offers the user sent;
- **In progress**: accepted trades not yet ended;
- **History**: ended offers and trades, newest first, loading more as the user scrolls.

Each row SHALL show the partner, the O or T number, a one-line summary of both sides and its status. It links to the conversation, or to the trade page for a trade. The status chip SHALL be indigo for a trade in progress, green for a completed trade, and red for a cancelled, failed or expired offer or trade. Other statuses stay neutral. An in-progress trade's row SHALL also show a small ring filled to its share of verified transfers, with "n/m" beside it.

`/trade/mine/$tradeId` SHALL show a trade to its two parties only:
- a link back to My trades;
- its status, and what happens next (see `web-verified-trades`);
- when it was proposed and accepted, as steps of its progress (see `web-verified-trades`);
- each leg under You give or You get: the objekt and its state;
- Open chat, and an actions menu holding Report a problem and Cancel trade (see `web-verified-trades`).

Anyone else SHALL get the not-found page. A signed-out visitor SHALL be sent to `/login?redirect=` with the page's path.

#### Scenario: Needs you
- **WHEN** rin.trades counters the user's offer
- **THEN** My trades lists O-882 under Needs you, with "your turn"

#### Scenario: Not a party
- **WHEN** a third account opens `/trade/mine/1042`
- **THEN** the not-found page is shown

#### Scenario: Progress on a row
- **WHEN** one of a trade's two transfers has verified
- **THEN** its row under In progress shows a ring half filled, "1/2" and an indigo In progress chip

#### Scenario: Legs by side
- **WHEN** the user opens a trade where they give HyeRin 301Z #1203 and get SeoYeon 204Z #537
- **THEN** HyeRin 301Z #1203 is under You give and SeoYeon 204Z #537 under You get, with no from and to column

### Requirement: Offer rate limits
Sending an offer SHALL count toward the chat message limit. A first offer to someone without a conversation SHALL also count toward the new-conversation limit. A user SHALL have at most 20 open sent offers at a time.

#### Scenario: Too many open offers
- **WHEN** a user with 20 open sent offers sends another
- **THEN** it is refused with "You have too many open offers. Withdraw one first."

### Requirement: Objekt data in monospace
On Trade pages, in offer cards in chat and in the offer builder, objekt data SHALL be set in the monospace font with tabular figures:
- O and T numbers;
- serials, with any "~" estimate mark;
- the "n/m" share of verified transfers;
- top-up amounts;
- the numbers in a reputation line (see `web-verified-trades`);
- counts shown as numbers beside a label, such as a section's "(N)";
- transaction hashes;
- the partner's name in the trade page's header, which is often an address.

Other names of people, and names of lists, collections and members, and sentences around these values, SHALL stay in the body font.

#### Scenario: My trades row
- **WHEN** the user sees an in-progress trade row with one of two transfers verified
- **THEN** "T-1042" and "1/2" are monospace, and the partner's name and the summary are not

#### Scenario: Reputation line
- **WHEN** a reputation line reads "31 verified · 100% · since Mar 2025"
- **THEN** "31" and "100%" are monospace and the words are not

#### Scenario: Trade page header
- **WHEN** the user opens a trade with rin.trades
- **THEN** "rin.trades" in the header is monospace, while names in the banner's sentences are not
