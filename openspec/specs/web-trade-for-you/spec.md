# web-trade-for-you Specification

## Purpose
The account-wide trade match view on `apps/web` at `/trade/for-you`: who the user could trade with across all their have, sale and want lists, ranked by how mutual the trade is, using current ownership.

## Requirements

### Requirement: Account-wide matches
`/trade/for-you` SHALL list the other accounts whose discoverable have, sale or want lists overlap the signed-in user's have, sale and want lists, one card per account. A sale list counts as a have list, except against a want list open to Trade only, which it never matches (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings; want lists always take part. The user's own account SHALL never appear. `/trade` SHALL open the Browse feed (see `web-trade-browse`), not For you. A signed-out visitor SHALL be sent to `/login?redirect=/trade/for-you`, keeping the search parameters.

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a partner's discoverable lists overlap two of them
- **THEN** the partner appears once, with the matched objekts from both of the user's lists

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a partner wants it
- **THEN** SeoYeon 204Z does not count toward that partner

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a partner wants a collection on it
- **THEN** that collection does not count toward the partner, and Compare with does not offer the list

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade/for-you`
- **THEN** the page asks them to create one, with a link to their lists

#### Scenario: Opened from Browse
- **WHEN** the user follows a post's See in For you link to `/trade/for-you?match=mutual&partner=<id>`
- **THEN** Mutual only is selected, and that partner's card is scrolled into view and briefly highlighted

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login?redirect=%2Ftrade%2Ffor-you%3Flist%3Dspares`

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed

### Requirement: Both directions and mutual-first ranking
Each partner SHALL be shown as a row in the list, built from the Trade card parts (see `web-trade-browse`). Each row SHALL sit on the card surface in a bordered box, with a gap between rows, so it reads apart from the page background. Rows SHALL be ordered by:
1. the smaller of the two counts (the mutual score), highest first;
2. then the sum of both counts;
3. then the partner's most recently updated matched list.

**Row header.** In one line from `sm` up: the avatar; the name with socials over the reputation line; the match chip; a monospace "N lists" button; the ⋯ menu; and a chevron button that opens and closes the row. The "N lists" button SHALL open a popover naming the partner's matched lists, each with its list type and linking to its list page. Below `sm`, the chip and "N lists" SHALL wrap under the name.

**Open and closed.** An active partner's row SHALL start open. An idle partner's row SHALL start closed (see Idle partners rank last). The chevron SHALL be a button with `aria-expanded` that names the partner. Opening or closing a row SHALL not move the rows above it. The state is per visit, not saved. A partner reached through a `partner=` link SHALL be opened.

**Row body.** It sits under the name, indented to line up with it. It SHALL hold two columns, side by side from `sm` up and stacked below:
- "They have, you want (N)";
- "You have, they want (N)".

Each column shows its matched objekts as 3rem-wide thumbnails, each with a monospace caption of at most two lines naming the collection. A column SHALL show at most 11 counted objekts, then a "+N" tile for the rest, and is left out when it has nothing counted and nothing not counted.

Objekts left out by the ownership rule SHALL follow the counted ones in their direction's column, at most 4 of them. Each is greyed, struck through in the destructive colour, and captioned with its reason ("no longer owned", "not transferable"). They SHALL not count toward N or the chip. When any are shown, the footer SHALL carry one line saying they are on the partner's or the user's list but aren't counted, and why.

**Row footer.** Hide partner as a ghost button, then the Trade card actions.

#### Scenario: Mutual beats one-sided
- **WHEN** partner A has 9 the user wants and wants 0 of the user's, and partner B has 2 and wants 2
- **THEN** under All, B is listed above A

#### Scenario: Matches without opening
- **WHEN** the user opens For you, and rin.trades (active) has 14 objekts the user wants and wants 2 of the user's
- **THEN** rin.trades's row is open, its chip reads `mutual 2 · 14 ⇄ 2`, and, without any click, the left column shows 11 of the 14 with a "+3" tile and the right column shows both of the 2

#### Scenario: No longer owned
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it
- **THEN** Mayu 203Z shows struck through after the counted objekts in "They have, you want", captioned "no longer owned", it isn't in the count, and the footer explains it

#### Scenario: Idle row
- **WHEN** jinsoul.blue is idle
- **THEN** their row is listed last, starts closed, shows "idle" in its header at full text contrast, and opens with its chevron

#### Scenario: Phone
- **WHEN** For you is shown at 390 px
- **THEN** each open row's two columns stack, the footer buttons wrap, and the page doesn't scroll sideways

### Requirement: Filters
The view SHALL offer a Show control: Everyone, Mutual only, They want what I have, and They have what I want. Everyone is the default. Mutual only keeps partners with both counts above zero. The view SHALL also offer a Compare with control naming one of the user's have, sale or want lists, each option tagged with its list type. The named list replaces the user's side only in its own direction:
- for a have or sale list, "they want what I have" counts only that list's entries;
- for a want list, "they have what I want" counts only that list's entries.

The other direction keeps using all of the user's lists of the other type, so a list's Mutual only partners also trade back against the user's other lists.

A one-way Show compares one kind of list, so Compare with SHALL offer only that kind: have and sale lists under They want what I have, want lists under They have what I want. Its All option SHALL name the kind ("All my have and sale lists"). Choosing a Show that the selected list does not apply to SHALL reset Compare with to All. Under the controls, one line SHALL say what is compared, naming the selected list or all lists, and only the side a one-way Show uses.

The filters SHALL live in the URL (`match`, `list`), beside `partner`, which only scrolls to that partner's card and highlights it, and does nothing when that partner is not in the current results. A `list` value that is not one of the user's have, sale or want lists, or not of the kind the Show compares, SHALL be ignored, and all lists used.

#### Scenario: Default filter
- **WHEN** the user opens `/trade/for-you` with no parameters
- **THEN** Everyone is selected, and every partner is listed, mutual ones first

#### Scenario: One-way Show offers one kind of list
- **WHEN** the user selects They want what I have
- **THEN** Compare with offers only their have lists, under "All my have lists", and a selected want list resets to it

#### Scenario: One have list, still mutual
- **WHEN** the user filters to have list "spares", and a partner wants a collection on Spares and has a collection on the user's want list "binary hunt"
- **THEN** the partner is listed under Mutual only, and "they want what I have" counts only the Spares entries

#### Scenario: Foreign list slug
- **WHEN** the URL's `list` is the slug of another account's list
- **THEN** all of the user's lists are used and Compare with shows All my lists

### Requirement: Current ownership
An entry on a have or sale list SHALL count toward a match only while its owner can trade it:
- an entry for a specific objekt counts only while one of the owner's linked Cosmo addresses holds that objekt and it is transferable;
- an entry for a collection counts only while one of those addresses holds a transferable copy.

This applies to both the partner's entries and the user's own. Ranking and filters SHALL use the counts after this check, and at most 50 partners SHALL be listed. Entries left out this way SHALL be summarised in a Not shown line, with counts by reason.

#### Scenario: Sold objekt
- **WHEN** a partner's have list still lists Mayu 203Z but none of their linked addresses holds a copy
- **THEN** Mayu 203Z does not count toward that partner, and Not shown includes it under "no longer owned"

#### Scenario: Not transferable
- **WHEN** the only copy a partner holds is not transferable
- **THEN** it does not count, and Not shown includes it under "not transferable"

#### Scenario: Ranked on what is still owned
- **WHEN** partner A's list overlaps 5 ⇄ 5 but only 1 ⇄ 5 is still owned, and partner B's overlaps 3 ⇄ 3, all owned
- **THEN** B is listed above A, and A's card shows Mutual 1

### Requirement: Idle partners rank last
A partner whose matched lists have all gone 30 days without a change to the list or its entries SHALL be listed after every active partner, whatever their score, and marked idle.

#### Scenario: Idle high scorer
- **WHEN** an idle partner has a mutual score of 3 and an active partner has 1
- **THEN** the active partner is listed first and the idle one is marked idle

### Requirement: Hide a partner
The user SHALL be able to hide a partner with the row's Hide partner button. A hidden partner SHALL not appear in For you or in the list-header counts. Not shown SHALL count hidden partners and let the user list them and unhide each one.

#### Scenario: Hide and unhide
- **WHEN** the user activates Hide partner on rin.trades's row, and later unhides them from Not shown
- **THEN** rin.trades disappears from the list at once, and returns after unhiding

### Requirement: Partner identity
A partner card SHALL be headed by the Cosmo nickname of the address their best-matching list is bound to, whether or not that address has Hide Cosmo ID on (see `web-cosmo-link`). When that address has no nickname it SHALL be headed by the shortened address, and only when no matched list is bound to an address SHALL it use the account's display name. Want-list alerts SHALL name a partner the same way. When the partner's matched lists are bound to more than one address, the card SHALL name the others as well. The card SHALL show the account's avatar. Its name SHALL link to the partner's profile, followed by Discord and Twitter badges when the partner has chosen to show socials.

#### Scenario: Bound nickname
- **WHEN** a partner's matched list is bound to the Cosmo address with nickname "rinrin"
- **THEN** the card is headed "rinrin"

#### Scenario: Bound address without a nickname
- **WHEN** a partner's best-matching list is bound to an address whose Cosmo profile has no nickname
- **THEN** the card is headed by that address shortened, as in `0x9ca6…8b0d`, and links to its profile

#### Scenario: No bound address
- **WHEN** a partner's matched lists are bound to no address
- **THEN** the card is headed by the account's display name

### Requirement: Freshness
The view SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear within 5 minutes.

The view SHALL say how fresh it is:
- under the controls, "Ownership checked <time ago>", the moment the shown matches were worked out, which can be up to 5 minutes before the load;
- on each partner row, after the reputation line, "updated <time ago>", the most recent change to any of the partner's matched lists or their entries.

Both times SHALL be relative, rendered by the browser, and in monospace. Each SHALL carry its full date and time as its machine-readable value.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to For you
- **THEN** partners holding that collection are counted

#### Scenario: Checked time
- **WHEN** For you's matches were worked out 2 minutes before the user opens the page
- **THEN** the line under the controls reads "Ownership checked 2m ago"

#### Scenario: Partner updated
- **WHEN** rin.trades last changed one of their matched lists 2 hours ago
- **THEN** rin.trades's row reads "updated 2h ago" after their reputation line

### Requirement: Message a partner
Each partner card SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the partner, adding a card for a collection their best-matching list matched on. The card SHALL NOT name the list. A partner who doesn't take messages SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From For you
- **WHEN** the user activates Message on nakyoung.cards's card
- **THEN** the conversation with nakyoung.cards opens, with a card for a collection from the list that matched most

### Requirement: Blocks and trade blocks
For you SHALL leave out partners the user blocked, partners who blocked the user, and partners under an active trade block. Not shown SHALL count the accounts the user blocked, separately from hidden partners. Each row's ⋯ menu SHALL offer Block and Report.

#### Scenario: Blocked partner
- **WHEN** the user has blocked 2 accounts
- **THEN** neither appears, and Not shown includes "2 blocked users"

### Requirement: Make offer to a partner
Each partner card that shows Message SHALL also offer Make offer, named as on Browse. It opens the offer builder addressed to the partner, prefilled with the overlap:
- **You give**: objekts on the user's have lists that the partner wants and the user still owns;
- **You get**: the partner's have entries that the user wants.

Objekts that can't be offered SHALL be left out of the prefill.

#### Scenario: Prefilled overlap
- **WHEN** a user activates Make offer on rin.trades's mutual card, where rin.trades has 4 objekts the user wants and the user has 2 that rin.trades wants
- **THEN** the builder opens with those 2 under You give and those 4 under You get

### Requirement: Partner reputation
Each partner row SHALL show the partner's reputation line (see `web-verified-trades`) beside the partner's name.

#### Scenario: Row
- **WHEN** the user sees kaede.k's row, and kaede.k has 8 completed trades
- **THEN** the row shows "8 verified" with kaede.k's positive share
