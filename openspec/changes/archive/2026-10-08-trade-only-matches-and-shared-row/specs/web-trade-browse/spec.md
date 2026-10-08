## ADDED Requirements

### Requirement: Trade card
A post on Browse and a partner on For you (see `web-trade-for-you`) SHALL be shown in the same card, laid out the same way:
- **Header**, in this order:
  - the avatar;
  - the name, linking to the profile, with the Discord and Twitter badges the owner chose to show;
  - the reputation line (see `web-verified-trades`);
  - a meta line, whose content each tab defines.
- **Actions**, at the top right of the card: Message, Make offer, then a ⋯ menu holding Block and Report. Below `sm`, Message and Make offer take a row of their own under the name, and ⋯ stays at the top right. An account that doesn't take messages from the viewer shows "Not taking messages" in place of Message and Make offer.
- **Match line**, for a signed-in viewer, under the header. Its parts, in this order, each shown only when above zero, separated by "·":
  - "They have N you want";
  - "You have N they want";
  - "Mutual N", the smaller of the two, in bold.
- **Body**: sections, each a heading over a grid of objekt thumbnails of one size, at least 5.5rem wide from `sm` up and 3.5rem below it. A section SHALL show at most 11 objekts, then a "+N" tile for the rest, so a full section fills one row at 1280 px.

The tabs differ only in the meta line, in what follows the match line, and in the body's sections.

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's post on Browse and rin.trades's card on For you
- **THEN** both cards place the name, reputation line, Message, Make offer and ⋯ in the same spots, and both match lines read "They have 4 you want · You have 2 they want · Mutual 2"

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 20 objekts and the viewer's window is 1280 px wide
- **THEN** the side shows 11 thumbnails and a "+9" tile in a single row

#### Scenario: Phone width
- **WHEN** a card is shown at 390 px
- **THEN** Message and Make offer sit on one row of their own under the name, ⋯ stays at the top right, the thumbnails run 5 to a row, and the page doesn't scroll sideways

## MODIFIED Requirements

### Requirement: Posts from lists on Trade
`/trade` SHALL list one post per list whose owner turned its Show on Trade switch on (Show on Market on a sale list; see `web-lists`). A have or sale list SHALL appear only while it is bound to a Cosmo profile; a want list needs no profile. A have list and the want list linked to it SHALL form one post when both are on Trade. When only one of the pair is on Trade, the post SHALL hold only that list. The page SHALL be open to signed-out visitors.

Each post SHALL be tagged:
- WTT for a have list, alone or paired with its want list;
- WTB for a want list on its own;
- WTS for a sale list.

Each post SHALL show:
- the owner, headed the way For you heads a partner (the Cosmo nickname of the list's bound address whatever its Hide Cosmo ID setting, the shortened address when it has none, and the account's display name only for a list bound to no address; see `web-cosmo-link`), with the avatar;
- the tag, and each list's name and description;
- up to 11 objekts per side, with the number of further objekts;
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


### Requirement: Filters
The feed SHALL offer these filters, each kept in the URL:
- Type: All, WTT, WTB or WTS (`type`). All is the default.
- The shared collection filters used by Activity (artist, member, season, class, online/offline, collection number), under the same URL names: keep posts with at least one shown objekt from a matching collection.
- One collection (`slug`, a collection slug): keep posts with that collection on any side.
- Only matches (`matches=1`), a switch beside the Type tabs, off by default. On, it keeps only posts with at least one match to the viewer, counted the way the match line counts (see Matches to the signed-in viewer).

Only matches SHALL show only to a signed-in viewer with at least one list that takes part in Trade: a want list, or a have or sale list bound to a Cosmo profile. For anyone else `matches` SHALL be ignored.

The posts left out SHALL be left out by the server, so every page of the feed holds up to a full page of matching posts, newest bump first. The filters SHALL combine. With Only matches on and no matching post, the feed SHALL say that no posts match the viewer's lists and offer to turn Only matches off.

A filter value that does not parse SHALL be ignored.

#### Scenario: WTS only
- **WHEN** the viewer picks WTS
- **THEN** the URL carries `type=wts` and only sale-list posts are listed

#### Scenario: From the objekt drawer
- **WHEN** the viewer opens `/trade?slug=atom01-seoyeon-204z`
- **THEN** only posts with SeoYeon 204Z on a have, want or sale side are listed, and a removable chip names the collection

#### Scenario: Only matches
- **WHEN** a signed-in viewer with a want list holding SeoYeon 204Z turns Only matches on
- **THEN** the URL carries `matches=1`, a post whose have side holds SeoYeon 204Z stays, and a post that matches none of the viewer's lists is no longer listed

#### Scenario: Pages stay full
- **WHEN** only 1 of every 10 posts matches the viewer and Only matches is on
- **THEN** the first page still lists up to a full page of matching posts, newest bump first, and loading more continues from the last one

#### Scenario: Combined with a type
- **WHEN** the viewer turns Only matches on and picks WTB
- **THEN** only want-list posts asking for a collection on the viewer's bound have lists are listed

#### Scenario: Nothing matches
- **WHEN** Only matches is on and no post matches the viewer's lists
- **THEN** the feed says no posts match the viewer's lists, with a control that turns Only matches off

#### Scenario: No lists
- **WHEN** a signed-in viewer with no want list and no bound have or sale list opens `/trade?matches=1`
- **THEN** there is no Only matches switch and every post is listed

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each post SHALL count:
- how many collections on its have or sale side are on one of the viewer's want lists ("They have N you want");
- how many collections on its want side are on one of the viewer's have lists and still tradeable by the viewer, by the ownership rule above ("You have N they want").

The counts SHALL show in the card's match line (see Trade card), with Mutual N when both are above zero. Matched objekts SHALL be marked with a ring. The counts SHALL open a popover naming the viewer's lists they came from: the want lists for the first count and the have lists for the second, each linking to its list.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, as For you does (see `web-trade-for-you`), so an objekt the viewer keeps off their have lists never counts as offered. Browse SHALL offer Only matches (see Filters) but no Show or Compare with control: narrowing by direction or by one list is For you's job. A post whose owner is a Mutual only partner in the viewer's For you SHALL also carry a "See in For you" link after the match line, to `/trade/for-you?match=mutual&partner=<their id>`. The link SHALL show only for a partner For you lists under Mutual only.

The viewer's own posts SHALL not be listed in the feed. Posts by partners the viewer hid in For you SHALL also be left out.

#### Scenario: Default
- **WHEN** a signed-in viewer opens `/trade` with no parameters
- **THEN** posts of every type are listed with their match lines and rings, and Only matches is off

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post wants two collections that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Mutual partner
- **WHEN** rin.trades is listed under Mutual only in the viewer's For you
- **THEN** each of rin.trades's posts shows Mutual in its match line and a See in For you link to rin.trades's card in For you's Mutual only view

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the parameter is ignored and every post is listed

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match line, no rings, no For you links and no Only matches switch

#### Scenario: Hidden partner
- **WHEN** the viewer hid rin.trades in For you
- **THEN** rin.trades's posts are not listed for that viewer
