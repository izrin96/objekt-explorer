## MODIFIED Requirements

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
- **Strip**: a monospace role label in its list type's colour, with the number of objekts on that side, over one line of thumbnails 3.5rem wide. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting every objekt not shown. On Browse the tile links to the list; on For you it opens the row. Sale prices show as a monospace caption under each thumbnail.
- **Actions**: Message, then Make offer as the primary button. An account that doesn't take messages from the viewer shows "Not taking messages" in their place.

**A Browse post** SHALL be a bordered card on the card surface, one post to a row at every width, laid out in one line where it fits:
- a byline column: the header, the post's type tags, and the updated or bumped time in monospace;
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
- **THEN** both show the name, reputation line and ⋯ in the same order, and both chips read `mutual 2 · 4 ⇄ 2`

#### Scenario: Chip without a mutual score
- **WHEN** a post has 3 collections the viewer wants and wants none of the viewer's
- **THEN** its chip reads `3 ⇄ 0` on a neutral surface, and a screen reader announces "They have 3 you want"

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
