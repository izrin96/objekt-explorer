## MODIFIED Requirements

### Requirement: Matches to the signed-in viewer
For a signed-in viewer, each post SHALL count:
- how many collections on its have or sale side are on one of the viewer's want lists ("They have N you want");
- how many collections on its want side are on one of the viewer's have lists and still tradeable by the viewer, by the ownership rule above ("You have N they want").

The counts SHALL show in the card's match chip (see Trade card). Matched objekts SHALL be marked with a ring. The chip SHALL open a popover naming the viewer's lists the counts came from: the want lists for the first count and the have lists for the second, each linking to its list.

Matching SHALL use the viewer's have lists bound to a Cosmo profile, not everything their wallet holds, as For you does (see `web-trade-for-you`), so an objekt the viewer keeps off their have lists never counts as offered. Browse SHALL offer Only matches (see Filters) but no Show or Compare with control: narrowing by direction or by one list is For you's job. A post whose owner is a Mutual only partner in the viewer's For you SHALL also carry a "See in For you" link after the match chip, to `/trade/for-you?match=mutual&partner=<their id>`. The link SHALL show only for a partner For you lists under Mutual only.

The viewer's own posts SHALL not be listed in the feed. Posts by partners the viewer hid in For you SHALL also be left out.

#### Scenario: Default
- **WHEN** a signed-in viewer opens `/trade` with no parameters
- **THEN** posts of every type are listed with their match chips and rings, and Only matches is off

#### Scenario: Held but not on a have list
- **WHEN** the viewer holds SeoYeon 204Z but it is on none of their have lists, and a post wants it
- **THEN** SeoYeon 204Z is not ringed or counted on that post

#### Scenario: Which lists matched
- **WHEN** a post wants two collections that are on the viewer's have list "spares" and none on their other have lists
- **THEN** the post's popover names only "spares"

#### Scenario: Mutual partner
- **WHEN** rin.trades is listed under Mutual only in the viewer's For you
- **THEN** each of rin.trades's posts shows a mutual chip and a See in For you link to rin.trades's row in For you's Mutual only view

#### Scenario: Old link
- **WHEN** the viewer opens `/trade?match=mutual` from an older link
- **THEN** the parameter is ignored and every post is listed

#### Scenario: Signed out
- **WHEN** a visitor without a session opens `/trade`
- **THEN** posts are listed with no match chip, no rings, no For you links and no Only matches switch

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
- **Match chip**, for a signed-in viewer with at least one count above zero:
  - It reads `mutual M · A ⇄ B`, where A is "They have N you want", B is "You have N they want", and M is the smaller of the two.
  - When M is zero it reads `A ⇄ B` on a neutral surface.
  - Its numbers SHALL be monospace.
  - Its accessible name SHALL spell out both counts and the mutual score in words.
  - It SHALL open the popover of matched lists.
- **Actions**: Message, then Make offer as the primary button. An account that doesn't take messages from the viewer shows "Not taking messages" in their place.

**A Browse post** SHALL be a bordered card on the card surface:
- the header, with the post's type tags at its end;
- the list name, and its description clamped to one line;
- one strip per side. A strip is a monospace role label in the list type's colour (HAVE, SALE or WANT), then at most 10 thumbnails 2.5rem wide, wrapping onto further rows when the card is narrow, then a "+N" tile for the rest. Sale prices show as a monospace caption under each thumbnail;
- the match chip and any See in For you link;
- a footer with the updated or bumped time in monospace, an icon-only Message with an accessible name, and Make offer.

From `lg` up, posts SHALL sit two to a row, with the cards in a row sharing a height. Below `lg` there is one per row.

**A For you partner** is a row, laid out in `web-trade-for-you`.

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's post on Browse and rin.trades's row on For you
- **THEN** both show the name, reputation line and ⋯ in the same order, and both chips read `mutual 2 · 4 ⇄ 2`

#### Scenario: Chip without a mutual score
- **WHEN** a post has 3 collections the viewer wants and wants none of the viewer's
- **THEN** its chip reads `3 ⇄ 0` on a neutral surface, and a screen reader announces "They have 3 you want"

#### Scenario: Desktop grid
- **WHEN** the viewer opens `/trade` at 1280 px with 10 posts loaded
- **THEN** the posts sit in 5 rows of 2, and the feed keeps loading more as it scrolls

#### Scenario: One row at desktop width
- **WHEN** a post's have side holds 20 objekts and the viewer's window is 1280 px wide
- **THEN** its HAVE strip shows 10 thumbnails and a "+10" tile, wrapping to a second row where they don't fit one

#### Scenario: Phone width
- **WHEN** Browse is shown at 390 px
- **THEN** posts sit one per row, each strip wraps within the card, and the page doesn't scroll sideways

### Requirement: Trade colours
Trade cards on Browse and For you SHALL colour their type marks and direction headings (see `web-lists` List type colours):
- post tags, list badges and strip role labels take their list type's colour;
- on For you, the "They have, you want" heading is amber, the want colour, since it fills one of the viewer's want lists;
- the "You have, they want" heading is teal, the have colour, since it comes off one of the viewer's have lists;
- the match chip is indigo when it has a mutual score and neutral otherwise.

Cards, rows, buttons, avatars and backgrounds SHALL stay neutral, apart from the destructive strike on an objekt that isn't counted (see `web-trade-for-you`).

#### Scenario: A WTS post
- **WHEN** the viewer sees a WTS post that has 3 collections on the viewer's want lists
- **THEN** its WTS tag and SALE label are rose, and its chip reads `3 ⇄ 0` on a neutral surface

#### Scenario: Mutual partner
- **WHEN** a For you row's chip reads `mutual 2 · 14 ⇄ 2`
- **THEN** the chip is indigo, "They have, you want (14)" is amber and "You have, they want (2)" is teal
