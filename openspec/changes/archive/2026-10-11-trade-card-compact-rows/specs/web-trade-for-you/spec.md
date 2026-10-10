## MODIFIED Requirements

### Requirement: Both directions and mutual-first ranking
Each partner SHALL be shown as a row in the list, built from the Trade card parts (see `web-trade-browse`). Each row SHALL sit on the card surface in a bordered box, with a gap between rows, so it reads apart from the page background. Rows SHALL be ordered by:
1. the smaller of the two counts (the mutual score), highest first;
2. then the sum of both counts;
3. then the partner's most recently updated matched list.

**Row header.** In one line from `sm` up: the avatar; the name with socials over the reputation line; the match chip; a monospace "N lists" button; the ⋯ menu; and a chevron button that opens and closes the row. The "N lists" button SHALL open a popover naming the partner's matched lists, each with its list type and linking to its list page. Below `sm`, the chip and "N lists" SHALL wrap under the name.

**Open and closed.** An active partner's row SHALL start open. An idle partner's row SHALL start closed (see Idle partners rank last). The chevron SHALL be a button with `aria-expanded` that names the partner. Opening or closing a row SHALL not move the rows above it. The state is per visit, not saved. A partner reached through a `partner=` link SHALL be opened.

**Row body.** It sits under the name, indented to line up with it. It SHALL hold two columns, side by side from `sm` up and stacked below:
- "They have, you want (N)";
- "You have, they want (N)".

Each column shows its matched objekts as 3rem-wide thumbnails, each with a monospace caption of at most two lines naming the collection. A column SHALL show at most 11 counted objekts, then a "+N" tile for the rest, and is left out when it has nothing counted and nothing not counted.

Objekts left out by the ownership rule SHALL follow the counted ones in their direction's column, at most 4 of them. Each is greyed, struck through in the destructive colour, and captioned with its reason ("no longer owned", "not transferable"). They SHALL not count toward N or the chip. When any are shown, the footer SHALL carry one line saying they are on the partner's or the user's list but aren't counted, and why.

**Row footer.** Hide partner as a ghost button, then the Trade card actions.

#### Scenario: Mutual beats one-sided
- **WHEN** partner A has 9 the user wants and wants 0 of the user's, and partner B has 2 and wants 2
- **THEN** under All, B is listed above A

#### Scenario: Matches without opening
- **WHEN** the user opens For you, and rin.trades (active) has 14 objekts the user wants and wants 2 of the user's
- **THEN** rin.trades's row is open, its chip reads `mutual 2 · 14 ⇄ 2`, and, without any click, the left column shows 11 of the 14 with a "+3" tile and the right column shows both of the 2

#### Scenario: No longer owned
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it
- **THEN** Mayu 203Z shows struck through after the counted objekts in "They have, you want", captioned "no longer owned", it isn't in the count, and the footer explains it

#### Scenario: Idle row
- **WHEN** jinsoul.blue is idle
- **THEN** their row is listed last, starts closed, shows "idle" in its header at full text contrast, and opens with its chevron

#### Scenario: Phone
- **WHEN** For you is shown at 390 px
- **THEN** each open row's two columns stack, the footer buttons wrap, and the page doesn't scroll sideways

### Requirement: Hide a partner
The user SHALL be able to hide a partner with the row's Hide partner button. A hidden partner SHALL not appear in For you or in the list-header counts. Not shown SHALL count hidden partners and let the user list them and unhide each one.

#### Scenario: Hide and unhide
- **WHEN** the user activates Hide partner on rin.trades's row, and later unhides them from Not shown
- **THEN** rin.trades disappears from the list at once, and returns after unhiding

### Requirement: Blocks and trade blocks
For you SHALL leave out partners the user blocked, partners who blocked the user, and partners under an active trade block. Not shown SHALL count the accounts the user blocked, separately from hidden partners. Each row's ⋯ menu SHALL offer Block and Report.

#### Scenario: Blocked partner
- **WHEN** the user has blocked 2 accounts
- **THEN** neither appears, and Not shown includes "2 blocked users"
