# Spec Delta

## MODIFIED Requirements

### Requirement: Offers name objekts on both sides
An offer SHALL be sent inside a conversation from one account to the other. It has two sides:
- **You give**: specific objekts owned by one of the sender's linked addresses.
- **You get**: specific objekts, or "any copy" of a collection. Each comes from an entry on one of the recipient's have or sale lists bound to a Cosmo profile and put on Trade (idle or not), at any of the recipient's linked addresses. A bound list kept off Trade SHALL not be asked from. When the recipient has no such list and has "Let people ask for anything I hold" on (see `web-account`; off by default), each MAY instead come from what the recipient holds at any of their linked addresses (their collection): a specific objekt only, never any copy, since every copy there shows its serial. With no such list and the setting off, nothing SHALL be asked for, and an offer MAY still give objekts or a top-up. This is checked when the offer is sent: once the recipient has such a list, only its entries can be asked for.

Where an offer starts (a Trade row, a Market listing, a conversation) SHALL not narrow what may be asked for: every offer follows the rule above. The one exception is a recipient who takes asks from one post (see One post per offer).

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

### Requirement: Hidden serials stay hidden in offers
When an entry on the recipient's list comes from a list that hides serial numbers, the offer builder's You get picker SHALL offer it only as "any copy" of its collection. Neither that entry nor the recipient's other copies of the collection SHALL be shown or pickable by serial through that entry.

A request asking for a specific objekt SHALL be refused unless that objekt is reachable through an entry on a list that shows serials, or it was under You give in the offer being countered, or it comes from the recipient's collection (see Offers name objekts on both sides). A copy listed only on hidden-serial lists can still be asked for as any copy.

Asking for any copy SHALL draw only on the copies the recipient's entries open, while the recipient still holds them, transferable and unreserved: an entry for the whole collection, on any list, opens every copy the recipient holds; otherwise the entries open the specific objekts they name, on a list that hides serials or on one that shows them. Copies the same offer asks for by serial SHALL not count toward its any-copy asks. The picker's "N available" and the most copies a request may ask for SHALL count only what is left.

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

### Requirement: Matches added when the builder opens
Opened from a Trade row's Make offer, the builder SHALL add the sender's matches with the partner before it shows its sides, chosen by the rule the row's chip follows (see `web-trade-browse` Matches to the signed-in viewer):
- when the sender can swap with the partner (the row reads "You can swap N"), only the matches inside the pair of posts that score counts: You give gets one copy of each collection on the sender's post there that the partner's post wants, and You get one of each on the partner's post there that the sender's post wants;
- otherwise, only the direction with more matches, swaps and sales alike: one copy of each collection the sender has that the partner wants under You give, or one of each the partner has that the sender wants under You get, the other side left empty. When both directions match equally, You get SHALL be filled.

The matches SHALL be read live, by the rules and the Compare with list the row counts with, up to 200 a side. What may be sent is not narrowed: the pickers still offer every list on Trade.

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
- **WHEN** the sender can swap with rin.trades inside one pair of posts, the sender's post there has 210 collections rin.trades's post wants, and rin.trades's post has 5 the sender's post wants
- **THEN** You give holds 200 of them, the line says more matched than fit, and the side limit doesn't keep Send disabled

#### Scenario: Adding what was left out
- **WHEN** the builder opened for mina.k with only You get filled
- **THEN** the sender can still add Yooyeon 205Z, or anything else on their lists, under You give, and the offer sends with it

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
- **WHEN** 210 of the sender's collections match rin.trades's wants, and 5 of rin.trades's match the sender's
- **THEN** the line reads "Added 200 you give and 5 you get from your matches. Only 200 of the 210 that matched fit on You give."

### Requirement: Offer page layout
From `lg` up, the page SHALL hold a narrow column, the title over a sticky part with the top-up, the note, Sending as, the send hint and Send, beside a main area with the status line across its width and then You get and You give side by side. The title scrolls with the page. Back to <name> SHALL lead the page. Add SHALL open the picker in a sheet from the end edge, as wide as the main area, with the column still in view.

#### Scenario: Desktop
- **WHEN** the sender opens rin.trades's offer page at 1440 px with 200 matches added under You get
- **THEN** the column shows the title, top-up, note and Send, the line "Added 200 you get…" spans the main area, and You get and You give sit side by side under it

#### Scenario: Scrolled
- **WHEN** the sender scrolls down to the last rows of the 200 picks at 1440 px
- **THEN** the title has scrolled away, and the top-up, note and Send stay in view beside the sides

#### Scenario: Picker
- **WHEN** the sender activates Add from rin.trades's lists at 1440 px
- **THEN** the picker opens as a sheet over the main area, and the column with Send stays visible

### Requirement: Confirming or leaving the serial dialog
The serial dialog's footer SHALL read "{picked} of {count} picked" and "{count} of 200 on this side", with Cancel and a confirm button reading "Pick 1 copy" or "Pick {count} copies"; with nothing picked, "Remove all" when the collection had picks, else a disabled "Pick copies". Confirming SHALL set the picks of the copies the dialog shows in the picker's selection, and Done writes them to the builder. Enter SHALL never confirm: Space checks a row.

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
The serial dialog's room SHALL be 200 less the side's other picks in the picker. When its picks reach the room, each unchecked available row, an unchecked "Any serial", the count's + and "Select all" SHALL be disabled, and the footer SHALL read "This side is full. Remove one to pick another." On a full side, a tile with no picks SHALL do nothing when chosen; a tile with picks SHALL open the dialog, where copies can only be taken out.

#### Scenario: Room runs out
- **WHEN** the side holds 197 other picks and the sender chooses "Select all" in the twelve-copy HeeJin 101Z dialog
- **THEN** #8, #73 and #140 are checked, every other row is disabled, and the footer reads "This side is full. Remove one to pick another."

#### Scenario: Full side
- **WHEN** You get holds 200, two of them SeoYeon 204Z serials
- **THEN** choosing an unpicked tile does nothing, and the SeoYeon 204Z dialog lets the sender uncheck its two rows but check none
