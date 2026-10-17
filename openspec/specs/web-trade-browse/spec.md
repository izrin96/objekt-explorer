# web-trade-browse Specification

## Purpose
The public Trade Browse feed on `apps/web` at `/trade`: posts by people who put their have, want or sale lists on Trade, kept fresh by Bump and current ownership, with matches to the signed-in viewer marked.

## Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned its Show on Trade switch on (Show on Market on a sale list; see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list, whatever that want list's Open to choice, and for a want list on its own open to swaps only;
- WTB for a want list on its own open to swaps or buying, or set to buying only;
- WTS for a sale list.

#### Scenario: Trades-only want list
- **WHEN** a want list on its own is open to swaps only, whether or not it is linked to a have list that is off Trade
- **THEN** its post is tagged WTT and listed under WTT, not WTB

#### Scenario: Buying-only want list
- **WHEN** a want list on its own is set to Buying only
- **THEN** its post is tagged WTB and listed under WTB

#### Scenario: Have list linked to a buying-only want list
- **WHEN** have list "spares" is on Trade and linked to want list "store hunt", which is set to Buying only and on Trade
- **THEN** the feed shows one WTT post holding both sides, and the Want side matches sale lists only

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address whatever its Hide Cosmo ID setting, the shortened address when it has none, and the account's display name only for a list bound to no address; see `web-cosmo-link`), with the avatar;
- the tag, and each list's name and description;
- up to 11 objekts per side on a post with two sides, and up to 20 on a post with one side, with the number of further objekts;
- on a WTS post, each objekt's price in the list's currency, or QYOP;
- when the post was last bumped, or last changed if that is later.

Each list in a post SHALL link to its list page.

#### Scenario: Linked pair is one post
- **WHEN** have list "spares" is linked to want list "binary hunt" and both are on Trade
- **THEN** the feed shows one WTT post holding a Have side from Spares and a Want side from Binary hunt

#### Scenario: Half a pair
- **WHEN** "spares" is on Trade and its linked want list is not
- **THEN** the feed shows a WTT post with only the Have side

#### Scenario: Sale list on Market
- **WHEN** a sale list bound to a Cosmo profile has Show on Market on
- **THEN** the feed shows it as a WTS post

#### Scenario: Not on Trade
- **WHEN** a have list has Show on Trade off
- **THEN** it does not appear on `/trade`, and For you does not match it

#### Scenario: Discoverable before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 3 days before launch
- **THEN** at launch it appears on `/trade` with its time showing that change, ordered as if bumped then

#### Scenario: Long-untouched before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 60 days before launch
- **THEN** at launch it is idle and not listed on `/trade` until its owner bumps or changes it, and For you still matches it

#### Scenario: One side gets more
- **WHEN** a WTS post's sale list holds 30 objekts, and a WTT pair's have and want lists hold 30 each
- **THEN** the WTS post sends 20 objekts and a count of 10 more, and the pair sends 11 per side and a count of 19 more on each

### Requirement: Only what is still owned
A have or sale entry SHALL be left out of a post when its owner can no longer trade it, by the same rule For you uses:
- an entry for a specific objekt is left out unless one of the owner's linked Cosmo addresses holds it and it is transferable;
- an entry for a collection is left out unless one of those addresses holds a transferable copy.

The side's further-objekts count SHALL exclude entries left out this way. A post left with no entries on any side SHALL not be listed.

#### Scenario: Sold objekt
- **WHEN** a WTS post's sale list still lists an objekt that the owner's addresses no longer hold
- **THEN** that objekt is not shown and not counted in the post

#### Scenario: Nothing left
- **WHEN** every entry of a have-only post is no longer owned
- **THEN** the post is not listed

### Requirement: Order and idle posts
Posts SHALL be ordered by their last bump, newest first, on Browse. On For you, Mutual orders people best match first and Any lists its Mutual and One way sections in their own order (see Matches and Compare with). Turning Show on Trade on SHALL count as a bump, unless the post was bumped in the last 24 hours, so neither switching it off and on nor posting the second list of a pair skips the bump limit. Editing a list or its entries SHALL not move its post.

A post SHALL be idle when 30 days have passed since its last bump and since the last change to any of its lists or their entries. An idle post SHALL not be listed until it is bumped or changed, under every Matches option. The feed SHALL load more posts as the viewer scrolls, 24 at a time.

#### Scenario: Edit does not jump the queue
- **WHEN** an owner adds an entry to a list on Trade that was bumped 3 days ago
- **THEN** the post keeps its place, and its time shows the change

#### Scenario: Idle post drops out
- **WHEN** a post was last bumped 31 days ago and none of its lists changed since
- **THEN** it is not listed on `/trade`

#### Scenario: Idle under Mutual
- **WHEN** kaede.k matches the viewer mutually, but kaede.k's only post is idle
- **THEN** kaede.k is not listed under Mutual and is not counted in Mutual N

#### Scenario: Browse stays in bump order
- **WHEN** a signed-in viewer opens `/trade`, and a post matching them 5 ways was bumped before a post matching them none
- **THEN** the post matching none is listed first

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Post type: All, WTT, WTB or WTS (`type`), in one Post type menu at the end of the facet row (see Matches and Compare with). All is the default.
- Artist (`artist`): a row of toggles, All then each artist in the app's artist picker selection, before the other filters. All clears it. More than one artist MAY be on. The row SHALL be hidden when the selection holds one artist.
- Member (`member`), season (`season`), class (`class`), online/offline (`on_offline`) and collection number (`collection`), with the same controls, filter sheet, active chips and Reset as the other collection pages, and the same parameter names and values. The online/offline filter and its chip SHALL be labelled Type, as on every other page, even beside the Post type menu.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- On For you only, Mutual only (`match`) and Compare with (`list`), after the Post type menu on the same row (see Matches and Compare with). Under Any and Mutual, only posts holding at least one objekt that matches the viewer are kept: the objekts the rings mark (see Narrowing). Each post is judged on its own lists, not on the owner's other lists.

Below `md`, Browse and For you SHALL fold every collection filter (artist, member, season, class, Type and collection number) into the filter sheet, leaving none on the toolbar. The sheet's button SHALL read Filters, followed by the number of active collection filters when there are any. Other pages keep their own toolbar.

The feed SHALL follow the artists selected in the app's artist picker, as Activity does. An `artist` value outside that selection SHALL be ignored. A `slug` link SHALL ignore the artist selection and the `artist` parameter, so a link from the objekt drawer lists every post holding that collection.

**Narrowing.** When a filter is active, each post SHALL show only the objekts related to it. An objekt is related when it passes every active filter:
- the collection filters (the artist selection, `artist`, `member`, `season`, `class`, `on_offline`, `collection`), when together they leave some collection out: its collection passes them;
- `slug`: its collection is that collection;
- Matches Any or Mutual: the objekt matches the viewer, as the rings mark it, against the lists Compare with names. On a have or sale side, its collection is on one of the viewer's compared want lists that can take it. On a want side, its collection is on one of the viewer's compared have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer.

While any of these is active:
- each side SHALL show only its related objekts;
- its label SHALL read its role and the shown count, as "HAVE 4". On For you it SHALL also say who the side is for: "HAVE 4 you want" or "SALE 4 you want" on a have or sale side, and "WANT 4 you have" on a want side;
- after its thumbnails and any "+N" tile, the side SHALL show "of N", N being the side's total, linking to its list;
- a side with no related objekt SHALL be shown as one muted line under the post's other strip, reading its role and total, then "none match" on Browse ("WANT 8 · none match") or, on For you, "none you have" on a want side and "none you want" on a have or sale side ("WANT 242 · none you have"). The line SHALL link to its list. It has no thumbnails, no "of N" and no ⇄ mark, and the other strip SHALL take the sides' full width;
- a post with no related objekt on any side SHALL not be listed.

Posts SHALL be shown whole, with no "of N", when none of these is active: every artist selected, no other filter, no `slug`, and on Browse rather than For you. The Type filter SHALL not narrow sides.

The match chip SHALL count the post's owner (see Matches to the signed-in viewer), whatever is shown and whatever filter is active. Rings SHALL mark matched objekts among those shown, so under Any or Mutual every shown objekt is ringed.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of posts. The order is newest bump first on Browse, as Mutual order defines under Mutual, and as the Mutual and One way sections define under Any (see Matches and Compare with). The filters SHALL combine. When no post is listed:
- on For you with a collection filter or `slug` set, under Any or Mutual, it SHALL say that no posts match the filters and offer Reset, which keeps `match` and `list`;
- otherwise under Any, the feed SHALL say that no posts match the viewer's lists and offer to show all posts on Browse, keeping the filters;
- otherwise under Mutual, it SHALL say that no one matches the viewer both ways and offer to switch to Any;
- under Any and Mutual, while Compare with names a list, the message SHALL name it ("No posts match spares", "No one matches spares both ways");
- with other filters set, it SHALL offer Reset.

A filter value that does not parse SHALL be ignored.

#### Scenario: Filters on a phone
- **WHEN** the viewer opens `/trade?member=SeoYeon&season=atom01` at 390 px
- **THEN** no collection filter control shows on the toolbar, the Filters button reads "Filters 2", and the sheet it opens holds every collection filter

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: Split by artist
- **WHEN** the viewer, with tripleS, ARTMS and idntt selected in the artist picker, turns on the ARTMS toggle
- **THEN** the URL carries `artist=artms`, only posts with at least one ARTMS objekt are listed, and each of their sides shows only its ARTMS objekts

#### Scenario: Narrowed side
- **WHEN** the viewer, on Browse, filters to member SeoYeon, and a WTT post's have list holds 27 objekts of which 4 are SeoYeon, and its want list holds 14 of which 1 is SeoYeon
- **THEN** the post shows "HAVE 4" with 4 thumbnails and "of 27", and "WANT 1" with 1 thumbnail and "of 14", each "of" linking to its list

#### Scenario: Empty side under a filter
- **WHEN** the viewer, on Browse, filters to member SeoYeon, and a WTT post's have side holds SeoYeon objekts but its want side holds none
- **THEN** the post is listed, its have strip takes the sides' full width, and under it one muted line reads "WANT 8 · none match", with no thumbnails and no ⇄ mark

#### Scenario: Chip counts the whole post
- **WHEN** a post's owner has, across their lists, 3 collections on the viewer's want lists, one of them SeoYeon, and wants none of the viewer's, and the viewer filters to member SeoYeon
- **THEN** the chip still reads "They have 3 you want", and only the SeoYeon objekt among the shown thumbnails is ringed

#### Scenario: Only matches narrows the post
- **WHEN** Matches is Any, and a WTT post's have list holds 27 objekts of which 3 are on the viewer's want lists, and its want list holds 14 of which 2 are on the viewer's bound have lists and still owned
- **THEN** the post shows "HAVE 3 you want" with those 3 thumbnails, all ringed, and "of 27", and "WANT 2 you have" with those 2, ringed, and "of 14"

#### Scenario: One-way match under Only matches
- **WHEN** Matches is Any, and a post has 2 objekts the viewer wants but wants nothing the viewer has
- **THEN** the post is listed, its have strip shows the 2 across the sides' width, and under it one muted line reads "WANT 8 · none you have", with no ⇄ mark

#### Scenario: Only matches judges each post
- **WHEN** Matches is Any, and rin.trades has a have list post holding nothing the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists
- **THEN** only the want list post is listed, and its chip counts rin.trades across both lists

#### Scenario: Only matches with a filter
- **WHEN** Matches is Any and the viewer filters to member SeoYeon, and a post's have side holds 3 objekts the viewer wants, one of them SeoYeon
- **THEN** the have side shows only that SeoYeon objekt, reading "HAVE 1 you want" and "of 27"

#### Scenario: No filter
- **WHEN** the viewer has every artist selected, no other filter set and no `slug`, on Browse
- **THEN** posts are shown whole, with no "of N"

#### Scenario: From the objekt drawer
- **WHEN** a signed-in viewer with a want list opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** Browse opens, only posts with SeoYeon 204Z on a have, want or sale side are listed, whatever artists are selected, each shows only its SeoYeon 204Z objekts with "of N" linking to its list, and a removable chip names the collection

#### Scenario: Selected artists
- **WHEN** the viewer has only tripleS selected in the artist picker and opens `/trade?match=off`
- **THEN** only posts showing at least one tripleS objekt are listed, each side shows only its tripleS objekts, and there is no artist toggle row

#### Scenario: Old facet link
- **WHEN** a signed-out visitor opens `/trade?season=atom01&class=first` from an older link
- **THEN** the filters apply: only posts with an Atom01 First objekt are listed, narrowed to those objekts, and both filters show as active chips

#### Scenario: Only matches
- **WHEN** a signed-in viewer with a want list holding SeoYeon 204Z opens `/trade?matches=1` from an older link
- **THEN** For you opens with Mutual only off, a post whose have side holds SeoYeon 204Z stays, showing SeoYeon 204Z and not its other objekts, and a post that matches none of the viewer's lists is no longer listed

#### Scenario: Pages stay full
- **WHEN** only 1 of every 10 posts matches the viewer and Matches is Any
- **THEN** the first page still lists up to a full page of matching posts, in For you's order, and loading more continues from the last one

#### Scenario: Combined with a type
- **WHEN** Matches is Any and the viewer picks WTB
- **THEN** only want-list posts asking for a collection on the viewer's bound have lists are listed

#### Scenario: Nothing matches
- **WHEN** Matches is Any and no post matches the viewer's lists
- **THEN** the feed says no posts match the viewer's lists, with a control that turns Matches off

#### Scenario: Nobody mutual
- **WHEN** Matches is Mutual and no one matches the viewer both ways
- **THEN** the feed says no one matches the viewer both ways, with a control that switches to Any

#### Scenario: Nothing passes the filters
- **WHEN** the viewer, on Browse, filters to a season no post holds
- **THEN** the feed says no posts match the filters, with Reset

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?match=any`
- **THEN** there is no Matches control, the matches prompt stands in its place, and every post is listed

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, every post on Browse and on For you SHALL show its owner's counts. They are taken across all of the owner's lists that matching reads (their discoverable have, sale and want lists, listed or idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the owner's have or sale lists that are on one of the viewer's want lists that can take them. A have list counts only against a want list open to swaps (Swaps only, or Swaps or buying); a sale list counts only against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the owner's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list counts only for a want list open to swaps; a sale list counts only for a want list open to buying.
- The mutual score: the smaller of the two counts above. A have or sale list, the owner's or the viewer's, counts toward it exactly as it counts toward its own count. A want list set to swaps only never counts a sale list toward either direction, and a want list set to buying only never counts a have list, so neither makes a person mutual through one.

Every post by one owner SHALL show the same counts. They SHALL be the counts that person's sheet shows for the same Compare with choice (see `web-trade-for-you` Person sheet), apart from the sheet's caching delay. The counts show in the card's match chip (see Trade card). Matched objekts SHALL be marked with a ring, judged on the post's own objekts. The chip SHALL open a popover naming the viewer's lists the counts came from, each linking to its list: the want lists for the first count, and the have and sale lists for the second.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered. A post whose chip shows SHALL also carry an All matches control after the chip, which opens the owner's person sheet.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own posts, so they can see where a bump put them. For you SHALL never list them. Posts by people the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every post is listed, with match chips and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps their have list "spares" and opens `/trade`
- **THEN** their "spares" post is listed at the top of Browse, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post's owner wants two collections, across their want lists, that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list post holding 1 collection the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** both posts' chips read "Mutual 1 · they have 1 · you have 2"

#### Scenario: A sale list and a buying want list make a person mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's posts show "Mutual 1 · they have 3 · you have 1", and jinsoul.blue is listed under Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count toward "They have", so jinsoul.blue's posts show "They have 0 you want · you have 1 they want" on a neutral surface and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is Mutual when that want list is open to swaps or buying, and is not when it is open to swaps only

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's posts count "They have 0 you want", ring none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Mutual partner
- **WHEN** the viewer activates All matches on one of rin.trades's posts
- **THEN** rin.trades's person sheet opens and the URL carries `person=<rin.trades's id>`

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists
- **THEN** rin.trades's chip counts "They have 2 you want", not 3

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Mutual only is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match chip, no rings and no All matches control, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's posts are not listed on Browse or For you for that viewer

### Requirement: Bump
The owner of a post on Trade SHALL be able to bump it once every 24 hours. A bump moves the post to the top of the feed, and brings back an idle post. Bumping a paired post SHALL bump both of its lists. A bump within 24 hours of the post's last bump SHALL be refused, and the control SHALL show when the next bump is allowed. Only the owner SHALL be able to bump.

#### Scenario: Bump moves the post up
- **WHEN** the owner bumps a post last bumped 26 hours ago
- **THEN** other viewers see it first on `/trade` on their next load, and the Bump control shows the next bump in 24 hours

#### Scenario: Too soon
- **WHEN** the owner tries to bump a post bumped 3 hours ago
- **THEN** the bump is refused and the post keeps its place

#### Scenario: Off and on again
- **WHEN** the owner turns Show on Trade off and back on for a list bumped 3 hours ago
- **THEN** the post keeps the bump time from 3 hours ago

#### Scenario: Second half of a pair
- **WHEN** have list "spares" is on Trade, bumped 3 hours ago, and the owner turns Show on Trade on for its linked want list
- **THEN** the paired post keeps the bump time from 3 hours ago

### Requirement: Your posts and Post a list
A signed-in viewer's own posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, and how many can be bumped now, with a control that shows or hides the posts. An idle post counts as one that can be bumped, since a bump brings it back. When every post can be bumped, the row SHALL read "all ready to bump" in place of the number, and when none can, it SHALL leave that part out. Shown, each entry SHALL show:
- the lists in the post;
- whether the post is listed or idle;
- when it was last bumped;
- a Bump control.

With no choice saved in this browser, the posts SHALL start shown when any of them is idle, and hidden otherwise. Showing or hiding them SHALL be remembered in this browser, and that choice SHALL win over the default. A viewer with no posts SHALL see neither the row nor the posts.

A Post a list control SHALL open a dialog listing the viewer's have, want and sale lists, each with the same Show on Trade switch the list form offers (Show on Market on a sale list), saving at once. Turning it off SHALL also take the list out of matching, and on a sale list off Market.

A have or sale list not filed under a Cosmo profile cannot be on Trade, so its switch SHALL be disabled and say why. A signed-out visitor activating Post a list SHALL be sent to `/login?redirect=/trade`.

#### Scenario: Summary of six posts
- **WHEN** the viewer has six posts, one idle, and two can be bumped now
- **THEN** the row reads Your posts with 5 listed, 1 idle and 2 ready to bump

#### Scenario: Every post ready
- **WHEN** the viewer has eight posts, seven listed and one idle, and all eight can be bumped now
- **THEN** the row reads Your posts with 7 listed, 1 idle and all ready to bump

#### Scenario: None ready
- **WHEN** the viewer bumped all three of their posts an hour ago
- **THEN** the row reads Your posts with 3 listed, and nothing about bumping

#### Scenario: Starts hidden when nothing is idle
- **WHEN** none of the viewer's posts is idle and they have never shown or hidden them
- **THEN** only the summary row is above the feed

#### Scenario: Starts shown when a post is idle
- **WHEN** one of the viewer's posts is idle and they have never shown or hidden them
- **THEN** the posts are listed under the summary row

#### Scenario: The choice is remembered
- **WHEN** the viewer hides the posts and later opens `/trade` again in the same browser, with a post now idle
- **THEN** the posts stay hidden, and the summary row still counts the idle post

#### Scenario: Post from the dialog
- **WHEN** the viewer turns Show on Trade on for want list "binary hunt" in the dialog
- **THEN** the list is on Trade and in matching, and appears under Your posts as bumped just now

#### Scenario: Take down from the dialog
- **WHEN** the viewer turns Show on Market off for a sale list in the dialog
- **THEN** the list leaves `/trade`, Market and For you

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** its switch in the dialog is disabled with the reason shown

### Requirement: Trade tabs
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar, marking the current one. It reads Browse, For you and My trades. For you SHALL be shown only to a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile); for anyone else the bar reads Browse and My trades. For a signed-out visitor, My trades SHALL lead to `/login?redirect=/trade/mine`. The Trade item in the primary navigation SHALL open Browse.

For a signed-in user, My trades SHALL carry a count after its label, in monospace: the open offers waiting on the user (Needs you) plus the trades in progress:
- zero SHALL show nothing;
- above 99 SHALL read "99+";
- the tab's accessible name SHALL include it.

The count SHALL be read when the tab bar loads and when the user moves between Trade tabs. Browse and For you SHALL carry no count: For you lists every match, so a number on it would read as a match count (see Matches and Compare with for Mutual N).

#### Scenario: Switch tabs
- **WHEN** a signed-in user with a want list on `/trade` activates For you
- **THEN** the browser is at `/trade/for-you` and For you is marked current

#### Scenario: My trades signed out
- **WHEN** a signed-out visitor activates My trades
- **THEN** the browser is at `/login?redirect=/trade/mine`

#### Scenario: Counts
- **WHEN** a signed-in user has 1 offer waiting on them, 1 trade in progress and 4 mutual people
- **THEN** the tabs read "Browse", "For you" and "My trades 2", and a screen reader announces the count

#### Scenario: Nothing waiting
- **WHEN** the user has no open offer to answer, no trade in progress and no mutual person
- **THEN** My trades shows no count

#### Scenario: No list that can match
- **WHEN** a signed-in user whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** the tabs read Browse and My trades, with no For you tab

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade`
- **THEN** the tabs read Browse and My trades, no tab shows a count, and no count is requested

### Requirement: Freshness
Show on Trade changes and bumps SHALL show on every viewer's next load of `/trade`. Changes to entries SHALL appear within 1 minute.

#### Scenario: Someone else posts
- **WHEN** another user turns Show on Trade on for a list
- **THEN** a viewer reloading `/trade` sees the post

#### Scenario: Entry added
- **WHEN** an owner adds an objekt to a list on Trade
- **THEN** viewers see it in the post within 1 minute

### Requirement: Message a post's owner
Each post not owned by the viewer SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the owner, adding a post card for the post (see `web-chat`), never an objekt card for one of its objekts. When the signed-in viewer has matches with the post's owner, as the post's match chip shows, the post card SHALL carry the match; otherwise it SHALL carry none. A post whose owner doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address and no matches with rin.trades activates Message on rin.trades's WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a post card for that post attached, and no objekt card

#### Scenario: From a post with matches
- **WHEN** a signed-in user whose match chip on mina's post shows matches both ways activates Message on it
- **THEN** the conversation opens with a post card carrying the match attached

### Requirement: Blocks and trade blocks
The feed SHALL leave out, for each viewer:
- posts by accounts the viewer blocked;
- posts by accounts that blocked the viewer;
- posts by any account under an active trade block or ban.

The drawer's On Trade counts SHALL leave out trade-blocked and banned accounts. Each post not owned by the viewer SHALL offer Block and Report… in its menu.

#### Scenario: Trade-blocked owner
- **WHEN** rin.trades is under a trade block
- **THEN** no viewer sees rin.trades's posts on `/trade`

### Requirement: Make offer on a post
Each post that shows Message SHALL also offer Make offer. It opens the offer builder for the post's owner, addressed to the post's own list: the have list of a pair, or the post's only list. When that list is a have or sale list, You get SHALL ask only from it; a want-only post's You get works as from a conversation (see `web-trade-offers`).

The builder SHALL open empty: the post SHALL hand it no shortcuts and no prefill, and Add SHALL open the full picker.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's post for the have list "doubles", and rin.trades also has the sale list "spares" on Trade
- **THEN** the builder opens addressed to rin.trades, and You get's picker lists the entries of "doubles" only

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a WTB post wanting HaSeul 302Z, and holds a copy of it
- **THEN** the builder opens with nothing under You give or You get, You give's picker lists the copy, and You get's picker asks from the owner's have and sale lists, or their collection when they have none

### Requirement: Owner reputation on posts
Each post SHALL show its owner's reputation line (see `web-verified-trades`) beside the owner's name.

#### Scenario: Post byline
- **WHEN** a viewer sees nakyoung.cards's post
- **THEN** the byline shows nakyoung.cards's verified count and positive share

### Requirement: Trade card
A post on Browse and a person sheet (see `web-trade-for-you`) SHALL be built from the same header and actions, in the same order. A post carries the match chip and its strips; the person sheet carries its summary and sections in their place (see `web-trade-for-you` Person sheet):
- **Header**:
  - the avatar;
  - the name, linking to the profile, with the Discord badge the owner chose to show. The Twitter badge the owner chose to show SHALL sit in the person sheet only, so a Browse or For you post's byline keeps to one line of badges;
  - the reputation line (see `web-verified-trades`);
  - the ⋯ menu, holding Hide, Block and Report for a signed-in viewer who is not the owner.
- **Match chip**, on a post, for a signed-in viewer with at least one count above zero. On For you, a post SHALL show it only when M is above zero: on a one-way post the strip labels carry the count (see Filters, Narrowing), and All matches still opens the person sheet with both counts. With A the "They have" count, B the "You have" count and M the mutual score (see Matches to the signed-in viewer):
  - only A above zero: it reads "They have A you want";
  - only B above zero: it reads "You have B they want";
  - both above zero and M zero: it reads "They have A you want · you have B they want";
  - M above zero: it reads "Mutual M · they have A · you have B".
  - It SHALL sit on a neutral surface when M is zero, and on the mutual colour when M is above zero.
  - Its numbers SHALL be monospace.
  - Its visible words SHALL be its accessible name.
  - It SHALL open the popover of matched lists.
  - The person sheet's summary SHALL show the same A, B and M as the chip, with the same mutual colour.
- **Strip**: a monospace role label in its list type's colour, with the number of copies on that side, then " · " and the list's name, muted and truncated to one line, over one line of thumbnails 2.5rem wide with no caption. The label SHALL link to the list page, carrying the list's name and description in its title, and the description SHALL also be available to assistive technology. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting the copies not shown, in the same unit as the label. On Browse the tile links to the list.
- **Actions**: Message, then Make offer as the primary button. An account that doesn't take messages from the viewer shows "Not taking messages" in their place.

**A Browse post** SHALL be a bordered card on the card surface, one post to a row at every width, laid out in one line where it fits:
- a byline column: the header, the post's type tags, and the updated or bumped time in monospace. The reputation line SHALL stay on one line, truncated with an ellipsis when it doesn't fit, its full text available to assistive technology. On Browse, the viewer's own posts SHALL carry a muted "You" tag after the name. A WTT post with only a want side SHALL also show a short muted note beside its tag, "Swaps only, not buying", saying the owner wants to trade, not buy;
- the sides, taking the remaining width:
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them. When narrowing leaves one side with no related objekt, that side is the muted line Filters describes, under the other strip, which takes the whole width, with no ⇄ mark;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the whole width;
  - a side whose list has no entries: the muted line Filters describes, reading "nothing listed" ("HAVE 0 · nothing listed"), whether or not a filter is active, under the other strip, with no ⇄ mark;

  Side-by-side strips SHALL be top-aligned, so their labels sit on one line whatever each strip holds.
- the actions: Make offer and an icon-only Message with an accessible name;
- under the sides, one line holding the match chip and the All matches control, styled as small outline buttons in the same type. Each strip's role label links to its own list (see Strip), so a post holding two lists needs no separate control for them.

Below `md`, the post SHALL stack:
- a header: the avatar, the name, and under it one monospace line with the tag, the compact reputation and the time, with the ⋯ menu at its end. The compact reputation is:
  - for an account with no completed and no unfinished trades, a small muted "New" tag in place of "No verified trades yet";
  - otherwise the reputation line (see `web-verified-trades`) without its "since <month>" part: the verified count, the unfinished count when above 0, and the positive share when there is one ("No verified trades · 1 unfinished" for an account with only unfinished ones).

  The line SHALL wrap onto a second line when it doesn't fit, breaking between its parts (tag, reputation, time, note) and never inside one, and SHALL never be cut off. No line SHALL end on a " · " separator: a part that starts a line drops its own. Its visible words SHALL be its accessible text, and the full reputation line stays in the person sheet, on the profile and in chat;
- each strip at full width, with the ⇄ mark between two strips turned to point down;
- the match chip, when it shows;
- the actions in one row: the icon-only Message, Make offer filling the remaining width, and All matches when the post has it.

The strips SHALL still not wrap.

Every row SHALL have the same layout whatever the number of objekts, so posts in the feed differ in height only by their number of sides and muted lines when stacked.

**A person sheet** is laid out in `web-trade-for-you`.

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's post on Browse and opens rin.trades's person sheet
- **THEN** both show the name, reputation line and ⋯ in the same order, the post's chip reads "Mutual 2 · they have 4 · you have 2", and the sheet's summary reads Mutual 2, 4 they have and 2 you have, its Mutual cell on the same mutual colour

#### Scenario: Chip without a mutual score
- **WHEN** a post's owner has 3 collections the viewer wants and wants none of the viewer's
- **THEN** its chip reads "They have 3 you want" on a neutral surface, and a screen reader announces the same words

#### Scenario: Chip for the other way
- **WHEN** a post's owner wants 1 collection on the viewer's bound have lists and has nothing the viewer wants
- **THEN** its chip reads "You have 1 they want" on a neutral surface

#### Scenario: Want-only WTT post
- **WHEN** a want list on its own is open to swaps only and on Trade
- **THEN** its post shows the WTT tag with "Swaps only, not buying" beside it, and one WANT strip

#### Scenario: Pair has no note
- **WHEN** a WTT post holds a have list and its linked want list
- **THEN** its byline shows the WTT tag and no "Swaps only" note

#### Scenario: Hide from a post
- **WHEN** a signed-in viewer opens the ⋯ menu on rin.trades's post
- **THEN** it offers Hide, Block and Report

#### Scenario: Desktop grid
- **WHEN** the viewer opens `/trade` at 1280 px with 10 posts loaded
- **THEN** the posts sit in 10 rows, one each, and the feed keeps loading more as it scrolls

#### Scenario: Pair side by side
- **WHEN** a WTT post holds a have list and its linked want list, at 1280 px
- **THEN** the HAVE strip and the WANT strip sit side by side in the same row, with ⇄ between them, their labels on one line, and the actions at the row's end

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 27 objekts and its HAVE strip has room for 6 thumbnails
- **THEN** the strip shows 5 thumbnails and a "+22" tile on one line, and the label reads HAVE 27 followed by the list's name

#### Scenario: Short side
- **WHEN** a post's want side holds 2 objekts
- **THEN** its WANT strip shows both thumbnails and no "+N" tile, and the row is as tall as a row with a full strip

#### Scenario: Resize
- **WHEN** the viewer widens the window so a strip has room for 3 more thumbnails
- **THEN** the strip shows 3 more and the "+N" count drops by 3

#### Scenario: WTS post
- **WHEN** a WTS post's sale list holds 19 objekts
- **THEN** one SALE strip runs across the sides' width, its thumbnails showing only their art, with no price caption

#### Scenario: Phone width
- **WHEN** Browse is shown at 390 px
- **THEN** each post stacks its header, HAVE strip, ⇄ pointing down, WANT strip, match chip and actions, Make offer fills the actions row, each strip stays one line ending in "+N", and the page doesn't scroll sideways

#### Scenario: New account on a phone
- **WHEN** at 390 px a WTT post's owner has no completed and no unfinished trades, and the post was updated 2 days ago
- **THEN** its phone line reads WTT, a "New" tag and "Updated 2d ago", with nothing cut off

#### Scenario: Established account on a phone
- **WHEN** at 390 px a post's owner has 5 verified trades, 50% positive, since March 2025
- **THEN** its phone line reads WTT, "5 verified · 50%" and the time, without "since Mar 2025", and the person sheet still shows "since Mar 2025"

#### Scenario: Long line wraps on a phone
- **WHEN** at 390 px a WTT post's owner has 5 verified trades, 50% positive, and the post was bumped last week
- **THEN** its phone line reads "WTT · 5 verified · 50%" and, on a second line, "Bumped last week" with no separator before it, and nothing is cut off

#### Scenario: Own post on Browse
- **WHEN** the viewer's have list "spares" is on Trade and they open `/trade`
- **THEN** their post shows "You" after their name, and no Message or Make offer

#### Scenario: One list
- **WHEN** a WTS post holds one sale list "duplicates"
- **THEN** its SALE label reads "SALE <copies> · duplicates" and links to the "duplicates" list page

#### Scenario: Two lists
- **WHEN** a WTT post holds have list "spares" and want list "binary hunt"
- **THEN** its HAVE label names and links to "spares", its WANT label names and links to "binary hunt", and the line under the sides shows no "2 lists" control

#### Scenario: Twitter in the sheet
- **WHEN** rin.trades shows both Discord and Twitter, and the viewer sees their post and opens their sheet
- **THEN** the post's byline shows the Discord badge only, and the sheet shows both

#### Scenario: One-way post on For you
- **WHEN** on For you a post's owner has 3 collections the viewer wants and wants none of the viewer's
- **THEN** the post shows no match chip, its label reads "HAVE 3 you want", and All matches is shown

#### Scenario: Mutual post on For you
- **WHEN** on For you a post's owner has a mutual score of 2 with the viewer
- **THEN** the post shows the indigo chip "Mutual 2 · they have 14 · you have 2" before All matches

### Requirement: Trade colours
Trade cards on Browse and in the person sheet SHALL colour their type marks (see `web-lists` List type colours):
- post tags, list badges, strip role labels and the person sheet's group labels take their list type's colour;
- the match chip, and the person sheet's Mutual cell, are indigo when there is a mutual score and neutral otherwise; the sheet's other summary numbers stay neutral.

Cards, sheets, buttons, avatars and backgrounds SHALL stay neutral, apart from the destructive strike on an objekt that isn't counted (see `web-trade-for-you` Person sheet).

#### Scenario: A WTS post
- **WHEN** the viewer sees a WTS post whose owner has 3 collections on the viewer's want lists and wants none of the viewer's
- **THEN** its WTS tag and SALE label are rose, and its chip reads "They have 3 you want" on a neutral surface

#### Scenario: Mutual partner
- **WHEN** rin.trades's post chip reads "Mutual 2 · they have 14 · you have 2", and the viewer opens their sheet, where the 14 come from have list "spares" and the 2 go to their want list "binary hunt"
- **THEN** the chip and the sheet's Mutual cell are indigo, the 14 and the 2 are neutral, the group label "HAVE 14 you want" is teal and "WANT 2 you have" is amber

### Requirement: Matches and Compare with
For you (`/trade/for-you`) SHALL list the same posts as Browse, in the same cards and with the same Post type menu and facets, narrowed by matching. It SHALL carry a Mutual only switch (see Layout for where it sits). Off is Any, the default; on is Mutual:
- **Any**: only posts holding at least one objekt that matches the viewer are kept, judged on each post's own lists (see Filters), listed in two sections (see Any order).
- **Mutual**: only the posts of people whose mutual score is above zero, as the person's chip computes it (see Matches to the signed-in viewer). Of those people's posts, only those holding a match are kept, as under Any.

**Who sees it.** For you SHALL require a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile):
- a signed-out visitor opening it SHALL be sent to `/login`, and back to the same For you address after signing in;
- a signed-in viewer without such a list SHALL be sent to `/trade`, keeping the filters and an open person sheet, and dropping `match` and `list`.

**Post type menu.** On Browse and For you, the post type SHALL be one menu labelled Post type, offering All, WTT, WTB and WTS, with each tag spelled out ("WTT · Want to trade"). It replaces the Type tabs, so the controls beside it never move. Mutual is a swap between two people, and a WTB or WTS post is one-way money, so Mutual SHALL list WTT posts only: the menu SHALL read WTT with every other option disabled, a `type` in the URL or in a request SHALL be ignored, by the server as well as the page, and turning Mutual only on SHALL drop it from the URL. Who counts as Mutual is unchanged (see Matches to the signed-in viewer).

**Default and URL.** The option SHALL live in the URL as `match`, with the values `any` and `mutual`. With no `match`, or a value that does not parse, Any SHALL apply. Browse's `type`, `slug`, facet and `person` parameters SHALL carry the same meaning on For you.

**Mutual order.** Under Mutual the feed SHALL list people best match first:
1. the mutual score;
2. then the sum of both counts;
3. then the most recent change to any of the person's matched lists.

Each person's listed posts SHALL be grouped together, newest bump first. Every Mutual person SHALL be listed, with no cap beyond the 200 candidates matching reads, and idle posts SHALL not be listed (see Order and idle posts). The feed SHALL load 24 posts at a time and continue after the last person and post it showed. When the ranking is worked out again between two loads, a post already shown SHALL not be listed again.

**Any order.** Under Any the feed SHALL list two sections, in this order:
1. **Mutual**: exactly the posts Mutual lists for the same filters and Compare with choice, in Mutual order. With WTB or WTS picked in the Post type menu there is no Mutual section, since Mutual lists WTT posts only.
2. **One way**: every other post Any keeps, including a Mutual person's WTB and WTS posts. People SHALL be listed most matches first, by the sum of both counts and then the most recent change to any of their matched lists, among the people matching ranks (at most its 200 candidates). Each person's posts are grouped together, newest bump first. After them come the posts of anyone else Any keeps, newest bump first.

Each section SHALL open with a heading, Mutual or One way, with no count, over its first post. A section with no posts SHALL have no heading. Under Mutual only there SHALL be no section heading. The feed SHALL load 24 posts at a time across the sections, continuing after the last post it showed, and SHALL not list a post twice when the ranking is worked out again between two loads. The empty states of Filters are unchanged.

**Description.** Under the tabs, For you's description SHALL read "Posts that match your lists, best match first." Below `md`, neither tab SHALL show its description.

**Mutual N.** The Mutual only switch SHALL read "Mutual only N", on or off, N being how many people Mutual lists for the current Compare with choice: people with at least one matching WTT post, with no artist or collection filter applied, so N stays put while the viewer filters. A one-way list, which Mutual can't use, counts as All my lists:
- a count of zero SHALL show the label with no number;
- a count above 99 SHALL read "99+";
- N SHALL be in monospace, and the accessible name SHALL include it;
- N MAY be up to 5 minutes behind the people Mutual lists.

**Compare with.** For you SHALL always show a Compare with control. It offers All my lists and each of the viewer's have, sale and want lists that take part in Trade, each option tagged with its list type. It SHALL live in the URL as `list`, a list slug.
- A named list SHALL compare together with its linked list, both ways.
- A list with no link (a sale list, or a have or want list whose linked list doesn't take part) SHALL compare one way. It SHALL be offered under Any and disabled under Mutual, and switching to Mutual while it is selected SHALL reset Compare with to All my lists.
- A disabled option SHALL carry a short muted reason: "Compares one way" for a one-way list under Mutual, and "Can't match WTB posts", "Can't match WTS posts" or "Can't match WTT posts" for a list the Post type can't use.
- A list that the picked Post type can never match SHALL be offered disabled, as Mutual disables one-way lists, and the Post type menu SHALL never disable an option because of the picked list:
  - **All**: every list can be offered;
  - **WTT**: under WTT, the viewer's have or sale list matches through the post's want side, while the viewer's want list (open to swaps) matches the post's have side; so a selection with no have or sale list and no want list open to swaps (Swaps only, or Swaps or buying) is disabled. That is a lone Buying only want list, which a pair with a have list passes through its have half;
  - **WTB**: a WTB post is the poster's want list, matched against the viewer's have and sale lists, so only a have or sale list SHALL be offered. A want list SHALL be disabled, even one linked to a have list: picking it would compare the same pair as picking its have list, under a type it can't match;
  - **WTS**: a WTS post is a sale list, matched against the viewer's want lists open to buying, so only a want list open to buying (Swaps or buying, or Buying only) SHALL be offered. A have list, a sale list and a Swaps only want list SHALL be disabled, a have list even when it is linked to a want list open to buying;
  - **Mutual**: as above, and it fixes the type to WTT.
- Changing the Post type to one that can't use the selected list SHALL reset Compare with to All my lists, as turning on Mutual does. Turning Mutual only off SHALL check the kept list against the URL's `type`, which applies again, and reset Compare with to All my lists when that type can't use it.
- A `list` that is not one of the viewer's lists that take part, or that the current option or Post type can't use, SHALL read as All my lists: in the menu, the compared-lists line, the person sheet and the feed request, which SHALL not send it. The URL is left as it is until the next change.
- The compared lists SHALL replace the viewer's lists everywhere matching shows on For you: the chips and their popovers, the rings, Any and Mutual.
- While Compare with names a list, one line under the controls SHALL say what is compared: the named list with its linked list, or the named list alone and which way it compares. With All my lists, no line SHALL show.

The help beside the controls SHALL describe the mutual score as the smaller of the two counts, where a sale list counts only against a want list open to buying, and describe Compare with as one list plus its linked list, a list with no link comparing one way.

**Old Browse links.** `/trade` SHALL no longer take `match` or `list`:
- `/trade?match=any`, `/trade?match=mutual` or `/trade?matches=1` SHALL redirect to `/trade/for-you` with the same option (`matches=1` becomes `match=any`), keeping `list`, `person` and the filters;
- `/trade?match=off` SHALL drop `match` and `list` and stay on Browse;
- on a viewer who can't use For you, the redirected address then sends them on as Who sees it says.

**Layout.** From `md` up, Compare with and the help SHALL follow the Post type menu on the facet row, after a divider, and the Mutual only switch SHALL come last, at the very right of the row after the help, staying last when the row wraps. Below `md`, the Filters button, Reset, the Mutual only switch, the Post type menu, Compare with and the help SHALL sit in that order in one row that wraps onto further lines when it doesn't fit, so the page doesn't scroll sideways. The Mutual only switch SHALL come after Compare with and the help in the DOM from `md` up, so keyboard order follows the visual order. The compared-lists line SHALL sit under the row. There SHALL be no separate Matching button or sheet. A change SHALL apply at once.

#### Scenario: Default is Any
- **WHEN** a signed-in viewer with want list "binary hunt" opens `/trade/for-you` with no parameters
- **THEN** Mutual only is off, Compare with reads All my lists with no compared-lists line under it, and only posts holding an objekt that matches the viewer's lists are listed, narrowed and ringed

#### Scenario: Turn matching off
- **WHEN** the viewer on For you wants every post
- **THEN** For you offers only the Mutual only switch, and the viewer activates the Browse tab instead

#### Scenario: Old Browse link
- **WHEN** a signed-in viewer with a want list opens `/trade?match=mutual&list=spares` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual&list=spares`

#### Scenario: Old Only matches link
- **WHEN** a signed-in viewer with a want list opens `/trade?matches=1`
- **THEN** the browser is at `/trade/for-you?match=any`

#### Scenario: Old Off link
- **WHEN** a signed-in viewer opens `/trade?match=off&list=spares`
- **THEN** the browser is at `/trade` and every post is listed

#### Scenario: Mutual ranks people
- **WHEN** the viewer turns on Mutual only, and rin.trades has a mutual score of 3 with two posts and kaede.k has a mutual score of 1 with one post bumped more recently than either
- **THEN** the URL carries `match=mutual`, rin.trades's two posts are listed first, newest bump first, and kaede.k's post follows

#### Scenario: Sale-only person under Mutual
- **WHEN** jinsoul.blue matches the viewer both ways only through sale lists, against want lists open to swaps or buying
- **THEN** jinsoul.blue's posts are listed under Any, and their WTT posts under Mutual

#### Scenario: Sale-only person against a swaps-only want list
- **WHEN** jinsoul.blue's only match in one direction is a sale list against a want list open to swaps only
- **THEN** that direction counts 0, and jinsoul.blue's posts are listed under Any if they match the other way, and not under Mutual

#### Scenario: Type under Mutual
- **WHEN** under Any the viewer picks WTS in the Post type menu and then turns on Mutual only
- **THEN** the menu reads WTT with All, WTB and WTS disabled, the URL no longer carries `type`, only WTT posts are listed, and the switch stays where it was

#### Scenario: More under Mutual
- **WHEN** 40 posts by mutual people are listed and the viewer scrolls past the first 24
- **THEN** the feed loads the remaining 16 in the same order, without repeating a post

#### Scenario: Compare one pair
- **WHEN** under Mutual the viewer picks have list "spares", linked to want list "binary hunt"
- **THEN** the URL carries `list=spares`, the line reads "What you have: spares. What you want: binary hunt.", chips and rings count only those two lists, and the switch counts the mutual people for them

#### Scenario: Lone list under Mutual
- **WHEN** under Any the viewer picks sale list "duplicates" and then turns on Mutual only
- **THEN** Compare with resets to All my lists, and "duplicates" is offered disabled

#### Scenario: WTB disables a lone want list
- **WHEN** on For you the viewer picks Post type WTB, and has want list "binary hunt" with no link and have list "spares"
- **THEN** Compare with offers "binary hunt" disabled with the reason "Can't match WTB posts", and "spares" enabled

#### Scenario: WTT disables a lone Buying only want list
- **WHEN** on For you the viewer picks Post type WTT, and has a Buying only want list "bulk buys" with no link, and a have list "spares" paired with a Buying only want list
- **THEN** Compare with offers "bulk buys" disabled and "spares" enabled

#### Scenario: WTS disables lists that can't match
- **WHEN** on For you the viewer picks Post type WTS, and has a lone have list, a sale list, a lone Swaps only want list and a have and want pair whose want list is Swaps only
- **THEN** Compare with offers all four disabled, and a want list open to buying, alone or in a pair, enabled

#### Scenario: WTS disables the have half of a buying pair
- **WHEN** on For you the viewer picks Post type WTS, and has have list "spares" linked to want list "store hunt", set to Swaps or buying
- **THEN** Compare with offers "store hunt" enabled and "spares" disabled with the reason "Can't match WTS posts"

#### Scenario: Switching to WTB resets a lone want list
- **WHEN** under Any the viewer has picked a lone want list "binary hunt" and then picks Post type WTB
- **THEN** Compare with resets to All my lists and the URL no longer carries `list`

#### Scenario: Post type never disables for the list
- **WHEN** the viewer has picked a lone want list
- **THEN** every Post type option is still offered, and picking WTB resets Compare with

#### Scenario: Old link with a list the type can't use
- **WHEN** the viewer opens `/trade/for-you?type=wtb&list=binary-hunt` and "binary-hunt" is a lone want list
- **THEN** Compare with reads All my lists, no compared-lists line shows, and the feed is requested without that list

#### Scenario: Mutual count ignores Post type
- **WHEN** the viewer has picked WTB and a have list
- **THEN** the Mutual only count is the one for that list, as under All

#### Scenario: Mutual only switch last
- **WHEN** the viewer opens For you at 1280 px
- **THEN** the Mutual only switch is the rightmost control on the row, after Compare with and the help, with the divider between Post type and Compare with

#### Scenario: Mutual count
- **WHEN** 4 people match the viewer mutually with all lists compared
- **THEN** the switch reads "Mutual only 4", the tab reads "For you", and a screen reader announces the count

#### Scenario: Mutual count ignores filters
- **WHEN** the switch reads "Mutual only 4", Mutual only is on, and the viewer filters to member SeoYeon, which only 1 of those people's matching posts holds
- **THEN** the switch still reads "Mutual only 4", and the feed lists that 1 person

#### Scenario: Foreign list slug
- **WHEN** the URL's `list` is the slug of another account's list
- **THEN** all of the viewer's lists are compared and Compare with shows All my lists

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade/for-you?match=mutual`
- **THEN** the browser is at `/login`, and after signing in with a want list they land on `/trade/for-you?match=mutual`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade/for-you?list=spares&member=SeoYeon`
- **THEN** the browser is at `/trade?member=SeoYeon`

#### Scenario: Phone
- **WHEN** the viewer opens `/trade/for-you?match=mutual&list=spares` at 390 px
- **THEN** the Filters button, Reset, the Mutual only switch (on), the Post type menu, Compare with naming spares and the help wrap across the row's lines, no collection filter shows on the row, the compared-lists line sits under it, and the page doesn't scroll sideways

#### Scenario: Two sections under Any
- **WHEN** the viewer opens `/trade/for-you`, rin.trades is mutual with one WTT post and one WTS post, and sodalove matches them one way
- **THEN** the feed opens with the heading Mutual over rin.trades's WTT post, then the heading One way over rin.trades's WTS post and sodalove's posts, in the order One way defines

#### Scenario: Most matches first
- **WHEN** under Any, sodalove's one-way counts add up to 7 and hyhedgehog's to 1, and hyhedgehog bumped more recently
- **THEN** sodalove's posts are listed above hyhedgehog's in One way

#### Scenario: Past the ranked people
- **WHEN** under Any, more people match the viewer than matching ranks, and the viewer scrolls past every ranked person
- **THEN** the feed goes on with the other matching posts, newest bump first, without repeating a post

#### Scenario: Nobody mutual under Any
- **WHEN** under Any no one matches the viewer both ways, and some posts match one way
- **THEN** the feed shows no Mutual heading and opens with the One way heading

#### Scenario: Headings under Mutual only
- **WHEN** the viewer turns on Mutual only
- **THEN** the feed lists the Mutual posts with no section heading

### Requirement: Buying only note
A WTB post whose want list is set to Buying only SHALL show a short muted note beside its tag, "Buying only, not swapping", in the byline, the way a want-only WTT post shows "Swaps only, not buying". A WTB post whose want list is open to swaps or buying SHALL show no note. The Browse help's tag table SHALL describe WTB as a want list open to swaps or buying, or set to buying only, and its "What counts toward Mutual" table SHALL show that a have list counts against a want list open to swaps only or to swaps or buying and not against one set to buying only, and that a sale list counts against a want list open to swaps or buying or set to buying only and not against one open to swaps only.

#### Scenario: Buying-only post
- **WHEN** a want list on its own is set to Buying only and on Trade
- **THEN** its post shows the WTB tag with "Buying only, not swapping" beside it, and one WANT strip

#### Scenario: Swaps or buying post
- **WHEN** a want list on its own is open to swaps or buying and on Trade
- **THEN** its post shows the WTB tag and no note

#### Scenario: Help table
- **WHEN** the viewer opens the matching help on Browse
- **THEN** the Mutual table shows a have list counting against Swaps only and Swaps or buying but not Buying only, and a sale list counting against Swaps or buying and Buying only but not Swaps only
