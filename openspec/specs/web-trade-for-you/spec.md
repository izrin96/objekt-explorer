# web-trade-for-you Specification

## Purpose
The account-wide trade match view on `apps/web` at `/trade/for-you`: who the user could trade with across all their have, sale and want lists, ranked by how mutual the trade is, using current ownership.

## Requirements

### Requirement: Account-wide matches
Trade SHALL match the signed-in user, one person at a time, against the other accounts whose discoverable have, sale or want lists overlap the user's have, sale and want lists. This drives Browse's match chips, Any, Mutual, Mutual N and the person sheet (see `web-trade-browse`). A sale list counts as a have list, except against a want list open to swaps only, which it never matches (see `web-lists`). The user's own lists count whether or not they are discoverable. Matching SHALL use the user's have and sale lists, never everything their wallet holds: owning an objekt does not mean it is up for trade. A have or sale list SHALL take part only while it is bound to one of its owner's Cosmo profiles, since Trade checks that profile's holdings. Want lists always take part. The user's own account SHALL never be matched.

#### Scenario: Matches across lists
- **WHEN** a user has two have lists and one want list, and a person's discoverable lists overlap two of them
- **THEN** the person's sheet shows the matched objekts from both of the user's lists, and every post by that person shows the same chip

#### Scenario: Held but not on a have list
- **WHEN** the user holds SeoYeon 204Z but it is on none of their have lists, and a person wants it
- **THEN** SeoYeon 204Z does not count toward that person

#### Scenario: Unbound have list
- **WHEN** the user's only have list is not bound to a Cosmo profile, and a person wants a collection on it
- **THEN** that collection does not count toward the person, and Compare with does not offer the list

#### Scenario: No lists
- **WHEN** a signed-in user with no want list and no bound have list opens `/trade`
- **THEN** there is no Matches control, and a line asks them for such a list with a Post a list control

#### Scenario: Opened from Browse
- **WHEN** the user activates All matches on a post
- **THEN** that person's sheet opens over Browse, with the matches from all of the user's lists, or from the lists Compare with names

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade?person=<id>`
- **THEN** no person sheet opens, and Browse shows the sign-in prompt

#### Scenario: Trade opens Browse
- **WHEN** a signed-in user opens `/trade`
- **THEN** the browser stays at `/trade` and shows the Browse feed

### Requirement: Current ownership
An entry on a have or sale list SHALL count toward a match only while its owner can trade it:
- an entry for a specific objekt counts only while one of the owner's linked Cosmo addresses holds that objekt and it is transferable;
- an entry for a collection counts only while one of those addresses holds a transferable copy.

This applies to both the other person's entries and the user's own. Counts, Mutual, its order and Mutual N SHALL use the counts after this check. Entries left out this way SHALL be shown in the person sheet, struck through with their reason (see Person sheet).

#### Scenario: Sold objekt
- **WHEN** a person's have list still lists Mayu 203Z but none of their linked addresses holds a copy
- **THEN** Mayu 203Z does not count toward that person, and their sheet shows it struck through as "no longer owned"

#### Scenario: Not transferable
- **WHEN** the only copy a person holds is not transferable
- **THEN** it does not count, and their sheet shows it struck through as "not transferable"

#### Scenario: Ranked on what is still owned
- **WHEN** person A's lists overlap the user's 5 ⇄ 5 but only 1 ⇄ 5 is still owned, and person B's overlap 3 ⇄ 3, all owned
- **THEN** under Mutual, B's posts are listed above A's, and A's chip reads "Mutual 1 · they have 1 · you have 5"

### Requirement: Hide a partner
The user SHALL be able to hide a person:
- from the ⋯ menu of any of that person's posts;
- from the ⋯ menu of their person sheet.

A hidden person's posts SHALL leave Browse at once, and a toast SHALL offer Undo. A hidden person SHALL not count toward Mutual, Mutual N, the list-header counts or want-list alerts.

When the user has hidden anyone, Browse's footer note SHALL say that their posts aren't shown and offer Hidden people. Hidden people SHALL open a dialog listing them, each with Unhide. Account's Hidden page SHALL list them too.

#### Scenario: Hide and unhide
- **WHEN** the user activates Hide on rin.trades's post, and later unhides rin.trades from the footer note's Hidden people
- **THEN** rin.trades's posts leave the feed at once, and return after unhiding

#### Scenario: Undo
- **WHEN** the user hides rin.trades from the person sheet and activates Undo on the toast
- **THEN** rin.trades is not hidden, and their posts are listed again

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
Matching SHALL reflect the user's own list changes on the next load. Other accounts' changes SHALL appear:
- within 5 minutes in Mutual, its order and Mutual N;
- within 1 minute in the person sheet;
- on the next load in the chips.

The person sheet SHALL say how fresh it is:
- "Ownership checked <time ago>": the moment its matches were worked out;
- "updated <time ago>": the most recent change to any of the person's matched lists or their entries.

Both times SHALL be relative, rendered by the browser, and in monospace. Each SHALL carry its full date and time as its machine-readable value.

#### Scenario: Own edit
- **WHEN** the user adds a collection to their want list and returns to Browse
- **THEN** posts holding that collection are counted and ringed

#### Scenario: Checked time
- **WHEN** a person sheet's matches were worked out 30 seconds before the user opens it
- **THEN** it reads "Ownership checked" with a time under a minute ago

#### Scenario: Partner updated
- **WHEN** rin.trades last changed one of their matched lists 2 hours ago
- **THEN** rin.trades's sheet reads "updated 2h ago" after their reputation line

### Requirement: Message a partner
The person sheet SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the person, adding a card for a collection that their best-matching list matched on. The card SHALL NOT name the list. A person who doesn't take messages SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From For you
- **WHEN** the user activates Message in nakyoung.cards's sheet
- **THEN** the conversation with nakyoung.cards opens, with a card for a collection from the list that matched most

### Requirement: Blocks and trade blocks
Matching SHALL leave out people the user blocked, people who blocked the user, and people under an active trade block. Their posts SHALL not be listed on Browse, and they SHALL not count toward Mutual N. Each post's ⋯ menu and the person sheet's ⋯ menu SHALL offer Block and Report.

#### Scenario: Blocked partner
- **WHEN** the user has blocked kaede.k
- **THEN** kaede.k's posts are not listed, kaede.k is not counted in Mutual N, and `/trade?person=<kaede.k's id>` shows no matches

### Requirement: Make offer to a partner
The person sheet, when it shows Message, SHALL also offer Make offer, named as on Browse. It opens the offer builder addressed to the person, prefilled with the overlap:
- **You give**: objekts on the user's have lists that the person wants and the user still owns;
- **You get**: the person's have entries that the user wants.

Objekts that can't be offered SHALL be left out of the prefill.

#### Scenario: Prefilled overlap
- **WHEN** a user activates Make offer in rin.trades's sheet, where rin.trades has 4 objekts the user wants and the user has 2 that rin.trades wants
- **THEN** the builder opens with those 2 under You give and those 4 under You get

### Requirement: Partner reputation
The person sheet SHALL show the person's reputation line (see `web-verified-trades`) beside their name.

#### Scenario: Row
- **WHEN** the user opens kaede.k's sheet, and kaede.k has 8 completed trades
- **THEN** the sheet shows "8 verified" with kaede.k's positive share

### Requirement: Person sheet
A signed-in viewer SHALL be able to open a person sheet from a post's All matches control (see `web-trade-browse`). The sheet shows everything that person matches with the viewer's lists, or with the lists Compare with names while Matches is on. It SHALL live in the URL as `person=<their user id>` on `/trade`. Closing it, or going back, SHALL remove the parameter and leave the feed where it was. For a signed-out visitor, `person` SHALL be ignored.

The sheet SHALL hold, in order:
- **Header**: the Trade card header (avatar, name with socials, reputation line, ⋯ with Hide, Block and Report), then "updated <time ago>" for the most recent change to any of their matched lists, then any "also" names (see Partner identity).
- **Match chip**: the same counts, words and colour as the person's posts show.
- **"They have, you want (N)" and "You have, they want (N)"**:
  - Two columns, side by side from `sm` up and stacked below. Each shows its counted objekts as 3rem-wide thumbnails, each with a monospace caption of at most two lines naming the collection.
  - A column SHALL show at most 50 counted objekts, then a "+N" tile for the rest.
  - A column with nothing counted SHALL read 0 and "none".
  - Activating a thumbnail SHALL open the objekt drawer.
- **Not counted**: the objekts left out by the ownership rule (see Current ownership), after the counted ones in their direction's column. Each is greyed, struck through in the destructive colour, and captioned with its reason ("no longer owned", "not transferable"). When any is shown, one line SHALL say they are on their list or the viewer's but aren't counted, and why.
- **Their matched lists**: each with its list type, the number of collections it matched, and a link to its list page.
- "Ownership checked <time ago>": when these matches were worked out.
- **Actions**: Message and Make offer, or "Not taking messages" in their place (see Message a partner and Make offer to a partner).

From `md` up, the sheet SHALL open from the inline end of the window. Below `md`, it SHALL open from the bottom, at full width, and scroll on its own. Its title SHALL be the person's name.

A person who no longer matches the viewer SHALL get a sheet with their header and one line saying they have no matches with the viewer's lists. That covers people the viewer hid, or whose matching lists left Trade. The sheet SHALL not say why. For an account that either side has blocked, or that has a trade sanction, the sheet SHALL show the one line without the header, titled with the generic person title.

#### Scenario: Open from a post
- **WHEN** the viewer activates All matches on rin.trades's post, and rin.trades has 14 collections the viewer wants and wants 2 of the viewer's
- **THEN** the sheet opens titled with rin.trades's name, the URL carries `person=<rin.trades's id>`, and it shows "They have, you want (14)" with all 14 captioned thumbnails beside "You have, they want (2)"

#### Scenario: Not counted
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it, and the viewer opens rin.trades's sheet
- **THEN** Mayu 203Z shows struck through after the counted objekts in "They have, you want", captioned "no longer owned", it isn't in the count or the chip, and a line explains it

#### Scenario: Back closes the sheet
- **WHEN** the viewer opens a sheet from the 30th post and presses the browser's back button
- **THEN** the sheet closes, the URL loses `person`, and the feed is still scrolled to the 30th post

#### Scenario: Linked from an old For you link
- **WHEN** the viewer follows `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** Browse opens under Mutual with rin.trades's sheet open

#### Scenario: Compare with applies
- **WHEN** Compare with names have list "spares" linked to want list "binary hunt", and the viewer opens a person's sheet
- **THEN** the sheet counts only matches against "spares" and "binary hunt"

#### Scenario: No longer a match
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** the sheet shows that person's header and says they have no matches with the viewer's lists

#### Scenario: Phone
- **WHEN** the viewer opens a sheet at 390 px
- **THEN** it rises from the bottom at full width, its two columns stack, and the page doesn't scroll sideways

### Requirement: Old For you address
`/trade/for-you` is the For you tab (see `web-trade-browse` Matches and Compare with). It SHALL also accept the parameters of For you links from before the merge into Browse, mapping them in place:
- `match=mutual` stays `match=mutual`;
- `match=they_have` or `match=they_want` becomes `match=any`;
- `list` is kept as `list`;
- `partner` becomes `person`.

Unknown or unparsable values SHALL be dropped. The For you rules then apply: a signed-out visitor is sent to sign in, a signed-in viewer without a list that takes part in Trade is sent to `/trade`, and a `list` the viewer can't use reads as All my lists. A tab loaded before this change SHALL keep working until it is reloaded.

#### Scenario: Notification link
- **WHEN** a signed-in user with want list "binary hunt" opens `/trade/for-you?list=binary-hunt` from an older notification
- **THEN** For you opens on Any, and Compare with names "binary hunt"

#### Scenario: One-way view
- **WHEN** a signed-in user opens `/trade/for-you?match=they_want&list=spares`
- **THEN** the browser is at `/trade/for-you?match=any&list=spares`

#### Scenario: Partner link
- **WHEN** a signed-in user opens `/trade/for-you?match=mutual&partner=<id>`
- **THEN** the browser is at `/trade/for-you?match=mutual&person=<id>` with that person's sheet open

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?list=spares`
- **THEN** the browser is at `/login`, which returns them to `/trade/for-you?list=spares` after signing in

#### Scenario: Tab opened before the change
- **WHEN** a tab loaded before this change is on Browse with Matches on Any after it ships
- **THEN** its feed keeps loading the same posts until the tab is reloaded
