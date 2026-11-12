# web-trade-offers Specification

## Purpose
Offers between two accounts on `apps/web`: specific objekts (or any copy) on each side with an optional unverified money top-up, sent and countered inside a conversation, accepted into a trade that reserves its objekts, and tracked under Trade › My trades (`/trade/mine`).

## Requirements

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

### Requirement: Checks before sending
Before an offer is sent, each specific objekt SHALL be checked against current on-chain ownership:
- each one must be owned by an address linked to the side that gives it;
- each one must be transferable;
- none may be in an accepted trade that is still in progress.

An offer that fails any of these checks SHALL be refused, naming the objekt. An objekt that is already in another of the user's own open offers SHALL show a warning naming that offer, and SHALL still be sendable. An open offer between two other members SHALL show nothing: no one learns what other members are offering.

#### Scenario: Not transferable
- **WHEN** the user adds Kaede Divine01 322Z #14, which is not transferable
- **THEN** the builder marks it "Not transferable" and it can't be added

#### Scenario: Already offered elsewhere
- **WHEN** the user adds JiWoo Cream01 108Z #88, which is in their own open offer O-874
- **THEN** the builder shows "Also in your open offer O-874" and the offer can still be sent

#### Scenario: In someone else's offer
- **WHEN** the user adds HeeJin A2 201Z #290, which is in open offer O-171 between two other members
- **THEN** the builder shows no warning about it, and the offer can still be sent

#### Scenario: Reserved
- **WHEN** the user adds an objekt that is part of an accepted trade in progress
- **THEN** the offer is refused for that objekt

#### Scenario: Promised to a trade asking for any copy
- **WHEN** the user holds JiWoo D333Z #76 and #80, an accepted trade in progress asks them for any copy of D333Z, and they add both to an offer
- **THEN** the offer is refused naming #80, the last added, as already promised to a trade in progress; with #80 taken out, #76 can be sent

### Requirement: Offer lifecycle
A conversation SHALL hold at most one open offer:
- **Counter**: when the recipient of the open offer sends one, it replaces that offer, which becomes Countered.
- **Replace**: when the sender of the open offer sends one, it replaces their own, which becomes Withdrawn.
- **Recipient** actions on an open offer: Accept, Decline or Counter.
- **Sender** actions on an open offer: Withdraw.
- **Expiry**: an open offer SHALL expire 7 days after it was sent, and can't be accepted after that.

Decline and Withdraw SHALL be held for 5 seconds before they reach the server. While held:
- a notice SHALL read "Offer declined" or "Offer withdrawn" and offer Undo;
- the offer card SHALL show "Declining…" or "Withdrawing…" with its own Undo in place of its actions, and focus SHALL move to that Undo;
- Undo, from the notice or the card, SHALL cancel the hold: nothing is sent, the partner is not notified, the card's actions return and focus returns to the button that started it.

When the hold ends the action SHALL be sent, also when the user has left the thread; a refusal shows the usual error notice and refreshes the offer. Closing or reloading the tab during a hold SHALL leave the offer open.

#### Scenario: Counter
- **WHEN** rin.trades counters O-881 with O-882
- **THEN** O-881 shows Countered and collapses, and O-882 shows "waiting for you" to the original sender

#### Scenario: Expired
- **WHEN** a user opens an offer sent 8 days ago that nobody answered
- **THEN** it shows Expired and has no Accept action

#### Scenario: Decline, then Undo
- **WHEN** izrin96 taps Decline on O-258 and taps Undo within 5 seconds
- **THEN** no request is sent, jiliijlilji gets no notification, O-258 shows Decline, Counter and Accept again, and focus is on Decline

#### Scenario: Decline goes through
- **WHEN** izrin96 taps Decline on O-258 and does nothing for 5 seconds
- **THEN** O-258 is declined, the card shows Declined, and jiliijlilji is notified as before

#### Scenario: Withdraw, then leave
- **WHEN** jiliijlilji taps Withdraw on their open offer and opens another conversation within 5 seconds
- **THEN** the offer is still withdrawn when the 5 seconds end

#### Scenario: Tab closed during the hold
- **WHEN** izrin96 taps Decline on O-258 and closes the tab within 5 seconds
- **THEN** O-258 stays open

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

### Requirement: Hidden serials stay hidden in offers
When an entry on the recipient's list comes from a list that hides serial numbers, the offer builder's You get picker SHALL offer it only as "any copy" of its collection. Neither that entry nor the recipient's other copies of the collection SHALL be shown or pickable by serial through that entry.

A request asking for a specific objekt SHALL be refused unless that objekt is reachable through an entry on a list that shows serials, or it was under You give in the offer being countered, or it comes from the recipient's collection (see Offers name objekts on both sides). A copy listed only on hidden-serial lists can still be asked for as any copy.

Asking for any copy through hidden-serial entries that name specific objekts SHALL draw only on those objekts, while the recipient still holds them, transferable and unreserved. The picker's "N available" and the most copies a request may ask for SHALL count only those. An entry for the whole collection, on any list, opens every copy the recipient holds.

An any-copy item SHALL read "Any serial · N available" in You get's picker and "Any serial · N held" in You give, N being the copies the holder spares. When the same copies are not also offered by serial, as on a list that hides serials, the picked item SHALL show a count from 1 up to N under its tile, with − and + buttons and "They choose the serial"; − at 1 takes it out, and + stops at N or at the side's 50. When they are, the item SHALL stay a single pick, and more copies are picked by serial. Each copy SHALL count toward the 50, and You get SHALL list the item once with "× N" when N is more than 1, as the sent offer's card does. The offer asks for each copy as its own item. When the holder now spares fewer copies than the count, the item SHALL read "Only N available" and block Send until the count comes down. On You give, a counter's any-copy ask for several copies SHALL take that many of the sender's own copies; when they hold fewer, the copies found and the rest still waiting SHALL each be removable on their own.

#### Scenario: Several copies of one collection
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on a list that hides serials, spares three copies, and the user picks it and presses + twice
- **THEN** the picker reads 3, + is disabled, You get shows "SeoYeon 204Z × 3", the side counts 3 of 50, and the offer asks for three copies

#### Scenario: Copies shown by serial
- **WHEN** rin.trades lists SeoYeon 204Z for the whole collection on a list that shows serials, and spares three copies
- **THEN** the picker shows "Any serial · 3 available" and #537, #812 and #904; Any serial picks one copy with no count, and the user picks exact serials for more

#### Scenario: Collection at a hidden-serial address
- **WHEN** rin.trades has no list on Trade and holds three SeoYeon 204Z at a linked address that hid serials before this change
- **THEN** the collection picker shows each copy by serial, and a request for #537 by its objekt id is sent

#### Scenario: Hidden list in the picker
- **WHEN** rin.trades's have list hides serials and lists SeoYeon 204Z #537, and the user opens You get
- **THEN** the picker shows SeoYeon 204Z as "Any serial · 1 available", with no serial and no specific copies

#### Scenario: Same collection on a visible list
- **WHEN** rin.trades also lists SeoYeon 204Z on a sale list that shows serials
- **THEN** the picker shows the specific copies from that sale list, and still no serial for the hidden list's entry

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

### Requirement: Estimated serials are marked
A serial is exact when Cosmo supplied it or when it follows from one Cosmo supplied. That holds for an objekt minted before Cosmo's v1 metadata cutoff (2026-06-04 08:07:02 UTC), and for a later objekt that sits in an anchored range: a reserved token range of its collection that also holds a pre-cutoff objekt's serial or a reported serial recorded as a manual anchor. Every other serial of an objekt minted at or after the cutoff is one the system estimated. That covers an offline objekt in a range with no anchor, an objekt outside every stored range, and every post-cutoff objekt of an online collection.

Wherever a trade surface shows a specific objekt's serial, an estimated serial SHALL read with a leading "~", as in "HyeRin 301Z ~#1203", and its accessible name SHALL say it is an estimate. An exact serial SHALL read as today ("#1203"). An objekt not yet numbered SHALL show its name with no serial.

The trade surfaces are:
- the offer builder's pickers and its chosen items;
- offer cards in chat;
- My trades rows;
- the trade page's legs, including a wrong copy's serial (see `web-verified-trades`).

When any objekt shown in the builder, or any waiting leg on the trade page, has an estimated serial, the surface SHALL say once that "~" marks an estimated number which Cosmo may show differently, and to check the objekt in Cosmo before sending.

#### Scenario: New collection
- **WHEN** the user adds a copy of an offline collection first minted last month, none of whose ranges holds an anchor, to You give
- **THEN** the picker tile and the chosen item read "~#88", and the builder shows the note about estimated numbers once

#### Scenario: Older objekt
- **WHEN** an offer holds an objekt minted in 2025
- **THEN** its serial reads "#537" with no mark, and no note shows for it

#### Scenario: New mint in an anchored range
- **WHEN** an offer holds an offline objekt minted last week whose reserved range also holds objekts minted before the cutoff
- **THEN** its serial reads "#1203" with no mark, and no note shows for it

#### Scenario: Reported serial anchors a range
- **WHEN** a range of a post-cutoff offline collection holds a manual anchor, and an offer holds another objekt of that range
- **THEN** that objekt's serial reads with no mark, while an objekt in a range of the same collection with no anchor reads with "~"

#### Scenario: New mint of an online collection
- **WHEN** an offer holds an objekt of an online collection minted after the cutoff
- **THEN** its serial reads with "~"

#### Scenario: Not numbered yet
- **WHEN** an offer holds an objekt minted a minute ago, before the worker numbered it
- **THEN** the item shows its collection name with no serial

### Requirement: My trades
`/trade/mine` SHALL list the signed-in user's offers and trades in four groups:
- **Needs you**: open offers sent to the user;
- **Waiting for them**: open offers the user sent;
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
Sending an offer SHALL count toward the chat message limit. A user SHALL have at most 20 open sent offers at a time.

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

### Requirement: Objekts sent before the accept
When a specific objekt of an open offer has moved from its giver to the other party since the offer was sent, the offer card SHALL mark that objekt as already sent, for both parties, while the offer is open. The mark SHALL appear within 3 minutes of the indexer recording the transfer, without a reload, and go away the same way if the objekt goes back to its giver. Any-copy items are never marked.

#### Scenario: One side sent
- **WHEN** only the sender has sent their objekt
- **THEN** within 3 minutes the card marks that objekt as sent, for both parties

#### Scenario: Sent back
- **WHEN** the sender's objekt was marked as sent, and the recipient sends it back to the sender
- **THEN** within 3 minutes the mark goes away, and the offer stays open

#### Scenario: Any-copy item
- **WHEN** an offer asks for any copy of Nien 205Z, and the recipient has sent one copy
- **THEN** the any-copy item is not marked

#### Scenario: Sent before the offer
- **WHEN** the giver sent the objekt to the other party before the offer was made
- **THEN** it is not marked as sent

### Requirement: Accept hint when everything was sent
When both sides of an open offer hold objekts and every one is a specific objekt marked as sent, the card SHALL show a hint above its actions:
- to the recipient: both sides are already delivered, and pressing Accept records the trade;
- to the sender: both sides are already delivered, and the trade is recorded once the recipient accepts.

The hint SHALL ignore the top-up, change nothing about the offer, and go away once the offer is no longer open.

#### Scenario: Both sides sent before anyone accepted
- **WHEN** O-180 offers Chaewon 361Z #87 for Chaeyeon 303A #12, and both parties send their objekt to the other on chain without pressing Accept
- **THEN** the recipient sees the hint to press Accept, and the sender sees that the trade is recorded once the recipient accepts

#### Scenario: Accept after the hint
- **WHEN** the recipient presses Accept on that offer
- **THEN** the trade is created, both legs verify from the earlier transfers, and it shows Completed

#### Scenario: Any-copy item in the offer
- **WHEN** an offer holds an any-copy item, and every specific objekt in it was sent
- **THEN** there is no hint

#### Scenario: Offer declined
- **WHEN** the recipient declines an offer showing the hint
- **THEN** the hint goes away

### Requirement: Picks in the builder
Each side of the offer builder SHALL show its picks as a grid of small cards, as many a row as the side's width allows (six at 1280 px, four on a phone), each with its art, collection code and serial (or its any-copy count) and a remove button named for the objekt. The grid SHALL grow with the page rather than scroll inside its side; the column keeps the top-up, the note and Send in reach whatever the count, and on a phone Send stays in the bottom bar. A pick's warnings SHALL show with its card.

#### Scenario: Large offer
- **WHEN** the sender holds 24 picks under You give and 31 under You get
- **THEN** each side shows its picks six a row at 1280 px, the page scrolls to show them all, and the column with the top-up, note and Send stays on screen

#### Scenario: Remove one
- **WHEN** the sender chooses the remove button on SeoAh 203Z #722
- **THEN** that pick leaves the side, and the side's count drops by one

#### Scenario: Several copies
- **WHEN** You get holds 3 copies of Lynn 301A in any serial
- **THEN** one card shows Lynn 301A marked "×3"

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

### Requirement: Matches added when the builder opens
Opened from a Trade row's Make offer, the builder SHALL add the sender's matches with the partner before it shows its sides, chosen by the rule the row's chip follows (see `web-trade-browse` Matches to the signed-in viewer):
- when the sender can swap with the partner (the row reads "You can swap N"), only the matches inside the pair of posts that score counts: You give gets one copy of each collection on the sender's post there that the partner's post wants, and You get one of each on the partner's post there that the sender's post wants;
- otherwise, only the direction with more matches, swaps and sales alike: one copy of each collection the sender has that the partner wants under You give, or one of each the partner has that the sender wants under You get, the other side left empty. When both directions match equally, You get SHALL be filled.

The matches SHALL be read live, by the rules and the Compare with list the row counts with, up to 50 a side. What may be sent is not narrowed: the pickers still offer every list on Trade.

#### Scenario: A person the sender can swap with
- **WHEN** the sender's post P2 pairs have list "yooyeon spares" with want list "hyerin and kaede", jun.p's post holds Hyerin 302Z and wants Yooyeon 205Z, jun.p also holds 3 DCOs that the sender's other post P1 wants through its rule, and the sender chooses Make offer on jun.p's row, which reads "You can swap 1"
- **THEN** the builder opens with Yooyeon 205Z under You give and Hyerin 302Z under You get, and none of the DCOs

#### Scenario: A person who matches both ways across posts
- **WHEN** mina.k holds 2 DCOs that the sender's post P1 wants through its rule and wants Yooyeon 205Z from the sender's post P2, so her row reads "They have 2 you want · You have 1 they want" with no Can swap mark, and the sender chooses Make offer on her row
- **THEN** the builder opens with the 2 DCOs under You get and nothing under You give, and the line reads "Added 2 you get from your matches"

#### Scenario: From a Trade row
- **WHEN** rin.trades's row reads "They have 5 you want · You have 3 they want" with no Can swap mark, and the sender chooses Make offer on it
- **THEN** the builder opens with 5 under You get and nothing under You give

#### Scenario: Equal both ways
- **WHEN** a person's row reads "They have 2 you want · You have 2 they want" with no Can swap mark, and the sender chooses Make offer on it
- **THEN** the builder opens with 2 under You get and nothing under You give

#### Scenario: Under Compare with
- **WHEN** the sender has Compare with set to their want list "ARTMS wants" on Browse, and chooses Make offer on rin.trades's row, which reads "They have 3 you want" only
- **THEN** You get holds only the collections on "ARTMS wants" that rin.trades has, as the row counted them

#### Scenario: Over the limit
- **WHEN** the sender can swap with rin.trades inside one pair of posts, the sender's post there has 60 collections rin.trades's post wants, and rin.trades's post has 5 the sender's post wants
- **THEN** You give holds 50 of them, the line says more matched than fit, and the side limit doesn't keep Send disabled

#### Scenario: Adding what was left out
- **WHEN** the builder opened for mina.k with only You get filled
- **THEN** the sender can still add Yooyeon 205Z, or anything else on their lists, under You give, and the offer sends with it

### Requirement: Reading the matches
While the read runs, the builder SHALL show its title, a status line reading "Adding your matches…", a placeholder for each side and Cancel, and no picker, send hint or Send. The status line SHALL stay in one place from the first frame to the close, then say what was added or that the read failed. Focus SHALL start on the page's title.

#### Scenario: Loading
- **WHEN** the builder is reading the matches
- **THEN** it shows its title, the status line "Adding your matches…", a placeholder for each side and Cancel, with no picker, no "Add at least one objekt to either side." hint and no Send, and focus is on the page's title

#### Scenario: One status line throughout
- **WHEN** the read ends and the sides appear
- **THEN** "Adding your matches…" is replaced in the same status line by what was added, and no second status line or alert appears

### Requirement: Matches of one post
From Make offer on this post, or a conversation whose newest card is the partner's post card with a match, the builder SHALL add only matches through that post's lists: under You get those on its have or sale list, under You give those on its want list. When the sender can swap with the partner and that post is the partner's half of the pair the score counts, the builder SHALL add that pair's matches, as from the row; otherwise it SHALL add only the direction with more of the post's matches, You get on a tie. You get's picker SHALL open on the post's have or sale list, as from a Market listing, else on All their lists. What may be sent is not narrowed. The line SHALL name the post's list.

#### Scenario: One post of two
- **WHEN** rin.trades has the WTT post "doubles" and "wants", and the WTS post "spares", open to swaps, which reads "2 you want", rin.trades's row reads "You can swap 3" through "doubles" and the sender's post "extras" and "binary hunt", and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 3 the pair swaps under each side, none from "spares" or through the sender's other posts, the line reads "Added from doubles: 3 you give and 3 you get", and You get's picker opens on "doubles"

#### Scenario: A post that matches both ways across the sender's posts
- **WHEN** rin.trades's WTT post "doubles" has 2 collections the sender's post P1 wants and wants 1 on the sender's post P2, rin.trades is not Can swap through it, and the sender chooses Make offer on this post on "doubles"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and the line reads "Added from doubles: 2 you get"

#### Scenario: Another post of a Can swap person
- **WHEN** rin.trades's row reads "You can swap 3" through the post "doubles", rin.trades also has the WTS post "spares", open to swaps, which reads "2 you want", and the sender chooses Make offer on this post on "spares"
- **THEN** the builder opens with the 2 under You get, nothing under You give, and none from "doubles"

#### Scenario: WTB post
- **WHEN** jun.k has the WTT post "extras" and the WTB post "hunting", which reads "2 you have", and the sender chooses Make offer on this post on "hunting"
- **THEN** the builder opens with 2 under You give, nothing under You get, the line "Added from hunting: 2 you give", and You get's picker on All their lists

#### Scenario: From a conversation with a post card
- **WHEN** the sender opens Make offer in their conversation with rin.trades, whose newest card is the post card for "doubles" with "They have 2 you want"
- **THEN** the builder opens with the matches through "doubles" and its want list read now, chosen by the same rule, which may differ from the 2 saved on the card, and the line names "doubles"

#### Scenario: Asking past the post
- **WHEN** the builder opened from "doubles", and the sender switches You get's List to "spares" and adds an objekt from it
- **THEN** the offer sends with that objekt

### Requirement: Which copy a match adds
For You give, a match SHALL add the sender's copy with the highest serial they can send, preferring one in none of their other open offers. For You get, it SHALL ask for any serial where the partner listed the collection as any copy or on a list that hides serials, and otherwise for the partner's copy with the lowest serial they can send. A copy that isn't transferable or is reserved by a trade SHALL never be added.

#### Scenario: Highest serial given
- **WHEN** the sender holds SeoYeon 204Z #12 and #537, both sendable, and rin.trades wants 204Z
- **THEN** You give holds #537

#### Scenario: Copy in another open offer
- **WHEN** the sender's #537 is in their open offer to kaede.k and #12 is in none
- **THEN** You give holds #12

#### Scenario: Any serial asked
- **WHEN** rin.trades lists HaSeul 302Z as any copy on "doubles"
- **THEN** You get asks for one copy of 302Z, its tile showing any serial

#### Scenario: Lowest serial asked
- **WHEN** rin.trades lists HaSeul 302Z #88 and #140 by serial, both sendable
- **THEN** You get holds #88

### Requirement: The added-matches line
When matches were added, the status line SHALL say how many it added to each side, with Remove matches, its counts fixed when the builder opens, and SHALL say when more matched than fit a side. It SHALL be ink on the progress tint, led by the swap arrows, with its numbers in mono. With one side added it names that side only, and "from your match" for 1. From a post it starts "Added from {list}:".

#### Scenario: Line
- **WHEN** the builder opens with 3 under You give and 5 under You get from the matches
- **THEN** the line reads "Added 3 you give and 5 you get from your matches" with Remove matches

#### Scenario: One side only
- **WHEN** the matches add 2 under You give and nothing under You get
- **THEN** the line reads "Added 2 you give from your matches"

#### Scenario: One match
- **WHEN** the matches add 1 under You get and nothing under You give
- **THEN** the line reads "Added 1 you get from your match"

#### Scenario: More matched than fit
- **WHEN** 60 of the sender's collections match rin.trades's wants, and 5 of rin.trades's match the sender's
- **THEN** the line reads "Added 50 you give and 5 you get from your matches. Only 50 of the 60 that matched fit on You give."

### Requirement: Remove matches and Undo
Remove matches SHALL take out every pick the matches added that is still there and keep the picks the sender added. The line SHALL then keep its slot and read "Took out {count} matches" ("1 match" for one) with Undo, and focus SHALL move to Undo. Undo SHALL put those picks back and show the line as it read when the builder opened. Once the sender has removed every added pick one by one, the line SHALL go.

#### Scenario: Remove matches keeps the sender's picks
- **WHEN** the builder opened with 3 and 5 from the matches, and the sender adds JiWoo 101Z under You get and then chooses Remove matches
- **THEN** both sides lose the 8 added matches, You get keeps JiWoo 101Z, the line reads "Took out 8 matches" with Undo, and focus is on Undo

#### Scenario: Undo
- **WHEN** the line reads "Took out 8 matches" and the sender chooses Undo
- **THEN** the 8 picks are back, the line reads "Added 3 you give and 5 you get from your matches", and focus is on Remove matches

#### Scenario: Counts stay as opened
- **WHEN** the sender removes one added pick from You get
- **THEN** the line still reads "Added 3 you give and 5 you get from your matches"

#### Scenario: Every added pick removed by hand
- **WHEN** the sender removes each of the 8 added picks with its own remove button
- **THEN** the line goes

### Requirement: Closing after matches were added
Leaving the page (see Leaving the offer page) SHALL ask nothing when the added picks are unchanged, or when the builder holds nothing (no picks, no top-up amount and no note), including after Remove matches. Otherwise leaving SHALL ask as for any draft.

#### Scenario: Close unchanged
- **WHEN** the sender activates Back without changing the added picks
- **THEN** the page is left without asking to discard

#### Scenario: Close empty after Remove matches
- **WHEN** the sender chooses Remove matches with no picks of their own, no top-up amount and no note, and then activates Cancel
- **THEN** the page is left without asking to discard

#### Scenario: Close with the sender's own pick
- **WHEN** the sender chooses Remove matches while JiWoo 101Z they added is still under You get, and then activates Back
- **THEN** it asks to discard, as for any draft

### Requirement: When no matches are added
The builder SHALL add no matches when it opens from a counter-offer, from a Market listing, from Make offer for this objekt on a Trade post, from Make offer on this post on a post whose strips count no match, or from a conversation whose newest card is not the partner's post card with a match; those keep their own prefill or open empty, with no status line. No top-up SHALL be added for a match through a sale list: the sender sets one.

#### Scenario: Sale-only match
- **WHEN** rin.trades has HaSeul 302Z only on a Sell only sale list, and the sender wants it
- **THEN** You get holds 302Z and no top-up is set

#### Scenario: Wanted for buying only
- **WHEN** sodalove wants JiWoo D337Z on a want list open to buying only, and the sender has it on a sale list
- **THEN** You give holds D337Z and no top-up is set

#### Scenario: Counter-offer
- **WHEN** the sender counters rin.trades's offer
- **THEN** the builder holds the countered offer's objekts and no matches are added

#### Scenario: Conversation without a post card
- **WHEN** the sender opens Make offer in a conversation whose newest card is an objekt card
- **THEN** the builder opens empty

#### Scenario: From one objekt of a post
- **WHEN** the sender starts from Make offer for this objekt on rin.trades's "doubles", though rin.trades's row reads "You can swap 3"
- **THEN** the builder adds that objekt only, and no matches and no status line about matches

### Requirement: A failed read
If reading the matches fails, the builder SHALL open empty, and the status line SHALL read "Couldn't add your matches. Add objekts below." in the warning tone, never as an alert.

#### Scenario: Read fails
- **WHEN** reading the matches fails
- **THEN** the builder opens empty, the status line reads "Couldn't add your matches. Add objekts below." in the warning tone, and both pickers work

### Requirement: Ratio hint in the builder
In the offer builder, a get-side item drawn from an entry of the partner's have list that carries a ratio, its own or its list's, SHALL show the ratio chip with "They ask N for this", in the picker and once picked. The hint SHALL NOT block sending, change what is added when the builder opens, or warn about the counts on either side.

#### Scenario: Picking an item with a ratio
- **WHEN** the viewer opens the builder with jinsoul.blue, whose have list holds Lynn SCO with ratio 2, and picks it
- **THEN** the tile reads "1:2" with "They ask 2 for this", and the offer can be sent with any number of items on the give side

#### Scenario: No ratio
- **WHEN** a picked item's entry has no ratio
- **THEN** no chip shows

### Requirement: Offer page
Every Make offer and Counter SHALL open the offer page, `/trade/@<handle>/offer` of the partner (see `web-trade-person-pages` Trade handle): on a Trade row and each post's menu, the person and post pages, a post's "+N" sheet, a near match's Make offer with it, Make offer for this objekt on an objekt from a Trade post, chat's Add to message and deal strip, Counter, the trade page's status card, and a Market tab listing. The page SHALL start as the dialog did from the same place, with the same address, prefill and matches.

#### Scenario: From a Trade row
- **WHEN** a signed-in viewer activates Make offer on rin.trades's row on For you under Mutual only
- **THEN** rin.trades's offer page opens, addressed to the row's lead post, with the matches the row's chip counts added

#### Scenario: Counter
- **WHEN** the sender activates Counter on rin.trades's offer O-881 in their conversation
- **THEN** rin.trades's offer page opens titled as a counter, with O-881's picks and top-up, an empty note (O-881's note stays rin.trades's), and Send counter-offer

#### Scenario: From a Market listing
- **WHEN** the sender activates Make offer on rin.trades's listing of SeoYeon 204Z #537 from sale list "spares"
- **THEN** rin.trades's offer page opens with that objekt under You get, its picker opening on "spares"

#### Scenario: From an objekt on a post
- **WHEN** the sender activates Make offer for this objekt on SeoYeon 204Z opened from rin.trades's have list "doubles"
- **THEN** rin.trades's offer page opens addressed to "doubles", asking for SeoYeon 204Z (see Ask for one objekt of a post)

### Requirement: Offer page address
The page's URL SHALL say how the offer starts: the list or the conversation it is addressed to, which matches to add (the row's under its Compare with list and Mutual only, or one post's), a near match to add, the countered offer, a Market listing's objekt and sale list, or one collection of a Trade post's have or sale list, and where to return. It SHALL never carry the sender's picks; a Market link names only the one listed objekt it starts from, and a Trade post's objekt link only that collection and list, never a copy. Reopening the URL SHALL start the offer again from the same point.

#### Scenario: Reload
- **WHEN** the sender reloads the page after adding one objekt of their own to the added matches
- **THEN** the browser asks to leave, and after leaving the page opens again with the matches added and without that objekt

#### Scenario: Countered offer not theirs
- **WHEN** the URL names an offer the viewer is not a party to, or one that is no longer open
- **THEN** the page says the offer can't be countered and offers Back

#### Scenario: Reload from a post's objekt
- **WHEN** the sender reloads an offer page opened by Make offer for this objekt on rin.trades's "doubles"
- **THEN** the page asks for that collection on "doubles" again, choosing the copy by what the list holds now

### Requirement: Offer page access
A signed-out visitor SHALL be sent to sign in and back. A handle other than the partner's canonical one SHALL redirect as on the person page, keeping the rest of the URL. A handle with no account SHALL show not found.

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/@rin.trades/offer`
- **THEN** sign in opens, and after signing in they are back on that page

#### Scenario: Other nickname
- **WHEN** the sender opens `/trade/@rin.alt/offer?post=<spares slug>`, rin.alt being linked to rin.trades's account
- **THEN** the browser is at `/trade/@rin.trades/offer?post=<spares slug>`

### Requirement: Offer page layout
From `lg` up, the page SHALL hold a narrow column, the title over a sticky part with the top-up, the note, Sending as, the send hint and Send, beside a main area with the status line across its width and then You get and You give side by side. The title scrolls with the page. Back to <name> SHALL lead the page. Add SHALL open the picker in a sheet from the end edge, as wide as the main area, with the column still in view.

#### Scenario: Desktop
- **WHEN** the sender opens rin.trades's offer page at 1440 px with 50 matches added under You get
- **THEN** the column shows the title, top-up, note and Send, the line "Added 50 you get…" spans the main area, and You get and You give sit side by side under it

#### Scenario: Scrolled
- **WHEN** the sender scrolls down to the last rows of the 50 picks at 1440 px
- **THEN** the title has scrolled away, and the top-up, note and Send stay in view beside the sides

#### Scenario: Picker
- **WHEN** the sender activates Add from rin.trades's lists at 1440 px
- **THEN** the picker opens as a sheet over the main area, and the column with Send stays visible

### Requirement: Offer page on a phone
Below `lg`, the page SHALL stack the title, the status line, You get, You give, the top-up and the note, with Send and the send hint in a bottom bar, and the picker SHALL take the full screen. The page SHALL not scroll sideways.

#### Scenario: Phone
- **WHEN** the sender opens the offer page at 390 px
- **THEN** the sides stack, Send sits in the bottom bar, and Add opens the picker full screen

### Requirement: Leaving the offer page
Back to <name> and Cancel SHALL return to the page the offer was started from, or to the partner's person page when there is none. Leaving by Back, Cancel, a link or the browser's back SHALL ask as Closing after matches were added says; a reload or closing the tab SHALL get the browser's own prompt under the same rule. Sending SHALL go to the conversation, and from a conversation return there.

#### Scenario: Back to chat
- **WHEN** the sender opens Make offer from their conversation with rin.trades and activates Cancel with nothing changed
- **THEN** the conversation opens again

#### Scenario: Link away with a draft
- **WHEN** the sender has added a note and activates the Trade tab in the header
- **THEN** they are asked to discard the draft, and staying keeps the page as it was

### Requirement: Ask for one objekt of a post
Started from one collection of a Trade post's have or sale list, the builder SHALL be addressed to that post and ask for that collection under You get, as a copy the sender may ask for on that list: any copy where the list names the collection or hides its serials, else the first copy that list offers that can be sent. You get's picker SHALL open on that list. With no such copy, the pick SHALL show as one that can't be sent (see Picks that can't be sent).

#### Scenario: Collection entry
- **WHEN** the sender starts from SeoYeon 204Z on rin.trades's have list "doubles", which names the collection with no copy
- **THEN** You get holds any copy of SeoYeon 204Z from "doubles", and You get's picker opens on "doubles"

#### Scenario: Hidden serials
- **WHEN** "doubles" hides its serials
- **THEN** You get holds any copy of SeoYeon 204Z, with no serial shown

#### Scenario: Entries that name copies
- **WHEN** "doubles" names SeoYeon 204Z #12 and #40, and #12 is in an accepted trade still in progress
- **THEN** You get holds #40, and the sender MAY swap it for another copy in the picker

#### Scenario: Nothing left to ask for
- **WHEN** rin.trades no longer holds any copy of SeoYeon 204Z that "doubles" names
- **THEN** You get holds SeoYeon 204Z outlined as a pick that can't be sent, with its reason, and Send is disabled until it is removed

#### Scenario: While it looks
- **WHEN** the partner's lists are still loading
- **THEN** the asked objekt shows as loading, as a counter's any-copy ask does, and Send stays disabled

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

### Requirement: Confirm a lopsided accept
An offer is lopsided when both sides hold objekts and one side holds at least 5 times as many as the other, each copy counting as one. Accept on a lopsided open offer SHALL open a confirmation before any request is sent. It SHALL state how many objekts the recipient gets and gives, and that accepting trades all of them. When the card offers Counter, it SHALL say Counter trades only some, and offer Counter beside Cancel and Accept. Any other offer SHALL accept on one press.

#### Scenario: Seventeen for one
- **WHEN** rin.trades offers the user 17 objekts for 1, and the user presses Accept on the card
- **THEN** no request is sent, and a dialog says the user gets 17 and gives 1, that accepting trades all of them, and that Counter trades only some

#### Scenario: Confirmed
- **WHEN** the user presses Accept in that dialog
- **THEN** the offer is accepted as any offer is, and the dialog closes

#### Scenario: Cancelled
- **WHEN** the user presses Cancel in that dialog
- **THEN** the offer stays open with Decline, Counter and Accept, and focus returns to Accept

#### Scenario: Counter from the dialog
- **WHEN** the user presses Counter in that dialog
- **THEN** the dialog closes and the offer builder opens as it does from the card's Counter

#### Scenario: The recipient gives the larger side
- **WHEN** rin.trades offers the user 1 objekt for 5, and the user presses Accept
- **THEN** the dialog opens, saying the user gets 1 and gives 5

#### Scenario: Four for one
- **WHEN** rin.trades offers the user 4 objekts for 1, and the user presses Accept
- **THEN** the offer is accepted without a dialog

#### Scenario: One side empty
- **WHEN** rin.trades offers the user 6 objekts and a top-up and asks for no objekt, and the user presses Accept
- **THEN** the offer is accepted without a dialog

#### Scenario: No Counter on the card
- **WHEN** a lopsided offer's card offers no Counter, and the user presses Accept
- **THEN** the dialog names the counts, says nothing of Counter, and offers only Cancel and Accept
