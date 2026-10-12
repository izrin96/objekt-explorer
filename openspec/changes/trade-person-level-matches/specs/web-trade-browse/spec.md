## MODIFIED Requirements

### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Type: All, WTT, WTB or WTS (`type`). All is the default.
- Artist (`artist`): a row of toggles, All then each artist in the app's artist picker selection, before the other filters. All clears it. More than one artist MAY be on. The row SHALL be hidden when the selection holds one artist.
- Member (`member`), season (`season`), class (`class`), online/offline (`on_offline`) and collection number (`collection`), with the same controls, filter sheet, active chips and Reset as the other collection pages, and the same parameter names and values. Because the post-type tabs sit right under them, the online/offline filter and its chip SHALL be labelled Format on Browse, not Type.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- Only matches (`matches=1`), a switch beside the Type tabs, off by default. On, it keeps only posts holding at least one objekt that matches the viewer, the objekts the rings mark (see Narrowing). It judges each post on its own lists, not the owner's other lists.

The feed SHALL follow the artists selected in the app's artist picker, as Activity does. An `artist` value outside that selection SHALL be ignored. A `slug` link SHALL ignore the artist selection and the `artist` parameter, so a link from the objekt drawer lists every post holding that collection.

**Narrowing.** When a filter is active, each post SHALL show only the objekts related to it. An objekt is related when it passes every active filter:
- the collection filters (the artist selection, `artist`, `member`, `season`, `class`, `on_offline`, `collection`), when together they leave some collection out: its collection passes them;
- `slug`: its collection is that collection;
- Only matches: it matches the viewer, as the rings mark it. On a have or sale side, its collection is on one of the viewer's want lists that can take it. On a want side, its collection is on one of the viewer's have or sale lists bound to a Cosmo profile and still tradeable by the viewer.

While any of these is active:
- each side SHALL show only its related objekts;
- its label SHALL read the shown count of the side's total, as "HAVE 4 of 27";
- after its thumbnails and any "+N" tile, the side SHALL show a "+N others" link to its list, counting its objekts that are not related;
- a side with no related objekt SHALL still be shown, reading "0 of N", with no thumbnails and its "+N others" link;
- a post with no related objekt on any side SHALL not be listed.

When none is active (every artist selected, no other filter, no `slug`, Only matches off), posts SHALL be shown whole, with no "of" and no "+N others". The Type filter SHALL not narrow sides.

The match chip SHALL count the post's owner (see Matches to the signed-in viewer), whatever is shown and whatever filter is active. Rings SHALL mark matched objekts among those shown, so with Only matches on every shown objekt is ringed.

Only matches SHALL show only to a signed-in viewer with at least one list that takes part in Trade: a want list, or a have or sale list bound to a Cosmo profile. For anyone else `matches` SHALL be ignored, and the matches prompt (see Matches to the signed-in viewer) SHALL stand where the switch would be.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of matching posts, newest bump first. The filters SHALL combine. With Only matches on and no matching post, the feed SHALL say that no posts match the viewer's lists and offer to turn Only matches off. With other filters set and no post listed, the feed SHALL offer Reset.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: Split by artist
- **WHEN** the viewer, with tripleS, ARTMS and idntt selected in the artist picker, turns on the ARTMS toggle
- **THEN** the URL carries `artist=artms`, only posts with at least one ARTMS objekt are listed, and each of their sides shows only its ARTMS objekts

#### Scenario: Narrowed side
- **WHEN** the viewer filters to member SeoYeon, and a WTT post's have list holds 27 objekts of which 4 are SeoYeon, and its want list holds 14 of which 1 is SeoYeon
- **THEN** the post shows "HAVE 4 of 27" with 4 thumbnails and "+23 others", and "WANT 1 of 14" with 1 thumbnail and "+13 others"

#### Scenario: Empty side under a filter
- **WHEN** the viewer filters to member SeoYeon, and a WTT post's have side holds SeoYeon objekts but its want side holds none
- **THEN** the post is listed, and its want side reads "WANT 0 of 8" with "+8 others" and no thumbnails

#### Scenario: Chip counts the whole post
- **WHEN** a post's owner has, across their lists, 3 collections on the viewer's want lists, one of them SeoYeon, and wants none of the viewer's, and the viewer filters to member SeoYeon
- **THEN** the chip still reads "They have 3 you want", and only the SeoYeon objekt among the shown thumbnails is ringed

#### Scenario: Only matches narrows the post
- **WHEN** a signed-in viewer turns Only matches on, and a WTT post's have list holds 27 objekts of which 3 are on the viewer's want lists, and its want list holds 14 of which 2 are on the viewer's bound have lists and still owned
- **THEN** the post shows "HAVE 3 of 27" with those 3 thumbnails, all ringed, and "+24 others", and "WANT 2 of 14" with those 2, ringed, and "+12 others"

#### Scenario: One-way match under Only matches
- **WHEN** Only matches is on, and a post has 2 objekts the viewer wants but wants nothing the viewer has
- **THEN** the post is listed, its have side shows the 2, and its want side reads "WANT 0 of 8" with "+8 others"

#### Scenario: Only matches judges each post
- **WHEN** Only matches is on, and rin.trades has a have list post holding nothing the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists
- **THEN** only the want list post is listed, and its chip counts rin.trades across both lists

#### Scenario: Only matches with a filter
- **WHEN** Only matches is on and the viewer filters to member SeoYeon, and a post's have side holds 3 objekts the viewer wants, one of them SeoYeon
- **THEN** the have side shows only that SeoYeon objekt, reading "HAVE 1 of 27"

#### Scenario: No filter
- **WHEN** the viewer has every artist selected, no other filter set, no `slug` and Only matches off
- **THEN** posts are shown whole, with no "of" count and no "+N others"

#### Scenario: From the objekt drawer
- **WHEN** the viewer opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** only posts with SeoYeon 204Z on a have, want or sale side are listed, whatever artists are selected, each shows only its SeoYeon 204Z objekts with "+N others" for the rest, and a removable chip names the collection

#### Scenario: Selected artists
- **WHEN** the viewer has only tripleS selected in the artist picker and opens `/trade`
- **THEN** only posts showing at least one tripleS objekt are listed, each side shows only its tripleS objekts, and there is no artist toggle row

#### Scenario: Old facet link
- **WHEN** the viewer opens `/trade?season=atom01&class=first` from an older link
- **THEN** the filters apply: only posts with an Atom01 First objekt are listed, narrowed to those objekts, and both filters show as active chips

#### Scenario: Only matches
- **WHEN** a signed-in viewer with a want list holding SeoYeon 204Z turns Only matches on
- **THEN** the URL carries `matches=1`, a post whose have side holds SeoYeon 204Z stays, showing SeoYeon 204Z and not its other objekts, and a post that matches none of the viewer's lists is no longer listed

#### Scenario: Pages stay full
- **WHEN** only 1 of every 10 posts matches the viewer and Only matches is on
- **THEN** the first page still lists up to a full page of matching posts, newest bump first, and loading more continues from the last one

#### Scenario: Combined with a type
- **WHEN** the viewer turns Only matches on and picks WTB
- **THEN** only want-list posts asking for a collection on the viewer's bound have lists are listed

#### Scenario: Nothing matches
- **WHEN** Only matches is on and no post matches the viewer's lists
- **THEN** the feed says no posts match the viewer's lists, with a control that turns Only matches off

#### Scenario: Nothing passes the filters
- **WHEN** the viewer filters to a season no post holds
- **THEN** the feed says no posts match the filters, with Reset

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?matches=1`
- **THEN** there is no Only matches switch, the matches prompt stands in its place, and every post is listed

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, every post SHALL show its owner's counts, taken across all of the owner's lists that For you matches (their discoverable have, sale and want lists, listed or idle), with the rules and ownership check For you uses (see `web-trade-for-you`):
- "They have N you want": collections on the owner's have or sale lists that are on one of the viewer's want lists that can take them; a sale list counts only against a want list open to Trade or buy;
- "You have N they want": collections on the owner's want lists that are on one of the viewer's have or sale lists bound to a Cosmo profile and still tradeable by the viewer; a sale list counts only for a want list open to Trade or buy;
- the mutual score: the smaller of two trades-only counts, the collections on the owner's have lists that are on the viewer's want lists, and the collections on the viewer's bound have lists, still tradeable, that the owner's want lists ask for. Sale lists, the owner's or the viewer's, SHALL never count toward it.

Every post by one owner SHALL show the same counts. They SHALL be the counts that owner's For you row shows under Everyone with all lists compared, apart from For you's own caching delay (see `web-trade-for-you` Freshness). The counts show in the card's match chip (see Trade card). Matched objekts SHALL be marked with a ring, judged on the post's own objekts. The chip SHALL open a popover naming the viewer's lists the counts came from: the want lists for the first count and the have and sale lists for the second, each linking to its list.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, as For you does, so an objekt the viewer keeps off their have lists never counts as offered. Browse SHALL offer Only matches (see Filters) but no Show or Compare with control: narrowing by direction or by one list is For you's job. A post whose chip has a mutual score above zero, and whose owner is a Mutual only partner in the viewer's For you, SHALL also carry a "See in For you" link after the match chip, to `/trade/for-you?match=mutual&partner=<their id>`. The link SHALL show only when both hold.

**Matches prompt.** Where the Only matches switch would be:
- a signed-in viewer with no want list and no have or sale list bound to a Cosmo profile SHALL see one line saying matches need such a list, with a Post a list control that opens the Post a list dialog (see Your posts and Post a list);
- a signed-out visitor SHALL see one line inviting them to sign in to see which posts match their lists, with a Sign in link to `/login?redirect=/trade`.

The viewer's own posts SHALL not be listed in the feed. Posts by partners the viewer hid in For you SHALL also be left out.

#### Scenario: Default
- **WHEN** a signed-in viewer opens `/trade` with no parameters
- **THEN** posts of every type are listed with their match chips and rings, and Only matches is off

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post's owner wants two collections, across their want lists, that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Unlinked lists, one person
- **WHEN** rin.trades has a have list post holding 1 collection the viewer wants and a separate want list post asking for 2 collections on the viewer's bound have lists, none of these on sale lists
- **THEN** both posts' chips read "Mutual 1 · they have 1 · you have 2"

#### Scenario: Sale listings aren't mutual
- **WHEN** jinsoul.blue's sale list holds 3 collections on the viewer's want lists (open to Trade or buy), jinsoul.blue has no have list, and their want list asks for 1 collection on the viewer's bound have list
- **THEN** jinsoul.blue's posts show "They have 3 you want · you have 1 they want" on a neutral surface, with no mutual score and no See in For you link

#### Scenario: Mutual partner
- **WHEN** rin.trades's chip has a mutual score and rin.trades is listed under Mutual only in the viewer's For you
- **THEN** each of rin.trades's posts shows the mutual chip and a See in For you link to rin.trades's row in For you's Mutual only view

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the parameter is ignored and every post is listed

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match chip, no rings, no For you links and no Only matches switch, and a line beside the Type tabs invites them to sign in to see matches, linking to `/login?redirect=/trade`

#### Scenario: No list that can match
- **WHEN** a signed-in viewer whose only list is a have list not bound to a Cosmo profile opens `/trade`
- **THEN** a line beside the Type tabs says matches need a want list, or a have or sale list bound to a Cosmo profile, and its Post a list control opens the Post a list dialog

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades in For you
- **THEN** rin.trades's posts are not listed for that viewer

### Requirement: Trade card
A post on Browse and a partner on For you (see `web-trade-for-you`) SHALL be built from the same parts, in the same order:
- **Header**:
  - the avatar;
  - the name, linking to the profile, with the Discord and Twitter badges the owner chose to show;
  - the reputation line (see `web-verified-trades`);
  - the ⋯ menu, holding Block and Report.
- **Match chip**, for a signed-in viewer with at least one count above zero. With A the "They have" count, B the "You have" count and M the mutual score (see Matches to the signed-in viewer):
  - only A above zero: it reads "They have A you want";
  - only B above zero: it reads "You have B they want";
  - both above zero and M zero: it reads "They have A you want · you have B they want";
  - M above zero: it reads "Mutual M · they have A · you have B".
  - It SHALL sit on a neutral surface when M is zero, and on the mutual colour when M is above zero.
  - Its numbers SHALL be monospace.
  - Its visible words SHALL be its accessible name.
  - It SHALL open the popover of matched lists.
  - Browse and For you SHALL word and colour the chip the same way from the same counts.
- **Strip**: a monospace role label in its list type's colour, with the number of objekts on that side, over one line of thumbnails 3.5rem wide. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting every objekt not shown. On Browse the tile links to the list; on For you it opens the row. Sale prices show as a monospace caption under each thumbnail.
- **Actions**: Message, then Make offer as the primary button. An account that doesn't take messages from the viewer shows "Not taking messages" in their place.

**A Browse post** SHALL be a bordered card on the card surface, one post to a row at every width, laid out in one line where it fits:
- a byline column: the header, the post's type tags, and the updated or bumped time in monospace. A WTT post with only a want side SHALL also show a short muted note beside its tag, "Trades only, not buying", saying the owner wants to trade, not buy;
- the sides, taking the remaining width:
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the whole width;

  Side-by-side strips SHALL be top-aligned, so their labels sit on one line whatever each strip holds (prices, "none").
- the actions: Make offer and an icon-only Message with an accessible name;
- under the sides, one line holding the list name (linking to the list), the description, the match chip and any See in For you link. The line SHALL be truncated with an ellipsis when it doesn't fit, and the full description SHALL stay available to assistive technology.

Where the feed is too narrow for that line, the post SHALL stack: the byline, then each strip at full width with the ⇄ mark between them turned to point down, then the list line, then the actions. The strips SHALL still not wrap.

Every row SHALL have the same layout whatever the number of objekts, so posts in the feed differ in height only by their number of sides when stacked.

**A For you partner** is a row, laid out in `web-trade-for-you`.

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's post on Browse and rin.trades's row on For you
- **THEN** both show the name, reputation line and ⋯ in the same order, and both chips read "Mutual 2 · they have 4 · you have 2"

#### Scenario: Chip without a mutual score
- **WHEN** a post's owner has 3 collections the viewer wants and wants none of the viewer's
- **THEN** its chip reads "They have 3 you want" on a neutral surface, and a screen reader announces the same words

#### Scenario: Chip for the other way
- **WHEN** a post's owner wants 1 collection on the viewer's bound have lists and has nothing the viewer wants
- **THEN** its chip reads "You have 1 they want" on a neutral surface

#### Scenario: Want-only WTT post
- **WHEN** a want list on its own is open to Trade only and on Trade
- **THEN** its post shows the WTT tag with "Trades only, not buying" beside it, and one WANT strip

#### Scenario: Pair has no note
- **WHEN** a WTT post holds a have list and its linked want list
- **THEN** its byline shows the WTT tag and no "Trades only" note

#### Scenario: Desktop grid
- **WHEN** the viewer opens `/trade` at 1280 px with 10 posts loaded
- **THEN** the posts sit in 10 rows, one each, and the feed keeps loading more as it scrolls

#### Scenario: Pair side by side
- **WHEN** a WTT post holds a have list and its linked want list, at 1280 px
- **THEN** the HAVE strip and the WANT strip sit side by side in the same row, with ⇄ between them, their labels on one line, and the actions at the row's end

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 27 objekts and its HAVE strip has room for 6 thumbnails
- **THEN** the strip shows 5 thumbnails and a "+22" tile on one line, and the label reads HAVE 27

#### Scenario: Short side
- **WHEN** a post's want side holds 2 objekts
- **THEN** its WANT strip shows both thumbnails and no "+N" tile, and the row is as tall as a row with a full strip

#### Scenario: Resize
- **WHEN** the viewer widens the window so a strip has room for 3 more thumbnails
- **THEN** the strip shows 3 more and the "+N" count drops by 3

#### Scenario: WTS post
- **WHEN** a WTS post's sale list holds 19 objekts
- **THEN** one SALE strip runs across the sides' width, each thumbnail captioned with its price or QYOP

#### Scenario: Phone width
- **WHEN** Browse is shown at 390 px
- **THEN** each post stacks byline, HAVE strip, ⇄ pointing down, WANT strip, list line and actions, each strip stays one line ending in "+N", and the page doesn't scroll sideways

### Requirement: Trade colours
Trade cards on Browse and For you SHALL colour their type marks and direction headings (see `web-lists` List type colours):
- post tags, list badges and strip role labels take their list type's colour;
- on For you, the "They have, you want" heading is amber, the want colour, since it fills one of the viewer's want lists;
- the "You have, they want" heading is teal, the have colour, since it comes off one of the viewer's have lists;
- the match chip is indigo when it has a mutual score and neutral otherwise.

Cards, rows, buttons, avatars and backgrounds SHALL stay neutral, apart from the destructive strike on an objekt that isn't counted (see `web-trade-for-you`).

#### Scenario: A WTS post
- **WHEN** the viewer sees a WTS post whose owner has 3 collections on the viewer's want lists and wants none of the viewer's
- **THEN** its WTS tag and SALE label are rose, and its chip reads "They have 3 you want" on a neutral surface

#### Scenario: Mutual partner
- **WHEN** a For you row's chip reads "Mutual 2 · they have 14 · you have 2"
- **THEN** the chip is indigo, "They have, you want (14)" is amber and "You have, they want (2)" is teal
