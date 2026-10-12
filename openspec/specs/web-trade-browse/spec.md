# web-trade-browse Specification

## Purpose
The public Trade Browse feed on `apps/web` at `/trade`: posts by people who put their have, want or sale lists on Trade, kept fresh by Bump and current ownership, with matches to the signed-in viewer marked.

## Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned its Show on Trade switch on (Show on Market on a sale list; see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list, and for a want list on its own open to Trade only;
- WTB for a want list on its own open to Trade or buy;
- WTS for a sale list.

#### Scenario: Trades-only want list
- **WHEN** a want list on its own is open to Trade only, whether or not it is linked to a have list that is off Trade
- **THEN** its post is tagged WTT and listed under WTT, not WTB

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
Posts SHALL be ordered by their last bump, newest first. Turning Show on Trade on SHALL count as a bump, unless the post was bumped in the last 24 hours, so neither switching it off and on nor posting the second list of a pair skips the bump limit. Editing a list or its entries SHALL not move its post.

A post SHALL be idle when 30 days have passed since its last bump and since the last change to any of its lists or their entries. An idle post SHALL not be listed until it is bumped or changed. The feed SHALL load more posts as the viewer scrolls, 24 at a time.

#### Scenario: Edit does not jump the queue
- **WHEN** an owner adds an entry to a list on Trade that was bumped 3 days ago
- **THEN** the post keeps its place, and its time shows the change

#### Scenario: Idle post drops out
- **WHEN** a post was last bumped 31 days ago and none of its lists changed since
- **THEN** it is not listed on `/trade`

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
A signed-in viewer's own posts SHALL be summarised above the feed in one row: the title Your posts, how many of them are listed, how many are idle, and how many can be bumped now, with a control that shows or hides the posts. Shown, each entry SHALL show:
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
`/trade`, `/trade/for-you` and `/trade/mine` SHALL share a tab bar with Browse, For you and My trades, marking the current one. For a signed-out visitor, For you and My trades SHALL lead to `/login?redirect=` with their path.

For a signed-in user, two tabs SHALL carry a count after their label, in monospace:
- For you: how many partners For you lists under Everyone with all of the user's lists;
- My trades: the open offers waiting on the user (Needs you) plus the trades in progress.

A count of zero SHALL show nothing, and a count above 99 SHALL read "99+". The tab's accessible name SHALL include the count. Counts SHALL be read when the tab bar loads and when the user moves between Trade tabs, and MAY be up to 5 minutes behind For you's own results. Browse SHALL carry no count.

#### Scenario: Switch tabs
- **WHEN** a signed-in user on `/trade` activates For you
- **THEN** the browser is at `/trade/for-you` and For you is marked current

#### Scenario: My trades signed out
- **WHEN** a signed-out visitor activates My trades
- **THEN** the browser is at `/login?redirect=/trade/mine`

#### Scenario: Counts
- **WHEN** a signed-in user has 4 partners under Everyone, 1 offer waiting on them and 1 trade in progress
- **THEN** the tabs read "For you 4" and "My trades 2", and a screen reader announces both counts

#### Scenario: Nothing waiting
- **WHEN** the user has no open offer to answer and no trade in progress
- **THEN** My trades shows no count

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens `/trade`
- **THEN** no tab shows a count and no count is requested

### Requirement: Freshness
Show on Trade changes and bumps SHALL show on every viewer's next load of `/trade`. Changes to entries SHALL appear within 1 minute.

#### Scenario: Someone else posts
- **WHEN** another user turns Show on Trade on for a list
- **THEN** a viewer reloading `/trade` sees the post

#### Scenario: Entry added
- **WHEN** an owner adds an objekt to a list on Trade
- **THEN** viewers see it in the post within 1 minute

### Requirement: Message a post's owner
Each post not owned by the viewer SHALL offer Message, under the rules in `web-chat`. Message SHALL open the conversation with the owner, adding a card for the post's list. A post whose owner doesn't take messages from the viewer SHALL show "Not taking messages" in place of Message and Make offer.

#### Scenario: From a post
- **WHEN** a signed-in user with a linked address activates Message on rin.trades's WTT post
- **THEN** the conversation with rin.trades opens in the Inbox, with a card for the post's have list

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
Each post that shows Message SHALL also offer Make offer. It opens the offer builder for the post's owner, with the post's have or sale list, if it has one, available on the You get side.

The builder SHALL lay out shortcuts from the post, each one tap to add, without pre-filling the offer:
- under You get, when the post has a have or sale side: its entries the viewer may ask for, those in collections on the viewer's want lists first, then the rest in list order;
- under You give, when the post has a want side (a WTB post, or the want list of a WTT pair): objekts the viewer holds that are transferable and not reserved, in collections on that want list, those on the viewer's have and sale lists bound to a Cosmo profile first.

Each shortcut SHALL show at most 8 objekts. An objekt added to the offer SHALL leave its shortcut, and the next one SHALL take its place. A shortcut with nothing to show SHALL not be rendered.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's post
- **THEN** the builder opens addressed to rin.trades, listing that post's have entries under You get

#### Scenario: Matches first
- **WHEN** rin.trades's have list holds 20 entries and its 15th is SeoYeon 204Z, which is on the viewer's want list
- **THEN** SeoYeon 204Z is the first objekt under You get

#### Scenario: Refill
- **WHEN** the viewer adds an objekt from the You get shortcut of a post with 12 entries
- **THEN** that objekt leaves the shortcut and the 9th entry joins it, so it still shows 8

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a WTB post wanting HaSeul 302Z, and holds a copy of it
- **THEN** that copy is shown under You give, and nothing is shown under You get from the post

#### Scenario: Nothing to give
- **WHEN** the viewer holds nothing the post's want list asks for
- **THEN** no shortcut is shown under You give

### Requirement: Owner reputation on posts
Each post SHALL show its owner's reputation line (see `web-verified-trades`) beside the owner's name.

#### Scenario: Post byline
- **WHEN** a viewer sees nakyoung.cards's post
- **THEN** the byline shows nakyoung.cards's verified count and positive share

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
