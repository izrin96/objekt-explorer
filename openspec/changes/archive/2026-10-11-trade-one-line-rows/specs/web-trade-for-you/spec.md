## MODIFIED Requirements

### Requirement: Both directions and mutual-first ranking
Each partner SHALL be shown as a row in the list, built from the Trade card parts (see `web-trade-browse`). Each row SHALL sit on the card surface in a bordered box, with a gap between rows, so it reads apart from the page background. Rows SHALL be ordered by:
1. the smaller of the two counts (the mutual score), highest first;
2. then the sum of both counts;
3. then the partner's most recently updated matched list.

**Row line.** Laid out in one line where it fits, as a Browse post is:
- a byline column: the header (avatar, name with socials, reputation line, ⋯), the "updated" time and any "also" names;
- the two directions side by side, sharing the width equally, with a ⇄ mark between them, each a Trade card strip of its counted objekts:
  - "They have, you want" with its count;
  - "You have, they want" with its count;
- at the end: Make offer, an icon-only Message with an accessible name (or "Not taking messages" in their place), and a chevron button that opens and closes the row.
- under the two directions, one line holding the match chip, a monospace "N lists" button and, for an idle partner, the idle label, as a Browse post holds its list line.

A direction with nothing counted SHALL still hold its place, reading its label with 0 and "none". The "N lists" button SHALL open a popover naming the partner's matched lists, each with its list type and linking to its list page. Where the list is too narrow for the line, the row SHALL stack as a Browse post does, with the chevron staying beside the actions.

**Open and closed.** Every row SHALL start closed, active or idle, since its line already shows the matches. The chevron SHALL be a button with `aria-expanded` that names the partner, and a direction's "+N" tile SHALL open the row too. Opening or closing a row SHALL not move the rows above it. The state is per visit, not saved. A partner reached through a `partner=` link SHALL be opened.

**Open row.** Opening a row SHALL add, under the line:
- two columns, side by side from `sm` up and stacked below: "They have, you want (N)" and "You have, they want (N)". Each shows its matched objekts as 3rem-wide thumbnails, each with a monospace caption of at most two lines naming the collection. A column SHALL show at most 11 counted objekts, then a "+N" tile for the rest, and is left out when it has nothing counted and nothing not counted.
- Objekts left out by the ownership rule, following the counted ones in their direction's column, at most 4 of them. Each is greyed, struck through in the destructive colour, and captioned with its reason ("no longer owned", "not transferable"). They SHALL not count toward N, the strips or the chip.
- A footer: when any not-counted objekt is shown, one line saying they are on the partner's or the user's list but aren't counted, and why; the idle hint for an idle partner; and Hide partner as a ghost button.

#### Scenario: Mutual beats one-sided
- **WHEN** partner A has 9 the user wants and wants 0 of the user's, and partner B has 2 and wants 2
- **THEN** under All, B is listed above A

#### Scenario: Matches without opening
- **WHEN** the user opens For you, and rin.trades (active) has 14 objekts the user wants and wants 2 of the user's, and the "They have" strip has room for 6 thumbnails
- **THEN** rin.trades's row is closed, its chip under the strips reads `mutual 2 · 14 ⇄ 2`, and its line shows 5 thumbnails and a "+9" tile under "They have, you want 14" beside both thumbnails under "You have, they want 2"

#### Scenario: Open a row
- **WHEN** the user activates the chevron on rin.trades's row
- **THEN** the full columns appear under the line, showing 11 of the 14 with a "+3" tile and both of the 2, with collection captions, and Hide partner in the footer

#### Scenario: No longer owned
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it, and the user opens the row
- **THEN** Mayu 203Z shows struck through after the counted objekts in "They have, you want", captioned "no longer owned", it isn't in the count or the strip, and the footer explains it

#### Scenario: One direction empty
- **WHEN** jinsoul.blue has 3 objekts the user wants and wants none of the user's
- **THEN** the row's line shows the "They have, you want 3" strip beside "You have, they want 0" reading "none"

#### Scenario: Idle row
- **WHEN** jinsoul.blue is idle
- **THEN** their row is listed last, starts closed like every row, shows "idle" in the line under its strips at full text contrast, and opens with its chevron

#### Scenario: Link to a partner
- **WHEN** the user follows a See in For you link to `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** rin.trades's row is open, scrolled to and highlighted

#### Scenario: Phone
- **WHEN** For you is shown at 390 px
- **THEN** each row stacks its byline, the two strips and the actions, each strip stays one line, an open row's columns stack, and the page doesn't scroll sideways
