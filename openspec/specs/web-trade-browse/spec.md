# web-trade-browse Specification

## Purpose
The public Trade Browse feed on `apps/web` at `/trade`: posts by people who put their have, want or sale lists on Trade, kept fresh by Bump and current ownership, with matches to the signed-in viewer marked.

## Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL hold one post per list its owner put on Trade through the post composer, or through Show on Market and Trade on a sale list (see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list, or a sale list open to swaps, and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The feed SHALL list each person's posts together in one row (see Trade card). The page SHALL be open to signed-out visitors.

Each post SHALL carry one, two or three tags:
- WTT for a have list, alone or paired with its want list, which is open to swaps (a pair can't be Buying only, see `web-lists`), and for a want list on its own open to swaps (Swaps only, or Swaps or buying);
- WTB for a post whose want list is open to buying: a want list on its own set to Buying only or Swaps or buying, or a pair whose want list is open to buying;
- WTT for a sale list open to swaps, alone or paired with its want list;
- WTS for a sale list.

A post with more than one tag SHALL show them all, WTT before WTB, and on a sale post WTS first, and SHALL be listed under each in the Post type menu. Mutual SHALL count a post that carries WTT as a WTT post.

#### Scenario: Trades-only want list
- **WHEN** a want list on its own is open to swaps only, whether or not it is linked to a have list that is off Trade
- **THEN** its post is tagged WTT only and listed under WTT, not WTB

#### Scenario: Buying-only want list
- **WHEN** a want list on its own is set to Buying only
- **THEN** its post is tagged WTB only and listed under WTB

#### Scenario: Want list open to swaps or buying
- **WHEN** a want list on its own is open to swaps or buying, and its owner is Mutual with the viewer
- **THEN** its post is tagged WTT and WTB, listed under both WTT and WTB, and listed by Mutual, which listed it under neither before this change

#### Scenario: Have list linked to a buying-only want list
- **WHEN** the user tries to pair have list "spares" with want list "store hunt", which is set to Buying only
- **THEN** the pair is refused, so no WTT post holds a want side that matches sale lists only

#### Scenario: Pair saved before the pair rule
- **WHEN** have list "spares" is on Trade and linked to want list "store hunt", which was set to Buying only before a pair had to take swaps, and is on Trade
- **THEN** the feed shows one post tagged WTT and WTB holding both sides, and the Want side matches sale lists only

#### Scenario: Pair that would also pay
- **WHEN** have list "spares" is on Trade and linked to want list "binary hunt", which is open to swaps or buying and on Trade
- **THEN** the feed shows one post tagged WTT and WTB holding both sides, listed under WTT and under WTB, and Mutual lists it as a WTT post

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address, the shortened address when it has none, and, for a list bound to no address, the account's default profile, else the account's display name; see `web-cosmo-link`), with the avatar;
- its tags, and each list's name and description;
- up to 11 objekts per side on a post with two sides, and up to 20 on a post with one side, with the number of further objekts;
- on a WTS post, each objekt's price in the list's currency, or QYOP;
- when the post was last bumped, or last changed if that is later.

Each list in a post SHALL link to its list page.

#### Scenario: Linked pair is one post
- **WHEN** have list "spares" is linked to want list "binary hunt", open to swaps only, and both are on Trade
- **THEN** the feed shows one WTT post holding a Have side from Spares and a Want side from Binary hunt

#### Scenario: Half a pair
- **WHEN** "spares" is on Trade and its linked want list is not
- **THEN** the feed shows a WTT post with only the Have side

#### Scenario: Sale list on Market
- **WHEN** a sale list bound to a Cosmo profile has Show on Market and Trade on
- **THEN** the feed shows it as a WTS post

#### Scenario: Not on Trade
- **WHEN** a have list is in no post
- **THEN** it does not appear on `/trade`, and For you does not match it

#### Scenario: Discoverable before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 3 days before launch
- **THEN** at launch it appears on `/trade` with its time showing that change, ordered as if bumped then

#### Scenario: Long-untouched before launch
- **WHEN** a want list was discoverable before Browse launched and was last changed 60 days before launch
- **THEN** at launch it is idle: it is not listed on `/trade` and does not count toward its owner's matches until its owner bumps or changes it

#### Scenario: One side gets more
- **WHEN** a WTS post's sale list holds 30 objekts, and a WTT pair's have and want lists hold 30 each
- **THEN** the WTS post sends 20 objekts and a count of 10 more, and the pair sends 11 per side and a count of 19 more on each

#### Scenario: Want list with no profile
- **WHEN** a want list filed under no profile is on Trade, and its owner's default profile is "rin.alt"
- **THEN** its post is headed "rin.alt", the name the owner's chat partners see

#### Scenario: Sell or swap post
- **WHEN** sale list "binary sale", open to swaps, is on Trade on its own
- **THEN** its post is tagged WTS then WTT, listed under both in the Post type menu, shows prices, and Mutual counts it as a WTT post

#### Scenario: Sale and want pair
- **WHEN** "binary sale", open to swaps, is linked to want list "binary hunt" and both are on Trade
- **THEN** the feed shows one post tagged WTS and WTT holding a Sale side with prices and a Want side

#### Scenario: Sale pair that would also pay
- **WHEN** "binary sale", open to swaps, is linked to want list "binary hunt", which is open to swaps or buying, and both are on Trade
- **THEN** the feed shows one post tagged WTS, WTT and WTB holding a Sale side with prices and a Want side, listed under each of the three in the Post type menu

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
The feed SHALL list people, one row each. On Browse, people SHALL be ordered by the newest bump among their listed posts, newest first. On For you, Mutual orders people best match first and Any lists its Mutual and One way sections in their own order (see Matches and Compare with). Within a row, posts SHALL be ordered as Trade card says. Turning Show on Trade on SHALL count as a bump of that list, unless its owner bumped in the last 24 hours, in which case the list takes that bump's time, so neither switching a list off and on nor posting a new list skips the bump limit. Editing a list or its entries SHALL not move its post.

A post SHALL be idle when 30 days have passed since its last bump and since the last change to any of its lists or their entries. An idle post SHALL not be listed until it is bumped or changed, under every option, and its lists SHALL not count toward its owner's matches (see Matches to the signed-in viewer). A person with no listed post SHALL not be listed. The feed SHALL load more people as the viewer scrolls, 12 at a time, each row holding all of that person's posts the feed keeps.

The order SHALL be worked out once, when the feed opens, for its filters, Compare with choice and option, and SHALL hold while the viewer scrolls, for up to an hour. Loading more SHALL continue in that order, so no person is skipped or listed twice when a ranking or a bump changes between loads. A person in that order who no longer has a post the feed keeps SHALL be left out when their place is reached. A person who posts, bumps or starts matching after the feed opened SHALL be listed once the feed is opened again. Past the hour, loading more SHALL go on from the last person shown in the order as it stands then.

#### Scenario: Edit does not jump the queue
- **WHEN** an owner adds an entry to a list on Trade that was bumped 3 days ago
- **THEN** the owner's row keeps its place, and the list's time shows the change

#### Scenario: Idle post drops out
- **WHEN** a post was last bumped 31 days ago and none of its lists changed since
- **THEN** it is not listed on `/trade`

#### Scenario: Idle list does not count
- **WHEN** rin.trades's have list holds 3 collections the viewer wants but is idle, and rin.trades's listed want list asks for 1 collection on the viewer's bound have list
- **THEN** rin.trades's row reads "You have 1 they want", shows only the want list, and rin.trades is not listed under Mutual

#### Scenario: Idle under Mutual
- **WHEN** kaede.k would match the viewer mutually, but kaede.k's only post is idle
- **THEN** kaede.k is not listed under Mutual and is not counted in Mutual N

#### Scenario: Person ordered by their newest post
- **WHEN** rin.trades bumped a have list yesterday and a want list 10 days ago, and sodalove's only post was bumped 3 days ago
- **THEN** on Browse rin.trades's row, holding both lists, is listed above sodalove's

#### Scenario: Browse stays in bump order
- **WHEN** a signed-in viewer opens `/trade`, and a person matching them 5 ways last bumped before a person matching them none
- **THEN** the person matching none is listed first

#### Scenario: Twelve people a page
- **WHEN** 30 people have listed posts and the viewer scrolls past the first 12 rows
- **THEN** the feed loads the next 12 people, each with all of their listed posts, and no person is listed twice

#### Scenario: Bump while scrolling
- **WHEN** the viewer has loaded the first 12 people on Browse, and sodalove, who sits further down, bumps a post
- **THEN** sodalove is still listed at the place the feed opened with, once, and moves to the top only when the feed is opened again

#### Scenario: Leaves Mutual while scrolling
- **WHEN** under Any the viewer has loaded the first 12 people, and kaede.k, ranked lower in the Mutual section, stops being Mutual but still matches one way
- **THEN** kaede.k is still listed once, at the place the feed opened with

#### Scenario: Sold out before their place
- **WHEN** rin.trades is in the order the feed opened with, and sells the only objekt their posts held before the viewer reaches their place
- **THEN** rin.trades is not listed, and the page still fills with the people after them

#### Scenario: New poster waits for a reload
- **WHEN** mina.swaps puts a list on Trade after the viewer opened the feed
- **THEN** loading more does not list mina.swaps, and opening the feed again does

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Post type: All, WTT, WTB or WTS (`type`), in one Post type menu at the end of the facet row (see Matches and Compare with). All is the default.
- Artist (`artist`): a row of toggles, All then each artist in the app's artist picker selection, before the other filters. All clears it. More than one artist MAY be on. The row SHALL be hidden when the selection holds one artist.
- Member (`member`), season (`season`), class (`class`), online/offline (`on_offline`) and collection number (`collection`), with the same controls, filter sheet, active chips and Reset as the other collection pages, and the same parameter names and values. The online/offline filter and its chip SHALL be labelled Type, as on every other page, even beside the Post type menu.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- On For you only, Can swap (`match`) and Compare with (`list`), after the Post type menu on the same row (see Matches and Compare with). Under Any and Mutual, only posts holding at least one objekt that matches the viewer are kept: the objekts the rings mark (see Narrowing). Each post is judged on its own lists, not on the owner's other lists.

Below `md`, Browse and For you SHALL keep artist, member, season and class on the toolbar and fold collection number and Type into the filter sheet, as the other collection pages do. The sheet's button SHALL read Filters, followed by the number of active filters it holds when there are any; the sheet SHALL hold every collection filter.

The feed SHALL follow the artists selected in the app's artist picker, as Activity does. An `artist` value outside that selection SHALL be ignored. A `slug` link SHALL ignore the artist selection and the `artist` parameter, so a link from the objekt drawer lists every post holding that collection.

**Narrowing.** When a filter is active, each post SHALL show only the objekts related to it. An objekt is related when it passes every active filter:
- the collection filters (the artist selection, `artist`, `member`, `season`, `class`, `on_offline`, `collection`), when together they leave some collection out: its collection passes them;
- `slug`: its collection is that collection;
- Matches Any or Mutual: the objekt matches the viewer, as the rings mark it, against the lists Compare with names. On a have or sale side, its collection is on one of the viewer's compared want lists that can take it. On a want side, its collection is on one of the viewer's compared have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer.

While any of these is active:
- each side SHALL show only its related objekts;
- when the list shows no match count, its label SHALL read its role and the shown count, as "HAVE 4". When it shows one (see Trade card), the label SHALL read its role alone, so the strip carries one number;
- after its thumbnails and any "+N" tile, the side SHALL show "of N", N being the side's total, linking to its list;
- a side with no related objekt SHALL be shown as one muted line under the post's other strip, reading its role and total, then "none match" on Browse ("WANT 8 · none match") or, on For you, "none you have" on a want side and "none you want" on a have or sale side ("WANT 242 · none you have"). The line SHALL link to its list. It has no thumbnails, no "of N" and no ⇄ mark, and the other strip SHALL take the sides' full width;
- a post with no related objekt on any side SHALL not be listed;
- a person whose posts are all left out SHALL not be listed.

Posts SHALL be shown whole, with no "of N", when none of these is active: every artist selected, no other filter, no `slug`, and on Browse rather than For you. The Type filter SHALL not narrow sides.

The header sentence SHALL count the person across all of their listed lists, and each list's count SHALL count that whole list (see Matches to the signed-in viewer), whatever is shown and whatever filter is active. Rings SHALL mark matched objekts among those shown, so under Any or Mutual every shown objekt is ringed.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of people. The order is newest bump first on Browse, as Mutual order defines under Mutual, and as the Mutual and One way sections define under Any (see Matches and Compare with). The filters SHALL combine. When no post is listed:
- on For you with a collection filter or `slug` set, under Any or Mutual, it SHALL say that no posts match the filters and offer Reset, which keeps `match` and `list`;
- otherwise under Any, the feed SHALL say that no posts match the viewer's lists and offer to show all posts on Browse, keeping the filters;
- otherwise under Mutual, it SHALL say that no one can swap with the viewer and offer to switch to Any;
- under Any and Mutual, while Compare with names a list, the message SHALL name it ("No posts match spares", "No one can swap with you for spares");
- with other filters set, it SHALL offer Reset.

A filter value that does not parse SHALL be ignored.

#### Scenario: Filters on a phone
- **WHEN** the viewer opens `/trade?member=SeoYeon&on_offline=offline` at 390 px
- **THEN** Artist, Member, Season and Class show on the toolbar, Collection No. and Type do not, the Filters button reads "Filters 1", and the sheet it opens holds every collection filter

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
- **THEN** the row still reads "They have 3 you want", and only the SeoYeon objekt among the shown thumbnails is ringed

#### Scenario: Only matches narrows the post
- **WHEN** Matches is Any, and a WTT post's have list holds 27 objekts of which 3 are on the viewer's want lists, and its want list holds 14 of which 2 are on the viewer's bound have lists and still owned
- **THEN** the HAVE strip's label reads "HAVE" with the count "3 you want" and those 3 thumbnails, all ringed, and "of 27", and the WANT strip's reads "WANT" with "2 you have" and those 2, ringed, and "of 14"

#### Scenario: One-way match under Only matches
- **WHEN** Matches is Any, and a post has 2 objekts the viewer wants but wants nothing the viewer has
- **THEN** the post is listed, its have strip shows the 2 across the sides' width, and under it one muted line reads "WANT 8 · none you have", with no ⇄ mark

#### Scenario: Only matches judges each post
- **WHEN** Matches is Any, and rin.trades has a have list post holding nothing the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists
- **THEN** rin.trades's row holds only the want list post, and its sentence counts rin.trades across both lists

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
- **THEN** For you opens with Can swap off, a post whose have side holds SeoYeon 204Z stays, showing SeoYeon 204Z and not its other objekts, and a post that matches none of the viewer's lists is no longer listed

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
- **THEN** the feed says "No one can swap with you", with a control that switches to Any

#### Scenario: Nothing passes the filters
- **WHEN** the viewer, on Browse, filters to a season no post holds
- **THEN** the feed says no posts match the filters, with Reset

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?match=any`
- **THEN** there is no Matches control, the matches prompt stands in its place, and every post is listed

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list, and a sale list open to swaps, count against a want list open to swaps (Swaps only, or Swaps or buying); every sale list counts against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list, and a sale list open to swaps, count for a want list open to swaps; every sale list counts for a want list open to buying.
- The mutual score: what the person and the viewer can swap, the smaller of two swap counts. One is the collections on the person's have lists, and sale lists open to swaps, that are on one of the viewer's want lists open to swaps (Swaps only, or Swaps or buying); the other is the collections on the person's want lists open to swaps that are on one of the viewer's have lists, or sale lists open to swaps, bound to a Cosmo profile and still tradeable by the viewer. A sale list set to Sell only, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above: a sale is not a swap, so a person matched only through such lists is one way. A want list set to buying only never counts toward it either.

The counts show once, in the row's header sentence (see Trade card). Each list in the row SHALL also show its own count, by the same rules, taken on that list alone: on a have or sale list the collections the viewer wants ("14 you want"), on a want list the collections the viewer has ("2 you have"). Matched objekts SHALL be marked with a ring, judged on the list's own objekts. There SHALL be no match chip, no popover of matched lists and no All matches control.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a signed-in viewer SHALL see no line there, whether or not they have a list that can match.

Browse SHALL list the viewer's own row, so they can see where a bump put them, with no header sentence and no list counts or rings. For you SHALL never list it. People the viewer hid SHALL be left out of both (see `web-trade-for-you` Hide a partner).

**Person link.** `person=<user id>` on `/trade` or `/trade/for-you` SHALL list that person's row first, with every one of their kept posts shown, followed by the feed as usual without that person. A `person` the feed would not list (hidden, blocked, nothing listed, or no match on For you) SHALL be ignored. Activating the row's clear control, or going back, SHALL remove the parameter and leave the feed where it was. For a signed-out visitor, `person` SHALL lead Browse with that person's row without counts.

#### Scenario: Default
- **WHEN** a signed-in viewer with a want list opens `/trade` with no parameters
- **THEN** every person with a listed post is listed, with header sentences, list counts and rings, and no Matches or Compare with control shows

#### Scenario: Own post on Browse
- **WHEN** the viewer bumps and opens `/trade`
- **THEN** their row is listed at the top of Browse with no header sentence, and it is not listed on `/trade/for-you`

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a person's want list wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that list or in that person's sentence

#### Scenario: Counts sit on their list
- **WHEN** nuppotoz has want lists "S24 WISHLIST", holding nothing the viewer has, and "WISHLIST", holding 3 collections on the viewer's bound have lists
- **THEN** nuppotoz's row reads "You have 3 they want", the WISHLIST strip reads "3 you have" with those 3 ringed and listed first, and the S24 WISHLIST strip shows no count

#### Scenario: Which lists matched
- **WHEN** a person's want list asks for two collections that are on the viewer's have list "spares"
- **THEN** that want list's strip reads "2 you have" with both ringed, and no popover or control names the viewer's lists

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list holding 1 collection the viewer wants and a separate want list asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** rin.trades's one row reads "You can swap 1", the have list reads "1 you want" and the want list "2 you have"

#### Scenario: A sale list never makes a person mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You have 1 they want", the sale list reads "3 you want", and jinsoul.blue is listed under One way, not Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list, set to Sell only, holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count, so jinsoul.blue's row reads "You have 1 they want", the sale list shows no count, and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list, set to Sell only, holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
- **THEN** rin.trades is not Mutual through it, whatever that want list is open to; when it is open to buying, the collection counts in rin.trades's "You have N they want"

#### Scenario: A buying-only want list ignores have lists
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list, which is set to Buying only, and rin.trades has no sale list
- **THEN** rin.trades's row does not count them, rings none of those objekts, and rin.trades is not listed under Mutual

#### Scenario: Chips follow Compare with
- **WHEN** on For you, Compare with names have list "spares" linked to want list "binary hunt", and rin.trades has 2 collections on "binary hunt" and 1 on another of the viewer's want lists, and wants nothing of the viewer's
- **THEN** rin.trades's row reads "They have 2 you want", not 3

#### Scenario: Mutual partner
- **WHEN** the viewer opens `/trade?person=<rin.trades's id>` and rin.trades has 4 listed posts
- **THEN** rin.trades's row is listed first with all 4 posts shown and no "+N more lists", the rest of the feed follows without rin.trades, and clearing it removes `person` from the URL

#### Scenario: Person link to someone hidden
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** the feed lists as if `person` were absent

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the browser is at `/trade/for-you?match=mutual` and Can swap is on

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** rows are listed with no header sentence, no list counts and no rings, and a line beside the Post type menu invites them to sign in to see matches, linking to `/login?redirect=/trade/for-you`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** no line shows beside the Post type menu, and the For you tab is hidden

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's row is not listed on Browse or For you for that viewer

#### Scenario: A have list and a want list both ways make a swap
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps) asks for 3 collections on the viewer's bound have list, and rin.trades's sale list, set to Sell only, holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

#### Scenario: A sale list open to swaps makes a swap
- **WHEN** jinsoul.blue's sale list, open to swaps, holds 3 collections on the viewer's want list open to swaps only, and jinsoul.blue's want list (open to swaps) asks for 2 collections on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You can swap 2", the sale list reads "3 you want", and jinsoul.blue is listed under Mutual

### Requirement: Bump
A person with posts on Trade SHALL be able to bump once every 24 hours. A bump SHALL bump every one of their posts on Trade at once: it moves their row to the top of Browse and brings back every idle post. A bump within 24 hours of the person's last bump, counting a list turned on as a bump (see Order and idle posts) and lists since taken off Trade, SHALL be refused, and the control SHALL show when the next bump is allowed. Only the signed-in person SHALL be able to bump their own posts.

#### Scenario: Bump moves the row up
- **WHEN** the owner, last bumped 26 hours ago, bumps
- **THEN** other viewers see their row first on `/trade` on their next load, and the Bump control shows the next bump in 24 hours

#### Scenario: Bump brings back every idle post
- **WHEN** the owner has three posts, two of them idle, and bumps
- **THEN** all three posts are listed, each bumped just now

#### Scenario: Too soon
- **WHEN** the owner, last bumped 3 hours ago, tries to bump
- **THEN** the bump is refused and their row keeps its place

#### Scenario: Off and on again
- **WHEN** the owner turns Show on Trade off and back on for a list, having bumped 3 hours ago
- **THEN** the list keeps the bump time from 3 hours ago

#### Scenario: New list within a day of a bump
- **WHEN** the owner bumped 3 hours ago and turns Show on Trade on for want list "binary hunt"
- **THEN** the list takes the bump time from 3 hours ago, and the owner's row keeps its place

### Requirement: Your posts and Post a list
A signed-in viewer's posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, when the next bump is allowed while it is not, the one Bump control (see Bump), disabled until then, a New post control that opens the post composer, and a control that shows or hides the posts. The row SHALL show on Browse; For you and a signed-out visitor SHALL keep a New post control above the feed in its place. Shown, each entry SHALL be one post and show:
- its tags and kind (Swap, Sell or Buy);
- each list with its role: Offering for a have list, Looking for for a want list, Selling for a sale list, each linking to its list page;
- the option it carries: "Would also pay" on a Swap post that would, "Also on Market" on a Sell post;
- whether the post is listed or idle, and when it was last changed;
- a menu with Edit post and Take off Trade.

With no choice saved in this browser, the posts SHALL start shown when any of them is idle, and hidden otherwise. Showing or hiding them SHALL be remembered in this browser, and that choice SHALL win over the default. A viewer with no posts SHALL see the row say they have no posts on Trade, with New post. A signed-out visitor activating New post SHALL be sent to `/login?redirect=/trade`.

#### Scenario: New post on For you
- **WHEN** a signed-in viewer opens `/trade/for-you`
- **THEN** no Your posts row shows, and a New post control above the feed opens the composer

#### Scenario: Summary of six posts
- **WHEN** the viewer has six posts, one idle, and last bumped 2 days ago
- **THEN** the row reads Your posts with 5 listed and 1 idle, and its Bump control is enabled

#### Scenario: Bumped within the day
- **WHEN** the viewer has three posts and bumped an hour ago
- **THEN** the row reads Your posts with 3 listed and the next bump in 23 hours, and its Bump control is disabled

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
- **WHEN** the viewer activates New post and posts want list "binary hunt" as a Buy post
- **THEN** the list is on Trade and in matching, and appears under Your posts as bumped just now

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** it shows disabled in the composer New post opens, with the reason shown

#### Scenario: A Swap post entry
- **WHEN** the viewer's Swap post holds "spares" and "binary hunt" and would also pay
- **THEN** its entry shows WTT and WTB, Swap, Offering spares, Looking for binary hunt, and "Would also pay"

#### Scenario: Take down from the dialog
- **WHEN** the viewer chooses Take off Trade on a Sell post
- **THEN** the sale list leaves `/trade`, Market and For you

#### Scenario: No posts
- **WHEN** a signed-in viewer has no posts
- **THEN** the row says they have no posts on Trade and offers New post

### Requirement: Trade tabs
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar, marking the current one. It reads Browse, For you and My trades. For you SHALL be shown only to a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile); for anyone else the bar reads Browse and My trades. For a signed-out visitor, My trades SHALL lead to `/login?redirect=/trade/mine`. The Trade item in the primary navigation SHALL open Browse. A trade's own page, `/trade/mine/$tradeId`, SHALL show neither the Trade page title nor the tab bar; its breadcrumb leads back (see `web-verified-trades`, Trade page header).

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

#### Scenario: A trade's own page
- **WHEN** the user opens `/trade/mine/88`
- **THEN** no Trade page title or tab bar shows, and the page starts with its breadcrumb

### Requirement: Freshness
Show on Trade changes and bumps SHALL show on every viewer's next load of `/trade`. Changes to entries SHALL appear within 1 minute.

#### Scenario: Someone else posts
- **WHEN** another user turns Show on Trade on for a list
- **THEN** a viewer reloading `/trade` sees the post

#### Scenario: Entry added
- **WHEN** an owner adds an objekt to a list on Trade
- **THEN** viewers see it in the post within 1 minute

### Requirement: Message a post's owner
Each person's row not the viewer's own SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the person, adding a post card for the row's lead post (see Trade card), never an objekt card. When the viewer has matches with the person, as the row's header sentence shows, the post card SHALL carry the match; otherwise it SHALL carry none. A person who doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address and no matches with rin.trades activates Message on rin.trades's row, whose lead post is a WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a post card for that WTT post attached, and no objekt card

#### Scenario: From a post with matches
- **WHEN** a signed-in user whose row for mina reads "You can swap 2" activates Message on it
- **THEN** the conversation opens with a post card for mina's lead post, carrying the match, attached

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
Each row that shows Message SHALL also offer Make offer. It opens the offer builder for the person, addressed to the row's lead post's own list: the have list of a pair, or the post's only list. You get SHALL ask from all of the person's have and sale lists on Trade, as from a conversation, its picker opening on All their lists (see `web-trade-offers`).

The builder SHALL open empty: the row SHALL hand it no shortcuts and no prefill, and Add SHALL open the full picker.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's row, whose lead post is the have list "doubles" with the most matches, and rin.trades also has the sale list "spares" on Trade
- **THEN** the builder opens addressed to rin.trades, and You get's picker lists the entries of "doubles" and "spares"

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a row whose only post is a WTB post wanting HaSeul 302Z, and holds a copy of it
- **THEN** the builder opens with nothing under You give or You get, You give's picker lists the copy, and You get's picker asks from the person's have and sale lists, or their collection when they have none

### Requirement: Owner reputation on posts
Each post SHALL show its owner's reputation line (see `web-verified-trades`) beside the owner's name.

#### Scenario: Post byline
- **WHEN** a viewer sees nakyoung.cards's post
- **THEN** the byline shows nakyoung.cards's verified count and positive share

### Requirement: Trade card
Each person in the feed SHALL be one row, a bordered card on the card surface, one row to a line at every width. A row holds:
- **Header**:
  - the avatar;
  - the name, headed as For you heads a partner (see `web-trade-for-you` Partner identity), linking to the profile, with the Discord and X badges the person chose to show, wrapping onto the next line when they don't fit. On Browse, the viewer's own row SHALL carry a muted "You" tag after the name;
  - the reputation line (see `web-verified-trades`), on one line, truncated with an ellipsis when it doesn't fit, its full text available to assistive technology;
  - for a signed-in viewer on another person's row, the header sentence, from the counts in Matches to the signed-in viewer, with A the "They have" count, B the "You have" count and M the mutual score. Beside the name, a chip: "You can swap M", tinted, when M is above zero, else a muted "No swap · buy or sell" when A and B are both above zero; a one-way row has no chip. Under the reputation line, a muted line with "They have A you want" when A is above zero and "You have B they want" when B is above zero. With no count above zero the row SHALL show neither, so a row without them reads as no match. Each number SHALL be in monospace and stand out from the words, and the visible words SHALL be the accessible text;
  - on the reputation line, after it, muted: the number of the person's kept lists ("3 lists") and when their newest post was last bumped, or last changed if that is later;
  - the ⋯ menu, holding Hide, Block and Report for a signed-in viewer who is not the person.
- **Actions**: Message, then Make offer as the primary button, both for the row's lead post (see Message a post's owner and Make offer on a post). An account that doesn't take messages from the viewer shows "Not taking messages" in their place. The viewer's own row has no actions.
- **Posts**, under the header: each of the person's kept posts, in this order: posts with a list count above zero first, most matched collections first; then the rest, newest bump first. The first post in this order is the row's lead post. Each post shows:
  - its tag, and on a want-only WTT post the muted note "Swaps only, not buying", and on a buying-only post the buying-only note (see Buying only note);
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the width;
  - a side with no related objekt or no entries: the muted line Filters describes, under the other strip, with no ⇄ mark.
- **More lists**: the row SHALL show its first 2 posts. When it holds more, a "+N more lists" control SHALL follow them and show the rest in place, after which it is gone. A row led by `person` shows every post.

**Strip**: a monospace role label in its list type's colour, then " · " and the list's name, truncated to one line, then the list's own count when above zero ("14 you want", "2 you have"), on a tinted chip in monospace; under a narrowing filter the label reads as Filters says. The label SHALL link to the list page, carrying the list's name and description in its title, and the description SHALL also be available to assistive technology. The count SHALL sit beside the link, not in it, and activating it SHALL open a popover, "Matched with your lists", naming each of the viewer's lists that count was taken against, with its type and a link to it: on a want list the viewer's have and sale lists, on a have or sale list the viewer's want lists, as Compare with narrows them. Under a want list, it SHALL also name each rule the match went through, "via rule" with the rule's label and how many collections, on Browse as on For you (see Matched through your rules). Under it, one line of thumbnails 2.5rem wide with no caption, ringed objekts first. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting the copies not shown. On a narrowed strip that shows its count chip, which counts collections, the "+N" tile SHALL count the collections not shown instead, and "of N" the list's collections, as its dialog's All tab does, so they all read in one unit.

**All of a list.** Activating a strip's "+N" tile SHALL open a dialog of that one list, never of the person's other posts: a bottom sheet below `sm`, a centred dialog from `sm` up. Its title is the list's name and its description the list's type. It SHALL list the list's objekts, copies of a collection stacked into one card with their count, those that match the viewer ringed as the strip rings them and first, then newest; a rule's objekts stay on its tile. When any match, two tabs SHALL lead it, "N you want" (on a want list "N you have") and "All N", counting collections, with the matching tab open first; otherwise it shows the list alone. Past 300 collections the rest are counted, "N more on the list page". The rings follow For you's Compare with, the owner's own list rings nothing, and a signed-out visitor sees no rings or tabs. A want side's rules SHALL lead the dialog as the strip's RULE tiles, since its objekt counts leave them out. When the feed's filters or matching narrowed the strip, the dialog SHALL still show the whole list of objekts and say that those aren't filtered; the RULE tiles keep the strip's counts. The objekts SHALL load only when the dialog opens. Activating an objekt SHALL close the dialog and open the objekt view. The footer SHALL offer Open list, which goes to the list page, and Close.

From `@3xl` of the feed's width, the actions SHALL sit at the header's end and the posts SHALL be indented to start under the name. Narrower, the row SHALL stack: the header, each strip at full width with the ⇄ mark turned to point down, "+N more lists", then the actions in one row, Make offer filling the remaining width. The strips SHALL still not wrap, and the page SHALL not scroll sideways. Every row SHALL have the same layout whatever the number of objekts.

#### Scenario: Person with several posts
- **WHEN** nuppotoz has three listed want posts, "WISHLIST" with 3 collections the viewer has, "S24 WISHLIST" and "Atom01 leftovers" with none, at 1280 px
- **THEN** one row shows nuppotoz's header reading "You have 3 they want" and "3 lists", then the WISHLIST strip reading "3 you have", then S24 WISHLIST, then "+1 more list"

#### Scenario: More lists
- **WHEN** the viewer activates "+1 more list" on nuppotoz's row
- **THEN** the Atom01 leftovers strip shows in place under the others, and the control is gone

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's row on Browse and on For you, and rin.trades has 4 collections the viewer wants and wants 2 of the viewer's
- **THEN** both rows show the name, reputation line and ⋯ in the same order and read "You can swap 2"

#### Scenario: Chip without a mutual score
- **WHEN** a person has 3 collections the viewer wants and wants none of the viewer's
- **THEN** their row reads "They have 3 you want", and a screen reader announces the same words

#### Scenario: Chip for the other way
- **WHEN** a person wants 1 collection on the viewer's bound have lists and has nothing the viewer wants
- **THEN** their row reads "You have 1 they want"

#### Scenario: No match
- **WHEN** a signed-in viewer sees mira's row, whose lists match nothing of the viewer's
- **THEN** the header shows no match sentence, only the list count and time, and no strip shows a count

#### Scenario: Want-only WTT post
- **WHEN** a want list on its own is open to swaps only and on Trade
- **THEN** its post in the person's row shows the WTT tag with "Swaps only, not buying" beside it, and one WANT strip

#### Scenario: Pair has no note
- **WHEN** a WTT post holds a have list and its linked want list
- **THEN** its tag shows with no "Swaps only" note

#### Scenario: Hide from a post
- **WHEN** a signed-in viewer opens the ⋯ menu on rin.trades's row
- **THEN** it offers Hide, Block and Report

#### Scenario: Desktop grid
- **WHEN** the viewer opens `/trade` at 1280 px with 10 people loaded
- **THEN** the people sit in 10 rows, one each, and the feed keeps loading more as it scrolls

#### Scenario: Pair side by side
- **WHEN** a person's WTT post holds a have list and its linked want list, at 1280 px
- **THEN** the HAVE strip and the WANT strip sit side by side with ⇄ between them, their labels on one line, under the header

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 27 objekts and its HAVE strip has room for 6 thumbnails
- **THEN** the strip shows 5 thumbnails and a "+22" tile on one line

#### Scenario: Ringed first
- **WHEN** a have list's first entries match nothing, and its 10th and 12th entries are on the viewer's want lists
- **THEN** its strip shows those 2 ringed thumbnails first, then the rest

#### Scenario: Short side
- **WHEN** a post's want side holds 2 objekts
- **THEN** its WANT strip shows both thumbnails and no "+N" tile, and the strip is as tall as a full one

#### Scenario: Resize
- **WHEN** the viewer widens the window so a strip has room for 3 more thumbnails
- **THEN** the strip shows 3 more and the "+N" count drops by 3

#### Scenario: Which of my lists matched
- **WHEN** a person's HAVE strip reads "2 you want", matched through the viewer's want lists "binary hunt" and "store hunt"
- **THEN** activating "2 you want" opens a popover titled "Matched with your lists" naming both, each tagged Want and linking to its list

#### Scenario: See all of a list
- **WHEN** at 390 px a person's HAVE strip holds 24 collections, 14 of them on the viewer's want lists, and shows 4 thumbnails then "+20"
- **THEN** activating "+20" opens a bottom sheet titled with that list's name, with tabs "14 you want", open first and all 14 ringed, and "All 24"

#### Scenario: Nothing matches
- **WHEN** the viewer opens a strip's "+N" on a list none of whose objekts match them
- **THEN** the dialog shows the list's objekts with no tabs and no rings

#### Scenario: WTS post
- **WHEN** a person's WTS post's sale list holds 19 objekts
- **THEN** one SALE strip runs across the width, its thumbnails showing only their art, with no price caption

#### Scenario: Phone width
- **WHEN** Browse is shown at 390 px
- **THEN** each row stacks its header, its strips at full width with ⇄ pointing down between a pair, "+N more lists" when there are more, and the actions with Make offer filling the row, each strip stays one line ending in "+N", and the page doesn't scroll sideways

#### Scenario: New account on a phone
- **WHEN** at 390 px a person has no completed and no unfinished trades
- **THEN** their reputation shows as a small muted "New" tag, with nothing cut off

#### Scenario: Established account on a phone
- **WHEN** at 390 px a person has 5 verified trades, 50% positive, since March 2025
- **THEN** their row's reputation reads "5 verified · 50%", without "since Mar 2025", and their profile still shows it

#### Scenario: Long line wraps on a phone
- **WHEN** at 390 px a person's header sentence and reputation don't fit one line
- **THEN** each wraps onto further lines between words, and nothing is cut off

#### Scenario: Own post on Browse
- **WHEN** the viewer's have list "spares" is on Trade and they open `/trade`
- **THEN** their row shows "You" after their name, no header sentence, and no Message or Make offer

#### Scenario: One list
- **WHEN** a person's only post is a WTS post holding sale list "duplicates"
- **THEN** its SALE label reads "SALE · duplicates", links to the "duplicates" list page, and the header reads "1 list"

#### Scenario: Two lists
- **WHEN** a WTT post holds have list "spares" and want list "binary hunt"
- **THEN** its HAVE label names and links to "spares", its WANT label names and links to "binary hunt", and the header counts them as one list

#### Scenario: Twitter in the sheet
- **WHEN** rin.trades shows both Discord and Twitter
- **THEN** their row's header shows both badges after the name, as their profile does

#### Scenario: One-way post on For you
- **WHEN** on For you a person has 3 collections the viewer wants on have list "spares" and wants none of the viewer's
- **THEN** the row reads "They have 3 you want", and the spares strip reads "3 you want" with those 3 ringed

#### Scenario: Mutual post on For you
- **WHEN** on For you a person has a mutual score of 2 with the viewer
- **THEN** the chip beside the name reads "You can swap 2" on an indigo tint

### Requirement: Trade colours
Trade rows on Browse and For you SHALL colour their type marks (see `web-lists` List type colours):
- post tags, list badges and strip role labels take their list type's colour;
- the "You can swap N" chip is an indigo tint, and the numbers of the counts under the name stay neutral;
- a list's count chip is neutral text on a tint of the success colour.

Rows, buttons, avatars and backgrounds SHALL stay neutral.

#### Scenario: A WTS post
- **WHEN** the viewer sees a person whose only post is a WTS post holding 3 collections on the viewer's want lists, and who wants none of the viewer's
- **THEN** the WTS tag and SALE label are rose, the header reads "They have 3 you want" with a neutral number and no chip, and the SALE strip's chip reads "3 you want"

#### Scenario: Mutual partner
- **WHEN** rin.trades's row reads "You can swap 2", with 14 collections on have list "spares" and 2 the viewer has on want list "binary hunt"
- **THEN** the "You can swap 2" chip is indigo, the HAVE label is teal and the WANT label amber, and the chips read "14 you want" and "2 you have"

### Requirement: Matches and Compare with
For you (`/trade/for-you`) SHALL list the same people as Browse, in the same rows and with the same Post type menu and facets, narrowed by matching. It SHALL carry a toggle button labelled Can swap, pressed or not (see Layout for where it sits). Not pressed is Any, the default; pressed is Mutual, which the viewer sees named Can swap, never Mutual; the URL keeps `match=mutual`:
- **Any**: only posts holding at least one objekt that matches the viewer are kept, judged on each post's own lists (see Filters), and only people with a kept post are listed, in two sections (see Any order).
- **Mutual**: only people whose mutual score is above zero, as the person's header sentence computes it (see Matches to the signed-in viewer). Of those people's posts, only those holding a match are kept, as under Any.

**Who sees it.** For you SHALL require a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile):
- a signed-out visitor opening it SHALL be sent to `/login`, and back to the same For you address after signing in;
- a signed-in viewer without such a list SHALL be sent to `/trade`, keeping the filters and `person`, and dropping `match` and `list`.

**Post type menu.** On Browse and For you, the post type SHALL be one menu labelled Post type, offering All, WTT, WTB and WTS, with each tag spelled out ("WTT · Want to trade"). It replaces the Type tabs, so the controls beside it never move. Mutual is a swap between two people, and a WTB or WTS post is one-way money, so Mutual SHALL list WTT posts only: the menu SHALL read WTT with every other option disabled, a `type` in the URL or in a request SHALL be ignored, by the server as well as the page, and turning Can swap on SHALL drop it from the URL. Who counts as Mutual is unchanged (see Matches to the signed-in viewer).

**Default and URL.** The option SHALL live in the URL as `match`, with the values `any` and `mutual`. With no `match`, or a value that does not parse, Any SHALL apply. Browse's `type`, `slug`, facet and `person` parameters SHALL carry the same meaning on For you.

**Mutual order.** Under Mutual the feed SHALL list people best match first:
1. the mutual score;
2. then the sum of both counts;
3. then the most recent change to any of the person's matched lists.

Each person SHALL be one row holding their kept posts (see Trade card). Every Mutual person SHALL be listed, with no cap beyond the 1000 candidates matching reads, and idle posts SHALL not be listed (see Order and idle posts). The feed SHALL load 12 people at a time and continue after the last person it showed. When the ranking is worked out again between two loads, a person already shown SHALL not be listed again, and a person who only moved within the ranking since SHALL still be listed, at the place earlier loads saw them. A person who leaves Mutual between two loads MAY go unlisted until the feed is opened again.

**Any order.** Under Any the feed SHALL list two sections, in this order:
1. **Mutual**: exactly the people Mutual lists for the same filters and Compare with choice, in Mutual order. Each row SHALL hold all of the person's kept posts, in the Trade card's order. A person Mutual ranks who has no kept WTT post SHALL be listed under One way instead. With WTB or WTS picked in the Post type menu there is no Mutual section, since Mutual lists WTT posts only.
2. **One way**: every other person Any keeps. People SHALL be listed most matches first, by the sum of both counts and then the most recent change to any of their matched lists, among the people matching ranks (at most its 1000 candidates). After them comes anyone else Any keeps, by their newest bump. A person SHALL be listed in one section only.

Each section SHALL open with a heading, Can swap (for Mutual) or One way, with no count, over its first row. A section with no people SHALL have no heading. Under Can swap there SHALL be no section heading. The feed SHALL load 12 people at a time across the sections, continuing after the last person it showed, and SHALL not list a person twice when the ranking is worked out again between two loads. The empty states of Filters are unchanged.

**Description.** Under the tabs, For you's description SHALL read "People who match your lists, best match first." Below `md`, neither tab SHALL show its description.

**Mutual N.** The Can swap button SHALL read "Can swap N", pressed or not, N being how many people Mutual lists for the current Compare with choice: people with at least one matching WTT post, with no artist or collection filter applied, so N stays put while the viewer filters. A one-way list, which Mutual can't use, counts as All my lists:
- a count of zero SHALL show the label with no number;
- a count above 99 SHALL read "99+";
- N SHALL be in monospace, and the accessible name SHALL include it;
- N MAY be up to 5 minutes behind the people Mutual lists.

**Compare with.** For you SHALL always show a Compare with control. It offers All my lists and each of the viewer's have, sale and want lists that take part in Trade, each option tagged with its list type. A linked pair SHALL be one option naming both, its have or sale list first ("spares ⇄ binary hunt"), since naming either half compares the two; it stands for the pair whichever half `list` names, and picking it names the have or sale list. It SHALL live in the URL as `list`, a list slug.
- A named list SHALL compare together with its linked list, both ways.
- A list with no link (a sale list, or a have or want list whose linked list doesn't take part) SHALL compare one way. It SHALL be offered under Any and disabled under Mutual, and switching to Mutual while it is selected SHALL reset Compare with to All my lists.
- A disabled option SHALL carry the short muted reason "Compares one way".
- The Post type SHALL never disable a list, and the Post type menu SHALL never disable an option because of the picked list. Every Post type holds posts that any of the viewer's lists can match: a Sell post open to swaps (tagged WTS and WTT) rings every want list on its sale side, Buying only included, and its want side matches the viewer's have lists; a Sell or Swap post that would also pay (tagged WTB) matches the viewer's sale lists. Mutual alone disables, and it fixes the type to WTT.
- Changing the Post type SHALL keep Compare with. Turning on Mutual with a one-way list selected SHALL reset it to All my lists.
- A `list` that is not one of the viewer's lists that take part, or that Mutual can't use, SHALL read as All my lists: in the menu, the compared-lists line and the feed request, which SHALL not send it. The URL is left as it is until the next change.
- The compared lists SHALL replace the viewer's lists everywhere matching shows on For you: the header sentences, the list counts, the rings, Any and Mutual.
- While Compare with names a list, one line under the controls SHALL say what is compared: the named list with its linked list, or the named list alone and which way it compares. With All my lists, no line SHALL show.

The help beside the controls SHALL describe the mutual score as what the two people can swap, the smaller of the two swap counts, with sale lists never counting toward it, and describe Compare with as one list plus its linked list, a list with no link comparing one way.

**Old Browse links.** `/trade` SHALL no longer take `match` or `list`:
- `/trade?match=any`, `/trade?match=mutual` or `/trade?matches=1` SHALL redirect to `/trade/for-you` with the same option (`matches=1` becomes `match=any`), keeping `list`, `person` and the filters;
- `/trade?match=off` SHALL drop `match` and `list` and stay on Browse;
- on a viewer who can't use For you, the redirected address then sends them on as Who sees it says.

**Layout.** On every width, Compare with, the Can swap button and the help SHALL follow the Post type menu in that order; from `md` up they sit on the facet row after a divider. Below `md`, the Filters button, Reset, the Post type menu, Compare with, the Can swap button and the help SHALL sit in that order in one row that wraps onto further lines when it doesn't fit, so the page doesn't scroll sideways. The DOM order SHALL match the visual order, so keyboard order follows it. The compared-lists line SHALL sit under the row. There SHALL be no separate Matching button or sheet. A change SHALL apply at once.

#### Scenario: Default is Any
- **WHEN** a signed-in viewer with want list "binary hunt" opens `/trade/for-you` with no parameters
- **THEN** Can swap is off, Compare with reads All my lists with no compared-lists line under it, and only posts holding an objekt that matches the viewer's lists are listed, narrowed and ringed

#### Scenario: Turn matching off
- **WHEN** the viewer on For you wants every post
- **THEN** For you offers only the Can swap button, and the viewer activates the Browse tab instead

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
- **WHEN** the viewer turns on Can swap, and rin.trades has a mutual score of 3 with two posts and kaede.k has a mutual score of 1 with one post bumped more recently than either
- **THEN** the URL carries `match=mutual`, rin.trades's row is listed first holding both posts, and kaede.k's row follows

#### Scenario: Sale-only person under Mutual
- **WHEN** jinsoul.blue matches the viewer both ways only through sale lists, against want lists open to swaps or buying
- **THEN** jinsoul.blue is listed under Any in the One way section, is not listed under Can swap, and is not counted in Mutual N

#### Scenario: Sale-only person against a swaps-only want list
- **WHEN** jinsoul.blue's only match in one direction is a sale list against a want list open to swaps only
- **THEN** that direction counts 0, and jinsoul.blue's posts are listed under Any if they match the other way, and not under Mutual

#### Scenario: Type under Mutual
- **WHEN** under Any the viewer picks WTS in the Post type menu and then turns on Can swap
- **THEN** the menu reads WTT with All, WTB and WTS disabled, the URL no longer carries `type`, only WTT posts are listed, and the button stays where it was

#### Scenario: More under Mutual
- **WHEN** 20 people are mutual with the viewer and the viewer scrolls past the first 12 rows
- **THEN** the feed loads the remaining 8 in the same order, without repeating a person

#### Scenario: Compare one pair
- **WHEN** under Mutual the viewer picks "spares ⇄ binary hunt", have list "spares" linked to want list "binary hunt"
- **THEN** the URL carries `list=spares`, the line reads "What you have: spares. What you want: binary hunt.", header sentences, list counts and rings count only those two lists, and the button counts the mutual people for them

#### Scenario: A link naming the want half
- **WHEN** a want-list alert opens `/trade/for-you?match=any&list=binary-hunt`, and "binary hunt" is linked to have list "spares"
- **THEN** Compare with reads "spares ⇄ binary hunt", and both lists are compared

#### Scenario: Lone list under Mutual
- **WHEN** under Any the viewer picks sale list "duplicates" and then turns on Can swap
- **THEN** Compare with resets to All my lists, and "duplicates" is offered disabled

#### Scenario: Post type disables no list
- **WHEN** on For you the viewer picks Post type WTS, and has a lone have list, a sale list, a lone Buying only want list and a have and want pair
- **THEN** Compare with offers all of them enabled, with no reason beside any

#### Scenario: Switching Post type keeps the list
- **WHEN** under Any the viewer has picked a lone want list "bulk buys" set to Buying only and then picks Post type WTB
- **THEN** Compare with still reads "bulk buys" and the URL keeps `list=bulk-buys`

#### Scenario: Old link with a list Mutual can't use
- **WHEN** the viewer opens `/trade/for-you?match=mutual&list=binary-hunt` and "binary-hunt" is a lone want list
- **THEN** Compare with reads All my lists, no compared-lists line shows, and the feed is requested without that list

#### Scenario: Mutual count ignores Post type
- **WHEN** the viewer has picked WTB and a have list
- **THEN** the Can swap count is the one for that list, as under All

#### Scenario: Mutual only switch last
- **WHEN** the viewer opens For you at 1280 px
- **THEN** the Can swap button sits right after Compare with and before the help, with the divider between Post type and Compare with

#### Scenario: Mutual count
- **WHEN** 4 people match the viewer mutually with all lists compared
- **THEN** the button reads "Can swap 4", the tab reads "For you", and a screen reader announces the count

#### Scenario: Mutual count ignores filters
- **WHEN** the button reads "Can swap 4", Can swap is pressed, and the viewer filters to member SeoYeon, which only 1 of those people's matching posts holds
- **THEN** the button still reads "Can swap 4", and the feed lists that 1 person

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
- **THEN** the Filters button, Reset, the Post type menu, Compare with naming spares, the Can swap button (pressed) and the help wrap across the row's lines, no collection filter shows on the row, the compared-lists line sits under it, and the page doesn't scroll sideways

#### Scenario: Two sections under Any
- **WHEN** the viewer opens `/trade/for-you`, rin.trades is mutual with one WTT post and one WTS post, and sodalove matches them one way
- **THEN** the feed opens with the heading Mutual over rin.trades's row, holding both posts in the Trade card's order, then the heading One way over sodalove's row

#### Scenario: Mutual only through a sale list
- **WHEN** under Any, jinsoul.blue is mutual with the viewer only through a sale list and a want list, and has no WTT post
- **THEN** jinsoul.blue's row is listed under One way, not Mutual

#### Scenario: Most matches first
- **WHEN** under Any, sodalove's one-way counts add up to 7 and hyhedgehog's to 1, and hyhedgehog bumped more recently
- **THEN** sodalove's row is listed above hyhedgehog's in One way

#### Scenario: Past the ranked people
- **WHEN** under Any, more people match the viewer than matching ranks, and the viewer scrolls past every ranked person
- **THEN** the feed goes on with the other matching people, newest bump first, without repeating a person

#### Scenario: Nobody mutual under Any
- **WHEN** under Any no one matches the viewer both ways, and some posts match one way
- **THEN** the feed shows no Can swap heading and opens with the One way heading

#### Scenario: Headings under Mutual only
- **WHEN** the viewer turns on Can swap
- **THEN** the feed lists the Mutual people with no section heading

### Requirement: Post composer
New post SHALL open a composer in two steps. First the viewer picks what the post is for: Swap (WTT), Sell (WTS) or Buy (WTB). Then they pick its lists:
- Swap: a have list, a want list, or both, and "I'd also pay for what I'm looking for", available only with a want list;
- Sell: one sale list, and "Also open to swaps"; with it ticked, optionally one want list for what the viewer would swap for, and "I'd also pay for what I'm looking for", available only with a want list;
- Buy: one want list.

Post SHALL stay disabled until the kind's lists are picked. Before posting, the composer SHALL show the tags the post will carry and who it matches.

#### Scenario: Swap with both lists
- **WHEN** the viewer picks Swap, have list "spares" and want list "binary hunt", leaves "also pay" off and posts
- **THEN** one WTT post holds both lists, "spares" is linked to "binary hunt", "binary hunt" is open to swaps only, and both are on Trade

#### Scenario: Swap that would also pay
- **WHEN** the viewer picks Swap, want list "binary hunt" and ticks "also pay"
- **THEN** the composer shows WTT and WTB, says sellers with what they look for match them too, and posting saves "binary hunt" open to swaps or buying

#### Scenario: Also pay needs a want list
- **WHEN** the viewer picks Swap and only have list "spares"
- **THEN** "also pay" is disabled and says to pick a want list first

#### Scenario: Buy post
- **WHEN** the viewer picks Buy and want list "store hunt" and posts
- **THEN** "store hunt" is on Trade set to Buying only, and its post is tagged WTB

#### Scenario: Sell post
- **WHEN** the viewer picks Sell and sale list "binary sale" and posts
- **THEN** "binary sale" is on Trade and on Market, tagged WTS

#### Scenario: Nothing picked
- **WHEN** the viewer picks Swap and no list
- **THEN** Post is disabled

#### Scenario: Signed out
- **WHEN** a signed-out visitor activates New post
- **THEN** the browser is at `/login?redirect=/trade`

#### Scenario: Sell, open to swaps
- **WHEN** the viewer picks Sell, sale list "binary sale", ticks "Also open to swaps" and posts
- **THEN** the composer showed WTS and WTT before posting, and "binary sale" is on Trade and on Market, open to swaps

#### Scenario: Sell with a want list
- **WHEN** the viewer also picks want list "binary hunt" and posts
- **THEN** one post holds both lists, "binary sale" is linked to "binary hunt", and "binary hunt" is open to swaps only

#### Scenario: A want list needs swaps
- **WHEN** the viewer picks Sell with "Also open to swaps" off
- **THEN** no want list can be picked, and the composer says to tick "Also open to swaps" first

#### Scenario: Back to Sell only
- **WHEN** the viewer edits that post and unticks "Also open to swaps"
- **THEN** the composer asks to unpair "binary hunt" first, and after posting "binary sale" is Sell only and unlinked

#### Scenario: Sell with a want list that would also pay
- **WHEN** the viewer picks Sell, sale list "binary sale", ticks "Also open to swaps", picks want list "binary hunt" and ticks "also pay"
- **THEN** the composer shows WTS, WTT and WTB, and posting saves "binary hunt" open to swaps or buying, linked to "binary sale"

#### Scenario: Also pay on Sell needs a want list
- **WHEN** the viewer picks Sell, ticks "Also open to swaps" and picks no want list
- **THEN** "also pay" is disabled and says to pick a want list first

#### Scenario: Removing the want list clears also pay
- **WHEN** the viewer had ticked "also pay" on Sell, then unticks "Also open to swaps" or removes the want list
- **THEN** "also pay" is off, and the composer shows the tags without WTB

### Requirement: Composer list rules
A list SHALL be in one post at a time: in the composer, a list already in another post on Trade SHALL show disabled, naming that post, and a have or sale list not bound to a Cosmo profile SHALL show disabled with the reason. Posting SHALL count as a bump of each list it puts on Trade (see Bump).

#### Scenario: List in another post
- **WHEN** want list "store hunt" is in the viewer's Buy post and they start a Swap post
- **THEN** "store hunt" shows disabled with "In your Buy post"

#### Scenario: Unbound have list
- **WHEN** the viewer's have list is not filed under a Cosmo profile
- **THEN** it shows disabled in the composer with the reason shown

### Requirement: Unpair in the composer
Picking a list that is paired with another list, for a post that would not keep the pair, SHALL ask the viewer to unpair them before it can be posted: they can unpair and use it, or pick another list. Picking one half of a pair for a Swap post SHALL pick the other half too.

#### Scenario: Paired list for a Buy post
- **WHEN** want list "binary hunt" is paired with have list "spares", off Trade, and the viewer picks it for a Buy post
- **THEN** the composer says the two are paired for swaps and a Buy post doesn't swap, and Post stays disabled until the viewer unpairs them or picks another list

#### Scenario: Unpair and use it
- **WHEN** the viewer chooses Unpair and use it, then posts
- **THEN** "spares" is no longer linked to "binary hunt", and "binary hunt" is on Trade set to Buying only

#### Scenario: Paired list for a Swap post
- **WHEN** the viewer picks Swap and want list "binary hunt", which is paired with have list "spares"
- **THEN** "spares" is picked as well, with no prompt

### Requirement: Edit and take off a post
Edit post SHALL open the composer on the post's kind and lists. Saving SHALL apply the new choice; a list taken out of the post SHALL leave Trade, and a have list taken out of a Swap post SHALL be unlinked from its want list. Take off Trade SHALL take every list of the post off Trade and off matching, and off Market for a sale list, keeping a Swap post's link, so posting it again brings the same pair back. Deleting one list of a pair SHALL leave a one-list Swap post.

#### Scenario: Take a Swap post off Trade
- **WHEN** the viewer takes the Swap post holding "spares" and "binary hunt" off Trade
- **THEN** both lists leave `/trade` and For you, and they stay paired

#### Scenario: Post it again
- **WHEN** the viewer later activates Post it on "binary hunt"
- **THEN** the composer opens on Swap with "spares" and "binary hunt" picked

#### Scenario: Drop the have list in Edit post
- **WHEN** the viewer edits the Swap post, unpicks "spares" and saves
- **THEN** "spares" leaves Trade and is no longer linked, and the post holds only "binary hunt"

#### Scenario: Delete half a pair
- **WHEN** the viewer deletes have list "spares", which is in a Swap post with "binary hunt"
- **THEN** the post stays on Trade as a Swap post holding only "binary hunt"

### Requirement: Tag help
The matching help (the ? beside Mutual only) SHALL be tables only, with no bulleted sentences, in four sections: Post tags, What matches your want list, What counts toward Mutual, and Good to know. A yes or no cell SHALL show a mark, with its word for screen readers.

#### Scenario: Post tags
- **WHEN** the viewer opens the matching help
- **THEN** the tag table describes WTT as a Swap post, WTB as a Buy post or a Swap or Sell post that would also pay, and WTS as a Sell post, each with what it matches, and notes that a Swap post that would also pay carries WTT and WTB

#### Scenario: Open to grid
- **WHEN** the viewer reads What matches your want list
- **THEN** their have list is marked for Swaps only and Swaps or buying and not for Buying only, their sale list for Swaps or buying and Buying only and not for Swaps only, their sale list open to swaps for all three, and a note says it works the same the other way

#### Scenario: Mutual table
- **WHEN** the viewer reads What counts toward Mutual
- **THEN** a have list against a want list open to swaps is marked yes, a sale list open to swaps against a want list open to swaps is marked yes, a sale list set to Sell only on either side and a want list set to Buying only are marked no, and a note says the score is the smaller of the two sides

#### Scenario: Good to know
- **WHEN** the viewer reads Good to know
- **THEN** labelled rows say that all of a person's lists count together, what Compare with narrows to, that only objekts still owned and transferable count, that hidden and blocked people never show, and that a want list's rule counts like the objekts it covers, once per collection, and shows on a post as one RULE tile with how many of the viewer's it takes, and no bulleted sentences follow

### Requirement: Rules on a post
A post whose want list holds rules SHALL show each rule in its Want strip as one tile, before the objekts: a card with a neutral RULE badge, its label ("CC366", "Cream02 FCO 3rd") and "any member" or its members. Activating a tile SHALL list the rule's objekts the viewer has.

#### Scenario: Rule tile
- **WHEN** jinsoul.blue's WTT post wants the rule CC366, any member, and the viewer's bound have list holds Lynn CC366 and Nien CC366
- **THEN** the Want strip starts with one CC366 tile reading "any member" and "2 you have", ringed, and no card per member

### Requirement: Rule counts on a post
For a signed-in viewer, each rule tile SHALL read "N you have", N being the rule's objekts on the viewer's bound have lists, still owned, by the rules of Matches to the signed-in viewer, and SHALL carry the match ring when N is above zero. A rule's objekts SHALL count in the person's header sentence, the list's count and Can swap like objekts added by hand.

#### Scenario: Counted like objekts
- **WHEN** that post's want list also holds the 3rd edition rule, of which the viewer has 2, and Kotone CC302, which the viewer has, and jinsoul.blue has 4 the viewer wants
- **THEN** the row reads "You can swap 4 · They have 4 you want · You have 5 they want"

#### Scenario: Signed out
- **WHEN** a visitor without a session sees the post
- **THEN** the rule tiles show their labels with no count and no ring
