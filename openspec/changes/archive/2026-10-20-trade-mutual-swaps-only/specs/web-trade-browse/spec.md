## MODIFIED Requirements

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each person's row on Browse and on For you SHALL show that person's counts. They are taken across all of the person's listed have, sale and want lists (on Trade, not idle), with the rules and ownership check of `web-trade-for-you`. They are counted against the viewer's lists, or, on For you, against the lists Compare with names:
- "They have N you want": collections on the person's have or sale lists that are on one of the viewer's want lists that can take them. A have list counts only against a want list open to swaps (Swaps only, or Swaps or buying); a sale list counts only against a want list open to buying (Swaps or buying, or Buying only).
- "You have N they want": collections on the person's want lists that are on one of the viewer's have or sale lists that is bound to a Cosmo profile and still tradeable by the viewer. A have list counts only for a want list open to swaps; a sale list counts only for a want list open to buying.
- The mutual score: what the person and the viewer can swap, the smaller of two swap counts. One is the collections on the person's have lists that are on one of the viewer's want lists open to swaps (Swaps only, or Swaps or buying); the other is the collections on the person's want lists open to swaps that are on one of the viewer's have lists bound to a Cosmo profile and still tradeable by the viewer. A sale list, the person's or the viewer's, SHALL never count toward the mutual score, though it counts toward the two counts above: a sale is not a swap, so a person matched only through sale lists is one way. A want list set to buying only never counts toward it either.

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

#### Scenario: A sale list and a buying want list make a person mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want lists (open to swaps or buying), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's row reads "You have 1 they want", the sale list reads "3 you want", and jinsoul.blue is listed under One way, not Mutual

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want list, which is open to swaps only, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** the sale list does not count, so jinsoul.blue's row reads "You have 1 they want", the sale list shows no count, and jinsoul.blue is not listed under Mutual

#### Scenario: The viewer's sale list against their want list
- **WHEN** the viewer's sale list holds a collection that rin.trades's want list asks for, and rin.trades has a have list holding a collection the viewer wants
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
- **THEN** the browser is at `/trade/for-you?match=mutual` and Mutual only is on

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
- **WHEN** rin.trades's have list holds 2 collections on the viewer's want list open to swaps or buying, rin.trades's want list (open to swaps) asks for 3 collections on the viewer's bound have list, and rin.trades's sale list holds 4 more collections the viewer wants
- **THEN** rin.trades's row reads "You can swap 2", and rin.trades is listed under Mutual

### Requirement: Matches and Compare with
For you (`/trade/for-you`) SHALL list the same people as Browse, in the same rows and with the same Post type menu and facets, narrowed by matching. It SHALL carry a Mutual only switch (see Layout for where it sits). Off is Any, the default; on is Mutual:
- **Any**: only posts holding at least one objekt that matches the viewer are kept, judged on each post's own lists (see Filters), and only people with a kept post are listed, in two sections (see Any order).
- **Mutual**: only people whose mutual score is above zero, as the person's header sentence computes it (see Matches to the signed-in viewer). Of those people's posts, only those holding a match are kept, as under Any.

**Who sees it.** For you SHALL require a signed-in viewer with at least one list that takes part in Trade (a want list, or a have or sale list bound to a Cosmo profile):
- a signed-out visitor opening it SHALL be sent to `/login`, and back to the same For you address after signing in;
- a signed-in viewer without such a list SHALL be sent to `/trade`, keeping the filters and `person`, and dropping `match` and `list`.

**Post type menu.** On Browse and For you, the post type SHALL be one menu labelled Post type, offering All, WTT, WTB and WTS, with each tag spelled out ("WTT · Want to trade"). It replaces the Type tabs, so the controls beside it never move. Mutual is a swap between two people, and a WTB or WTS post is one-way money, so Mutual SHALL list WTT posts only: the menu SHALL read WTT with every other option disabled, a `type` in the URL or in a request SHALL be ignored, by the server as well as the page, and turning Mutual only on SHALL drop it from the URL. Who counts as Mutual is unchanged (see Matches to the signed-in viewer).

**Default and URL.** The option SHALL live in the URL as `match`, with the values `any` and `mutual`. With no `match`, or a value that does not parse, Any SHALL apply. Browse's `type`, `slug`, facet and `person` parameters SHALL carry the same meaning on For you.

**Mutual order.** Under Mutual the feed SHALL list people best match first:
1. the mutual score;
2. then the sum of both counts;
3. then the most recent change to any of the person's matched lists.

Each person SHALL be one row holding their kept posts (see Trade card). Every Mutual person SHALL be listed, with no cap beyond the 1000 candidates matching reads, and idle posts SHALL not be listed (see Order and idle posts). The feed SHALL load 12 people at a time and continue after the last person it showed. When the ranking is worked out again between two loads, a person already shown SHALL not be listed again, and a person who only moved within the ranking since SHALL still be listed, at the place earlier loads saw them. A person who leaves Mutual between two loads MAY go unlisted until the feed is opened again.

**Any order.** Under Any the feed SHALL list two sections, in this order:
1. **Mutual**: exactly the people Mutual lists for the same filters and Compare with choice, in Mutual order. Each row SHALL hold all of the person's kept posts, in the Trade card's order. A person Mutual ranks who has no kept WTT post SHALL be listed under One way instead. With WTB or WTS picked in the Post type menu there is no Mutual section, since Mutual lists WTT posts only.
2. **One way**: every other person Any keeps. People SHALL be listed most matches first, by the sum of both counts and then the most recent change to any of their matched lists, among the people matching ranks (at most its 1000 candidates). After them comes anyone else Any keeps, by their newest bump. A person SHALL be listed in one section only.

Each section SHALL open with a heading, Mutual or One way, with no count, over its first row. A section with no people SHALL have no heading. Under Mutual only there SHALL be no section heading. The feed SHALL load 12 people at a time across the sections, continuing after the last person it showed, and SHALL not list a person twice when the ranking is worked out again between two loads. The empty states of Filters are unchanged.

**Description.** Under the tabs, For you's description SHALL read "People who match your lists, best match first." Below `md`, neither tab SHALL show its description.

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
- A `list` that is not one of the viewer's lists that take part, or that the current option or Post type can't use, SHALL read as All my lists: in the menu, the compared-lists line and the feed request, which SHALL not send it. The URL is left as it is until the next change.
- The compared lists SHALL replace the viewer's lists everywhere matching shows on For you: the header sentences, the list counts, the rings, Any and Mutual.
- While Compare with names a list, one line under the controls SHALL say what is compared: the named list with its linked list, or the named list alone and which way it compares. With All my lists, no line SHALL show.

The help beside the controls SHALL describe the mutual score as what the two people can swap, the smaller of the two swap counts, with sale lists never counting toward it, and describe Compare with as one list plus its linked list, a list with no link comparing one way.

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
- **THEN** the URL carries `match=mutual`, rin.trades's row is listed first holding both posts, and kaede.k's row follows

#### Scenario: Sale-only person under Mutual
- **WHEN** jinsoul.blue matches the viewer both ways only through sale lists, against want lists open to swaps or buying
- **THEN** jinsoul.blue is listed under Any in the One way section, is not listed under Mutual only, and is not counted in Mutual N

#### Scenario: Sale-only person against a swaps-only want list
- **WHEN** jinsoul.blue's only match in one direction is a sale list against a want list open to swaps only
- **THEN** that direction counts 0, and jinsoul.blue's posts are listed under Any if they match the other way, and not under Mutual

#### Scenario: Type under Mutual
- **WHEN** under Any the viewer picks WTS in the Post type menu and then turns on Mutual only
- **THEN** the menu reads WTT with All, WTB and WTS disabled, the URL no longer carries `type`, only WTT posts are listed, and the switch stays where it was

#### Scenario: More under Mutual
- **WHEN** 20 people are mutual with the viewer and the viewer scrolls past the first 12 rows
- **THEN** the feed loads the remaining 8 in the same order, without repeating a person

#### Scenario: Compare one pair
- **WHEN** under Mutual the viewer picks have list "spares", linked to want list "binary hunt"
- **THEN** the URL carries `list=spares`, the line reads "What you have: spares. What you want: binary hunt.", header sentences, list counts and rings count only those two lists, and the switch counts the mutual people for them

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
- **THEN** the feed shows no Mutual heading and opens with the One way heading

#### Scenario: Headings under Mutual only
- **WHEN** the viewer turns on Mutual only
- **THEN** the feed lists the Mutual people with no section heading

### Requirement: Buying only note
A WTB post whose want list is set to Buying only SHALL show a short muted note beside its tag, "Buying only, not swapping", in its person's row, the way a want-only WTT post shows "Swaps only, not buying". A WTB post whose want list is open to swaps or buying SHALL show no note. The Browse help's tag table SHALL describe WTB as a want list open to swaps or buying, or set to buying only, and its "What counts toward Mutual" section SHALL show that a have list counts against a want list open to swaps only or to swaps or buying and not against one set to buying only, and that a sale list never counts toward Mutual.

#### Scenario: Buying-only post
- **WHEN** a want list on its own is set to Buying only and on Trade
- **THEN** its post shows the WTB tag with "Buying only, not swapping" beside it, and one WANT strip

#### Scenario: Swaps or buying post
- **WHEN** a want list on its own is open to swaps or buying and on Trade
- **THEN** its post shows the WTB tag and no note

#### Scenario: Help table
- **WHEN** the viewer opens the matching help on Browse
- **THEN** the Mutual section shows a have list counting against Swaps only and Swaps or buying but not Buying only, and says a sale list never counts toward Mutual
