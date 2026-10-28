# web-trade-for-you Specification

## Purpose
The account-wide trade match view on `apps/web` at `/trade/for-you`: who the user could trade with across all their have, sale and want lists, ranked by how mutual the trade is, using current ownership.

## Requirements

### Requirement: Account-wide matches
Trade SHALL match the signed-in user, one person at a time, against the other accounts whose listed have, sale or want lists (discoverable and not idle; see `web-trade-browse` Order and idle posts) overlap the user's have, sale and want lists. This drives the header sentences and list counts on Browse and For you, Any, Mutual and Mutual N (see `web-trade-browse`). An idle list SHALL not count toward its owner. A have list, and a sale list open to swaps, count against a want list open to swaps, and every sale list counts against a want list open to buying: a want list open to swaps only never matches a sale list set to Sell only, and one set to buying only never matches a have list (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings. Want lists always take part. The user's own account SHALL never be matched. Every list that takes part counts toward the one-way counts, but Can swap counts only inside one linked pair of the user's and one of the person's (see `web-trade-browse` Matches to the signed-in viewer). Want-list alerts SHALL use the same rules for which of another account's lists take part (see `web-notifications` Want-list alerts).

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a person's discoverable lists overlap two of them
- **THEN** the person's row counts the matched objekts from both of the user's lists in one header sentence

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a person wants it
- **THEN** SeoYeon 204Z does not count toward that person

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a person wants a collection on it
- **THEN** that collection does not count toward the person, and Compare with does not offer the list

#### Scenario: Buying-only want list in the person sheet
- **WHEN** the user's only want list is set to Buying only, and a person's have list and sale list each hold a different collection on it
- **THEN** the person's row counts only the sale list's collection as one they have that the user wants

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade`
- **THEN** there is no Matches control, and a line asks them for such a list with a Post a list control

#### Scenario: Opened from Browse
- **WHEN** the user follows a link to `/trade?person=<id>`
- **THEN** that person's row leads Browse with every post shown, counted against all of the user's lists

#### Scenario: Idle list
- **WHEN** a person's only have list overlapping the user's wants is idle
- **THEN** it does not count toward that person, and the person is not listed on For you through it

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade?person=<id>`
- **THEN** that person's row leads Browse with no counts, and Browse shows the sign-in prompt

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed

#### Scenario: Alerts follow the same lists
- **WHEN** a person's have list holding a collection on the user's want list is left out of For you because the user hid that person
- **THEN** a new entry on that have list creates no want-list alert for the user

#### Scenario: Sell or swap counts both ways
- **WHEN** the user's want list is open to swaps only and linked to their bound have list, and a person's sale list, open to swaps, holds 2 collections on it while the person's want list, linked to that sale list, asks for 1 on the user's bound have list
- **THEN** the person's row reads "You can swap 1", and the person is listed under Can swap

#### Scenario: Can swap stays inside one post
- **WHEN** a person's have list holds a collection on the user's want list "doubles hunt", linked to have list "jiwoo spares", and the person wants a collection on the user's have list "yooyeon spares", linked to a different want list
- **THEN** the person's row counts both directions, and the person is listed under One way, not Can swap

### Requirement: Current ownership
An entry on a have or sale list SHALL count toward a match only while its owner can trade it:
- an entry for a specific objekt counts only while one of the owner's linked Cosmo addresses holds that objekt and it is transferable;
- an entry for a collection counts only while one of those addresses holds a transferable copy.

This applies to both the other person's entries and the user's own. Counts, Mutual, its order and Mutual N SHALL use the counts after this check. Entries left out this way SHALL not be shown (see `web-trade-browse` Only what is still owned).

#### Scenario: Sold objekt
- **WHEN** a person's have list still lists Mayu 203Z but none of their linked addresses holds a copy
- **THEN** Mayu 203Z does not count toward that person and is not shown in their row

#### Scenario: Not transferable
- **WHEN** the only copy a person holds is not transferable
- **THEN** it does not count and is not shown

#### Scenario: Ranked on what is still owned
- **WHEN** person A's lists overlap the user's 5 ⇄ 5 but only 1 ⇄ 5 is still owned, and person B's overlap 3 ⇄ 3, all owned
- **THEN** under Mutual, B's row is listed above A's, and A's row reads "You can swap 1"

### Requirement: Hide a partner
The user SHALL be able to hide a person:
- from the ⋯ menu of that person's row.

A hidden person's row SHALL leave Browse and For you at once, and a toast SHALL offer Undo. A hidden person SHALL not count toward Mutual, Mutual N, the list-header counts or want-list alerts.

When the user has hidden anyone, Browse's footer note SHALL say that their posts aren't shown and offer Hidden people. Hidden people SHALL open a dialog listing them, each with Unhide. Account's Hidden page SHALL list them too.

#### Scenario: Hide and unhide
- **WHEN** the user activates Hide on rin.trades's row, and later unhides rin.trades from the footer note's Hidden people
- **THEN** rin.trades's row leaves the feed at once, and returns after unhiding

#### Scenario: Undo
- **WHEN** the user hides rin.trades from their row and activates Undo on the toast
- **THEN** rin.trades is not hidden, and their row is listed again

### Requirement: Partner identity
A partner card SHALL be headed by the Cosmo nickname of the address their best-matching list is bound to. When that address has no nickname it SHALL be headed by the shortened address, and only when no matched list is bound to an address SHALL it use the account's default profile, else the account's display name (see `web-cosmo-link` Default profile). Want-list alerts SHALL name a partner the same way. When the partner's matched lists are bound to more than one address, the card SHALL name the others as well. The card SHALL show the account's avatar. Its name SHALL link to the partner's profile, followed by Discord and Twitter badges when the partner has chosen to show socials.

#### Scenario: Bound nickname
- **WHEN** a partner's matched list is bound to the Cosmo address with nickname "rinrin"
- **THEN** the card is headed "rinrin"

#### Scenario: Bound address without a nickname
- **WHEN** a partner's best-matching list is bound to an address whose Cosmo profile has no nickname
- **THEN** the card is headed by that address shortened, as in `0x9ca6…8b0d`, and links to its profile

#### Scenario: No bound address
- **WHEN** a partner's matched lists are bound to no address, and their default profile is "rin.alt"
- **THEN** the card is headed "rin.alt"

#### Scenario: No profile at all
- **WHEN** a partner has no linked Cosmo profile
- **THEN** the card is headed by the account's display name

#### Scenario: No bound address and a private default
- **WHEN** a partner's matched lists are bound to no address, and their default profile was private before this change
- **THEN** the card is headed by that default profile

### Requirement: Freshness
Matching SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear:
- within 5 minutes in Mutual, its order, Mutual N, and the order of For you's Mutual and One way sections under Any (see `web-trade-browse` Matches and Compare with);
- on the next load in the header sentences and list counts.

A row SHALL say how fresh it is with the time of its newest post (see `web-trade-browse` Trade card). It SHALL not show when the matches were worked out.

The time SHALL be relative, rendered by the browser, and in monospace. It SHALL carry its full date and time as its machine-readable value.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to Browse
- **THEN** posts holding that collection are counted and ringed

#### Scenario: One way order catches up
- **WHEN** sodalove adds 6 collections the user wants to their have list, and the user reloads For you 5 minutes later
- **THEN** sodalove's row has moved up in One way by their new count

#### Scenario: Partner updated
- **WHEN** rin.trades last changed one of their listed lists 2 hours ago, later than any bump
- **THEN** rin.trades's row reads "updated 2h ago" after its list count

### Requirement: Message a partner
Message on a person's row, on Browse or For you, SHALL follow `web-trade-browse` Message a post's owner: it opens the conversation with a post card for the row's lead post, carrying the match when the person matches the viewer. A person who doesn't take messages SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From For you
- **WHEN** the user activates Message on nakyoung.cards's row on For you, whose lead post is their have list with the most matches
- **THEN** the conversation with nakyoung.cards opens, with a post card for that have list carrying the match

### Requirement: Blocks and trade blocks
Matching SHALL leave out people the user blocked, people who blocked the user, and people under an active trade block. Their posts SHALL not be listed on Browse, and they SHALL not count toward Mutual N. Each post's ⋯ menu and the person sheet's ⋯ menu SHALL offer Block and Report.

#### Scenario: Blocked partner
- **WHEN** the user has blocked kaede.k
- **THEN** kaede.k's posts are not listed, kaede.k is not counted in Mutual N, and `/trade?person=<kaede.k's id>` shows no matches

### Requirement: Make offer to a partner
Make offer on a person's row, on Browse or For you, SHALL follow `web-trade-browse` Make offer on a post: it opens the offer builder addressed to the person and the row's lead post, with the row's matches already added by the rule the row's chip follows (see `web-trade-offers` Matches added when the builder opens).

#### Scenario: Prefilled overlap
- **WHEN** a user activates Make offer on rin.trades's row on For you, which reads "They have 5 you want · You have 3 they want" with no Can swap mark: rin.trades has 3 the user wants on have list "doubles" and 2 on sale list "spares", open to swaps, and the user has 3 on rin.trades's want list "wants"
- **THEN** the builder opens addressed to rin.trades and "doubles", with rin.trades's 5 under You get, nothing under You give, and the line "Added 5 you get from your matches"

#### Scenario: Can swap under Compare with
- **WHEN** For you shows Can swap with Compare with set to the user's have list "doubles", and the user activates Make offer on kaede.k's row
- **THEN** You give holds only the matches from "doubles" inside the pair the row's Can swap counts

### Requirement: Partner reputation
The person sheet SHALL show the person's reputation line (see `web-verified-trades`) beside their name.

#### Scenario: Row
- **WHEN** the user opens kaede.k's sheet, and kaede.k has 8 completed trades
- **THEN** the sheet shows "8 verified" with kaede.k's positive share

### Requirement: Old For you address
`/trade/for-you` is the For you tab (see `web-trade-browse` Matches and Compare with). It SHALL also accept the parameters of For you links from before the merge into Browse, mapping them in place:
- `match=mutual` stays `match=mutual`;
- `match=they_have` or `match=they_want` becomes `match=any`;
- `list` is kept as `list`;
- `partner` becomes `person`.

Unknown or unparsable values SHALL be dropped. The For you rules then apply: a signed-out visitor is sent to sign in, a signed-in viewer without a list that takes part in Trade is sent to `/trade`, and a `list` the viewer can't use reads as All my lists.

#### Scenario: Notification link
- **WHEN** a signed-in user with want list "binary hunt" opens `/trade/for-you?list=binary-hunt` from an older notification
- **THEN** For you opens on Any, and Compare with names "binary hunt"

#### Scenario: One-way view
- **WHEN** a signed-in user opens `/trade/for-you?match=they_want&list=spares`
- **THEN** the browser is at `/trade/for-you?match=any&list=spares`

#### Scenario: Partner link
- **WHEN** a signed-in user opens `/trade/for-you?match=mutual&partner=<id>`
- **THEN** the browser is at `/trade/for-you?match=mutual&person=<id>` with that person's row first

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login`, which returns them to `/trade/for-you?list=spares` after signing in

### Requirement: Matched through your rules
When a partner's objekts match the viewer's want lists only through the viewer's rules, the list's count ("N you want") SHALL name them in its "Matched with your lists" popover: under each want list, one line per rule it matched through, "via rule", the rule's label and how many collections. Nothing SHALL be listed under the strips. The header sentence SHALL add how many of the swap needs the viewer's rules: the swap takes the collections wanted by hand first, so only what they leave short counts, and nothing is added when they cover the swap. Objekts matched by an objekt the viewer added by hand SHALL NOT be counted under a rule.

#### Scenario: Two through rules
- **WHEN** rin.trades has Lynn CC366 and Kaede CC118, which the viewer's want list "binary hunt" wants only through its rules CC366, any member, and Cream02 FCO 3rd
- **THEN** rin.trades's row reads "You can swap 2 · both through your rules", and the count's popover lists "binary hunt" with "via rule CC366 · any member 1" and "via rule Cream02 · FCO · 3rd 1"

#### Scenario: Collections by hand cover the swap
- **WHEN** rin.trades has 3 collections the viewer wants, 2 added by hand and 1 only through a rule, and the two can swap 1
- **THEN** the row reads "You can swap 1" with nothing about rules

#### Scenario: Wanted by hand too
- **WHEN** the viewer's list also holds Lynn CC366 as an objekt
- **THEN** Lynn CC366 is not counted under the CC366 rule

#### Scenario: Many through rules
- **WHEN** a partner's sale list holds 35 objekts the viewer wants only through one rule
- **THEN** nothing shows under the strips, and the popover reads that rule with 35
