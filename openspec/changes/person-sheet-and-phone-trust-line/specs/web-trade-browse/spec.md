## MODIFIED Requirements

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
- **Strip**: a monospace role label in its list type's colour, with the number of objekts on that side, over one line of thumbnails 3.5rem wide. A strip SHALL never wrap: it shows as many thumbnails as fit its width, and when some don't fit, the last place holds a "+N" tile counting every objekt not shown. On Browse the tile links to the list. Sale prices show as a monospace caption under each thumbnail.
- **Actions**: Message, then Make offer as the primary button. An account that doesn't take messages from the viewer shows "Not taking messages" in their place.

**A Browse post** SHALL be a bordered card on the card surface, one post to a row at every width, laid out in one line where it fits:
- a byline column: the header, the post's type tags, and the updated or bumped time in monospace. The reputation line SHALL stay on one line, truncated with an ellipsis when it doesn't fit, its full text available to assistive technology. On Browse, the viewer's own posts SHALL carry a muted "You" tag after the name. A WTT post with only a want side SHALL also show a short muted note beside its tag, "Swaps only, not buying", saying the owner wants to trade, not buy;
- the sides, taking the remaining width:
  - a WTT post with both lists: the HAVE strip and the WANT strip side by side, sharing the width equally, with a ⇄ mark between them. When narrowing leaves one side with no related objekt, that side is the muted line Filters describes, under the other strip, which takes the whole width, with no ⇄ mark;
  - a post with one side (WTS, WTB, or half a pair): that one strip across the whole width;

  Side-by-side strips SHALL be top-aligned, so their labels sit on one line whatever each strip holds (prices, "none").
- the actions: Make offer and an icon-only Message with an accessible name;
- under the sides, one line holding the Lists control, the match chip and the All matches control, the last two styled as small outline buttons in the same type. A post holding two lists SHALL show the Lists control, reading "2 lists" and opening both lists, each with its name and description and linking to its list page. A post holding one list SHALL show no Lists control: its strip's role label SHALL link to the list page instead, with the list's name in its accessible name. The line SHALL be truncated with an ellipsis when it doesn't fit, and each list's full description SHALL stay available to assistive technology.

Below `md`, the post SHALL stack:
- a header: the avatar, the name, and under it one monospace line with the tag, the compact reputation and the time, with the ⋯ menu at its end. The compact reputation is:
  - for an account with no completed and no unfinished trades, a small muted "New" tag in place of "No verified trades yet";
  - otherwise the reputation line (see `web-verified-trades`) without its "since <month>" part: the verified count, the unfinished count when above 0, and the positive share when there is one ("No verified trades · 1 unfinished" for an account with only unfinished ones).

  The line SHALL wrap onto a second line when it doesn't fit, breaking between its parts (tag, reputation, time, note) and never inside one, and SHALL never be cut off. Its visible words SHALL be its accessible text, and the full reputation line stays in the person sheet, on the profile and in chat;
- each strip at full width, with the ⇄ mark between two strips turned to point down;
- the list line;
- the actions in one row: the icon-only Message, Make offer filling the remaining width, and All matches when the post has it.

The strips SHALL still not wrap.

Every row SHALL have the same layout whatever the number of objekts, so posts in the feed differ in height only by their number of sides and muted lines when stacked.

**A person sheet** is laid out in `web-trade-for-you`.

#### Scenario: Same partner on both tabs
- **WHEN** the viewer sees rin.trades's post on Browse and opens rin.trades's person sheet
- **THEN** both show the name, reputation line and ⋯ in the same order, the post's chip reads "Mutual 2 · they have 4 · you have 2", and the sheet's summary reads Mutual 2, 4 you want and 2 they want on the same mutual colour

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
- **THEN** each post stacks its header, HAVE strip, ⇄ pointing down, WANT strip, list line and actions, Make offer fills the actions row, each strip stays one line ending in "+N", and the page doesn't scroll sideways

#### Scenario: New account on a phone
- **WHEN** at 390 px a WTT post's owner has no completed and no unfinished trades, and the post was updated 2 days ago
- **THEN** its phone line reads WTT, a "New" tag and "Updated 2d ago", with nothing cut off

#### Scenario: Established account on a phone
- **WHEN** at 390 px a post's owner has 5 verified trades, 50% positive, since March 2025
- **THEN** its phone line reads WTT, "5 verified · 50%" and the time, without "since Mar 2025", and the person sheet still shows "since Mar 2025"

#### Scenario: Long line wraps on a phone
- **WHEN** at 390 px a WTT post's owner has 5 verified trades, 50% positive, and the post was bumped last week
- **THEN** its phone line reads "WTT · 5 verified · 50% ·" and, on a second line, "Bumped last week", with nothing cut off

#### Scenario: Own post on Browse
- **WHEN** the viewer's have list "spares" is on Trade and they open `/trade`
- **THEN** their post shows "You" after their name, and no Message or Make offer

#### Scenario: One list
- **WHEN** a WTS post holds one sale list "duplicates"
- **THEN** its line shows no Lists control, and its SALE label links to the "duplicates" list page

#### Scenario: Two lists
- **WHEN** a WTT post holds have list "spares" and want list "binary hunt"
- **THEN** its line shows "2 lists", opening both, each linking to its list page

#### Scenario: Twitter in the sheet
- **WHEN** rin.trades shows both Discord and Twitter, and the viewer sees their post and opens their sheet
- **THEN** the post's byline shows the Discord badge only, and the sheet shows both

#### Scenario: One-way post on For you
- **WHEN** on For you a post's owner has 3 collections the viewer wants and wants none of the viewer's
- **THEN** the post shows no match chip, its label reads "HAVE 3 you want", and All matches is shown

#### Scenario: Mutual post on For you
- **WHEN** on For you a post's owner has a mutual score of 2 with the viewer
- **THEN** the post shows the indigo chip "Mutual 2 · they have 14 · you have 2" before All matches
