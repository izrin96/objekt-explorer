## MODIFIED Requirements

### Requirement: Offer page
Every Make offer and Counter SHALL open the offer page, `/trade/@<handle>/offer` of the partner (see `web-trade-person-pages` Trade handle): on a Trade row and each post's menu, the person and post pages, a post's "+N" sheet, a near match's Make offer with it, Make offer for this objekt on an objekt from a Trade post, chat's Add to message and deal strip, Counter, the trade page's status card, and a Market tab listing. The page SHALL start as the dialog did from the same place, with the same address, prefill and matches.

#### Scenario: From a Trade row
- **WHEN** a signed-in viewer activates Make offer on rin.trades's row on For you under Mutual only
- **THEN** rin.trades's offer page opens, addressed to the row's lead post, with the matches the row's chip counts added

#### Scenario: Counter
- **WHEN** the sender activates Counter on rin.trades's offer O-881 in their conversation
- **THEN** rin.trades's offer page opens titled as a counter, with O-881's picks, top-up and note, and Send counter-offer

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

## ADDED Requirements

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
