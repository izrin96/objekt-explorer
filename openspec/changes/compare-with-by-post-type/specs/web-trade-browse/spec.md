## MODIFIED Requirements

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
- A list that the picked Post type can never match SHALL be offered disabled, as Mutual disables one-way lists, and the Post type menu SHALL never disable an option because of the picked list:
  - **All**: every list can be offered;
  - **WTT**: under WTT, the viewer's have or sale list matches through the post's want side, while the viewer's want list (open to swaps) matches the post's have side; so a selection with no have or sale list and no want list open to swaps (Swaps only, or Swaps or buying) is disabled. That is a lone Buying only want list, which a pair with a have list passes through its have half;
  - **WTB**: a WTB post is the poster's want list, matched against the viewer's have and sale lists, so a selection with no have or sale list (a lone want list) is disabled;
  - **WTS**: a WTS post is a sale list, matched against the viewer's want lists open to buying, so a selection with no want list open to buying (Swaps or buying, or Buying only) (a lone have list, a sale list, a lone Swaps only want list, or a have and want pair whose want list is Swaps only) is disabled;
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

**Layout.** From `md` up, Compare with and the help SHALL follow the Post type menu on the facet row, after a divider, and the Mutual only switch SHALL come last, at the very right of the row after the help, staying last when the row wraps. Below `md`, the Filters button, the Mutual only switch, the Post type menu, Compare with and the help SHALL sit in one row that scrolls sideways within itself, so the page doesn't. The compared-lists line SHALL sit under the row. There SHALL be no separate Matching button or sheet. A change SHALL apply at once.

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
- **THEN** Compare with offers "binary hunt" disabled and "spares" enabled

#### Scenario: WTT disables a lone Buying only want list
- **WHEN** on For you the viewer picks Post type WTT, and has a Buying only want list "bulk buys" with no link, and a have list "spares" paired with a Buying only want list
- **THEN** Compare with offers "bulk buys" disabled and "spares" enabled

#### Scenario: WTS disables lists that can't match
- **WHEN** on For you the viewer picks Post type WTS, and has a lone have list, a sale list, a lone Swaps only want list and a have and want pair whose want list is Swaps only
- **THEN** Compare with offers all four disabled, and a want list open to buying, alone or in a pair, enabled

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
- **THEN** the Filters button, the Mutual only switch (on), the Post type menu, Compare with naming spares and the help sit in one row that scrolls sideways on its own, with the compared-lists line under it, and the page doesn't scroll sideways

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

