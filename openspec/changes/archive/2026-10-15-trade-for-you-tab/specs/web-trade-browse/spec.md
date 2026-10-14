## MODIFIED Requirements

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Post type: All, WTT, WTB or WTS (`type`), in one Post type menu (see Matches and Compare with). All is the default.
- Artist (`artist`): a row of toggles, All then each artist in the app's artist picker selection, before the other filters. All clears it. More than one artist MAY be on. The row SHALL be hidden when the selection holds one artist.
- Member (`member`), season (`season`), class (`class`), online/offline (`on_offline`) and collection number (`collection`), with the same controls, filter sheet, active chips and Reset as the other collection pages, and the same parameter names and values. Because the Post type menu sits beside them, the online/offline filter and its chip SHALL be labelled Format on Browse, not Type.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- On For you only, Mutual only (`match`) and Compare with (`list`), beside the Post type menu (see Matches and Compare with). Under Any and Mutual, only posts holding at least one objekt that matches the viewer are kept: the objekts the rings mark (see Narrowing). Each post is judged on its own lists, not on the owner's other lists.

The feed SHALL follow the artists selected in the app's artist picker, as Activity does. An `artist` value outside that selection SHALL be ignored. A `slug` link SHALL ignore the artist selection and the `artist` parameter, so a link from the objekt drawer lists every post holding that collection.

**Narrowing.** When a filter is active, each post SHALL show only the objekts related to it. An objekt is related when it passes every active filter:
- the collection filters (the artist selection, `artist`, `member`, `season`, `class`, `on_offline`, `collection`), when together they leave some collection out: its collection passes them;
- `slug`: its collection is that collection;
- Matches Any or Mutual: the objekt matches the viewer, as the rings mark it, against the lists Compare with names. On a have or sale side, its collection is on one of the viewer's compared want lists that can take it. On a want side, its collection is on one of the viewer's compared have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer.

While any of these is active:
- each side SHALL show only its related objekts;
- its label SHALL read the shown count of the side's total, as "HAVE 4 of 27";
- after its thumbnails and any "+N" tile, the side SHALL show a "+N others" link to its list, counting its objekts that are not related;
- a side with no related objekt SHALL still be shown, as one line reading its label and total, then "none match" linking to its list, as "WANT 8 · none match", with no thumbnails and no "+N others";
- a post with no related objekt on any side SHALL not be listed.

Posts SHALL be shown whole, with no "of" and no "+N others", when none of these is active: every artist selected, no other filter, no `slug`, and on Browse rather than For you. The Type filter SHALL not narrow sides.

The match chip SHALL count the post's owner (see Matches to the signed-in viewer), whatever is shown and whatever filter is active. Rings SHALL mark matched objekts among those shown, so under Any or Mutual every shown objekt is ringed.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of posts. The order is newest bump first on Browse and under Any, and as Mutual order defines under Mutual. The filters SHALL combine. When no post is listed:
- under Any, the feed SHALL say that no posts match the viewer's lists and offer to show all posts on Browse, keeping the filters;
- under Mutual, it SHALL say that no one matches the viewer both ways and offer to switch to Any;
- with other filters set, it SHALL offer Reset.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: Split by artist
- **WHEN** the viewer, with tripleS, ARTMS and idntt selected in the artist picker, turns on the ARTMS toggle
- **THEN** the URL carries `artist=artms`, only posts with at least one ARTMS objekt are listed, and each of their sides shows only its ARTMS objekts

#### Scenario: Narrowed side
- **WHEN** the viewer, on Browse, filters to member SeoYeon, and a WTT post's have list holds 27 objekts of which 4 are SeoYeon, and its want list holds 14 of which 1 is SeoYeon
- **THEN** the post shows "HAVE 4 of 27" with 4 thumbnails and "+23 others", and "WANT 1 of 14" with 1 thumbnail and "+13 others"

#### Scenario: Empty side under a filter
- **WHEN** the viewer, on Browse, filters to member SeoYeon, and a WTT post's have side holds SeoYeon objekts but its want side holds none
- **THEN** the post is listed, and its want side reads "WANT 8 · none match" on one line, with no thumbnails

#### Scenario: Chip counts the whole post
- **WHEN** a post's owner has, across their lists, 3 collections on the viewer's want lists, one of them SeoYeon, and wants none of the viewer's, and the viewer filters to member SeoYeon
- **THEN** the chip still reads "They have 3 you want", and only the SeoYeon objekt among the shown thumbnails is ringed

#### Scenario: Only matches narrows the post
- **WHEN** Matches is Any, and a WTT post's have list holds 27 objekts of which 3 are on the viewer's want lists, and its want list holds 14 of which 2 are on the viewer's bound have lists and still owned
- **THEN** the post shows "HAVE 3 of 27" with those 3 thumbnails, all ringed, and "+24 others", and "WANT 2 of 14" with those 2, ringed, and "+12 others"

#### Scenario: One-way match under Only matches
- **WHEN** Matches is Any, and a post has 2 objekts the viewer wants but wants nothing the viewer has
- **THEN** the post is listed, its have side shows the 2, and its want side reads "WANT 8 · none match"

#### Scenario: Only matches judges each post
- **WHEN** Matches is Any, and rin.trades has a have list post holding nothing the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists
- **THEN** only the want list post is listed, and its chip counts rin.trades across both lists

#### Scenario: Only matches with a filter
- **WHEN** Matches is Any and the viewer filters to member SeoYeon, and a post's have side holds 3 objekts the viewer wants, one of them SeoYeon
- **THEN** the have side shows only that SeoYeon objekt, reading "HAVE 1 of 27"

#### Scenario: No filter
- **WHEN** the viewer has every artist selected, no other filter set and no `slug`, on Browse
- **THEN** posts are shown whole, with no "of" count and no "+N others"

#### Scenario: From the objekt drawer
- **WHEN** a signed-in viewer with a want list opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** Browse opens, only posts with SeoYeon 204Z on a have, want or sale side are listed, whatever artists are selected, each shows only its SeoYeon 204Z objekts with "+N others" for the rest, and a removable chip names the collection

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
- **THEN** the first page still lists up to a full page of matching posts, newest bump first, and loading more continues from the last one

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
- "They have N you want": collections on the owner's have or sale lists that are on one of the viewer's want lists that can take them. A sale list counts only against a want list open to swaps or buying.
- "You have N they want": collections on the owner's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A sale list counts only for a want list open to swaps or buying.
- The mutual score: the smaller of the two counts above. A sale list, the owner's or the viewer's, counts toward it exactly as it counts toward its own count: only against a want list open to swaps or buying. A want list set to swaps only never counts a sale list toward either direction, so it never makes a person mutual through one.

Every post by one owner SHALL show the same counts. They SHALL be the counts that person's sheet shows for the same Compare with choice (see `web-trade-for-you` Person sheet), apart from the sheet's caching delay. The counts show in the card's match chip (see Trade card). Matched objekts SHALL be marked with a ring, judged on the post's own objekts. The chip SHALL open a popover naming the viewer's lists the counts came from, each linking to its list: the want lists for the first count, and the have and sale lists for the second.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, so an objekt the viewer keeps off their have lists never counts as offered. A post whose chip shows SHALL also carry an All matches control after the chip, which opens the owner's person sheet.

**Matches prompt.** Browse has no Matches control. Beside its Post type menu:
- a signed-in viewer with no want list and no have or sale list bound to a Cosmo profile SHALL see one line saying For you's matches need such a list, with a Post a list control that opens the Post a list dialog (see Your posts and Post a list);
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade/for-you`;
- a viewer who can match SHALL see no line there.

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
- **THEN** a line beside the Post type menu says matches need a want list, or a have or sale list bound to a Cosmo profile, and its Post a list control opens the Post a list dialog

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades
- **THEN** rin.trades's posts are not listed on Browse or For you for that viewer

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

### Requirement: Matches and Compare with
For you (`/trade/for-you`) SHALL list the same posts as Browse, in the same cards and with the same Post type menu and facets, narrowed by matching. It SHALL carry a Mutual only switch beside the Post type menu. Off is Any, the default; on is Mutual:
- **Any**: only posts holding at least one objekt that matches the viewer are kept, judged on each post's own lists (see Filters).
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

**Mutual N.** The Mutual only switch SHALL read "Mutual only N", on or off, N being how many people Mutual lists for the current Compare with choice: people with at least one matching WTT post, with no artist or collection filter applied, so N stays put while the viewer filters. A one-way list, which Mutual can't use, counts as All my lists:
- a count of zero SHALL show the label with no number;
- a count above 99 SHALL read "99+";
- N SHALL be in monospace, and the accessible name SHALL include it;
- N MAY be up to 5 minutes behind the people Mutual lists.

**Compare with.** For you SHALL always show a Compare with control. It offers All my lists and each of the viewer's have, sale and want lists that take part in Trade, each option tagged with its list type. It SHALL live in the URL as `list`, a list slug.
- A named list SHALL compare together with its linked list, both ways.
- A list with no link (a sale list, or a have or want list whose linked list doesn't take part) SHALL compare one way. It SHALL be offered under Any and disabled under Mutual, and switching to Mutual while it is selected SHALL reset Compare with to All my lists.
- A `list` that is not one of the viewer's lists that take part, or that the current option can't use, SHALL read as All my lists.
- The compared lists SHALL replace the viewer's lists everywhere matching shows on For you: the chips and their popovers, the rings, Any and Mutual.
- While Compare with names a list, one line under the controls SHALL say what is compared: the named list with its linked list, or the named list alone and which way it compares. With All my lists, no line SHALL show.

The help beside the controls SHALL describe the mutual score as the smaller of the two counts, where a sale list counts only against a want list open to buying, and describe Compare with as one list plus its linked list, a list with no link comparing one way.

**Old Browse links.** `/trade` SHALL no longer take `match` or `list`:
- `/trade?match=any`, `/trade?match=mutual` or `/trade?matches=1` SHALL redirect to `/trade/for-you` with the same option (`matches=1` becomes `match=any`), keeping `list`, `person` and the filters;
- `/trade?match=off` SHALL drop `match` and `list` and stay on Browse;
- on a viewer who can't use For you, the redirected address then sends them on as Who sees it says.

**Layout.** The Mutual only switch, Compare with and the help SHALL sit in one row that wraps on a narrow screen, with the compared-lists line under it. There SHALL be no separate Matching button or sheet. A change SHALL apply at once.

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
- **THEN** the Mutual only switch (on), Compare with naming spares and the help wrap within the screen width, with the compared-lists line under them and no horizontal scroll
