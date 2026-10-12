## MODIFIED Requirements

### Requirement: Both directions and mutual-first ranking
Each partner SHALL be shown as a row in the list, built from the Trade card parts (see `web-trade-browse`). Each row SHALL sit on the card surface in a bordered box, with a gap between rows, so it reads apart from the page background. Rows SHALL be ordered by:
1. the mutual score, highest first. It counts trades only: the smaller of the collections on the partner's have lists that are on the user's want lists, and the collections on the user's bound have lists, still tradeable, that the partner's want lists ask for. Sale lists, the partner's or the user's, SHALL never count toward it, though they count toward the two direction counts as before;
2. then the sum of both direction counts;
3. then the partner's most recently updated matched list.

The row's match chip SHALL show the two direction counts and this mutual score, worded as the Trade card defines (see `web-trade-browse`), and SHALL read the same as the chip on that partner's Browse posts.

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

The help beside the Show control SHALL describe the mutual score as counting trades only, with sale listings counting one way.

#### Scenario: Mutual beats one-sided
- **WHEN** partner A has 9 the user wants and wants 0 of the user's, and partner B has 2 on a have list and wants 2 on the user's bound have list
- **THEN** under All, B is listed above A

#### Scenario: Sale listings don't make a partner mutual
- **WHEN** partner C's sale list holds 3 collections on the user's want list (open to Trade or buy) and C's want list asks for 2 on the user's bound have list, and partner D has 1 on a have list and wants 1 on the user's bound have list
- **THEN** under All, D is listed above C, D's chip reads "Mutual 1 · they have 1 · you have 1", and C's chip reads "They have 3 you want · you have 2 they want" on a neutral surface

#### Scenario: Matches without opening
- **WHEN** the user opens For you, and rin.trades (active) has 14 objekts on have lists that the user wants and wants 2 of the user's bound have list, and the "They have" strip has room for 6 thumbnails
- **THEN** rin.trades's row is closed, its chip under the strips reads "Mutual 2 · they have 14 · you have 2", and its line shows 5 thumbnails and a "+9" tile under "They have, you want 14" beside both thumbnails under "You have, they want 2"

#### Scenario: Open a row
- **WHEN** the user activates the chevron on rin.trades's row
- **THEN** the full columns appear under the line, showing 11 of the 14 with a "+3" tile and both of the 2, with collection captions, and Hide partner in the footer

#### Scenario: No longer owned
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it, and the user opens the row
- **THEN** Mayu 203Z shows struck through after the counted objekts in "They have, you want", captioned "no longer owned", it isn't in the count or the strip, and the footer explains it

#### Scenario: One direction empty
- **WHEN** jinsoul.blue has 3 objekts the user wants and wants none of the user's
- **THEN** the row's line shows the "They have, you want 3" strip beside "You have, they want 0" reading "none", and the chip reads "They have 3 you want"

#### Scenario: Idle row
- **WHEN** jinsoul.blue is idle
- **THEN** their row is listed last, starts closed like every row, shows "idle" in the line under its strips at full text contrast, and opens with its chevron

#### Scenario: Link to a partner
- **WHEN** the user follows a See in For you link to `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** rin.trades's row is open, scrolled to and highlighted

#### Scenario: Phone
- **WHEN** For you is shown at 390 px
- **THEN** each row stacks its byline, the two strips and the actions, each strip stays one line, an open row's columns stack, and the page doesn't scroll sideways

### Requirement: Filters
The view SHALL offer a Show control: Everyone, Mutual only, They want what I have, and They have what I want. Everyone is the default. Mutual only keeps partners whose mutual score (trades only, see Both directions and mutual-first ranking) is above zero; a partner matched both ways only through sale lists SHALL not be kept. The one-way views keep counting sale lists. The view SHALL also offer a Compare with control naming one of the user's have, sale or want lists, each option tagged with its list type. The named list replaces the user's side only in its own direction:
- for a have or sale list, "they want what I have" counts only that list's entries;
- for a want list, "they have what I want" counts only that list's entries.

The other direction keeps using all of the user's lists of the other type, so a list's Mutual only partners also trade back against the user's other lists.

A one-way Show compares one kind of list, so Compare with SHALL offer only that kind: have and sale lists under They want what I have, want lists under They have what I want. Its All option SHALL name the kind ("All my have and sale lists"). Choosing a Show that the selected list does not apply to SHALL reset Compare with to All. Under the controls, one line SHALL say what is compared, naming the selected list or all lists, and only the side a one-way Show uses.

The filters SHALL live in the URL (`match`, `list`), beside `partner`, which only scrolls to that partner's card and highlights it, and does nothing when that partner is not in the current results. A `list` value that is not one of the user's have, sale or want lists, or not of the kind the Show compares, SHALL be ignored, and all lists used.

#### Scenario: Default filter
- **WHEN** the user opens `/trade/for-you` with no parameters
- **THEN** Everyone is selected, and every partner is listed, mutual ones first

#### Scenario: Sale-only partner under Mutual only
- **WHEN** partner C matches the user both ways, but every collection C has that the user wants is on C's sale list
- **THEN** C is listed under Everyone and They have what I want, and not under Mutual only

#### Scenario: One-way Show offers one kind of list
- **WHEN** the user selects They want what I have
- **THEN** Compare with offers only their have lists, under "All my have lists", and a selected want list resets to it

#### Scenario: One have list, still mutual
- **WHEN** the user filters to have list "spares", and a partner wants a collection on Spares and has a collection on their have list that is on the user's want list "binary hunt"
- **THEN** the partner is listed under Mutual only, and "they want what I have" counts only the Spares entries

#### Scenario: Foreign list slug
- **WHEN** the URL's `list` is the slug of another account's list
- **THEN** all of the user's lists are used and Compare with shows All my lists
