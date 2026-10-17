## MODIFIED Requirements

### Requirement: Person sheet
A signed-in viewer SHALL be able to open a person sheet from a post's All matches control (see `web-trade-browse`). The sheet shows everything that person matches with the viewer's lists, or with the lists Compare with names while Matches is on. It SHALL live in the URL as `person=<their user id>` on `/trade`. Closing it, or going back, SHALL remove the parameter and leave the feed where it was. For a signed-out visitor, `person` SHALL be ignored.

The sheet SHALL hold, in order:
- **Header**: the Trade card header (avatar, name with socials, reputation line, ⋯ with Hide, Block and Report). It is the sheet's visible title: the person's name SHALL show once. In the sheet the reputation line SHALL wrap rather than truncate. Under it, one monospace line SHALL read "updated <time ago>" (the most recent change to any of their matched lists), then "ownership checked <time ago>" (when these matches were worked out), separated by " · ". Any "also" names follow (see Partner identity).
- **Summary**: three equal cells in one row, in place of the match chip, from the same counts the person's chip uses (see Matches to the signed-in viewer):
  - "Mutual" with M, on the mutual colour when M is above zero and on a neutral surface otherwise;
  - "you want" with A, the "They have" count, in its direction's colour;
  - "they want" with B, the "You have" count, in its direction's colour.

  Numbers SHALL be monospace. The A and B cells SHALL move focus and scroll to their section. Each cell's accessible name SHALL be its full meaning ("Mutual 2", "They have 14 you want", "You have 2 they want").
- **"They have, you want" and "You have, they want"**, one under the other, each at the sheet's full width, at every width:
  - A section heading in its direction's colour, in monospace, with its count.
  - The section's counted objekts grouped by the person's list they came from, in the order of the person's matched lists (most matches first). Each group is headed by the list's type badge and the list's name linking to its list page: "from <list>" in They have, you want and "for <list>" in You have, they want. An objekt on more than one of their lists SHALL show once, under the first. When the section draws on one list, it has one group.
  - Thumbnails SHALL be 3rem wide and fill the row, each with a monospace caption of at most two lines: the member, then the collection number.
  - A section SHALL show at most 50 counted objekts, then a "+N" tile for the rest.
  - Below `md`, a section holding more than two rows SHALL show its first two rows, the last place holding a "+N" tile. Activating the tile SHALL show the rest of the section in place, up to the 50 above.
  - A section with nothing counted SHALL read 0 and "none".
  - Activating a thumbnail SHALL open the objekt drawer.
- **Not counted**: the objekts left out by the ownership rule (see Current ownership), after the groups in their direction's section. Each is greyed, struck through in the destructive colour, and captioned with its reason ("no longer owned", "not transferable"). When any is shown, one line SHALL say they are on their list or the viewer's but aren't counted, and why.
- **Actions**: Message and Make offer, or "Not taking messages" in their place (see Message a partner and Make offer to a partner). Below `md`, Message and Make offer SHALL share the footer's width equally.

The sheet SHALL no longer show a separate list of their matched lists, nor a separate "Ownership checked" line at its end.

From `md` up, the sheet SHALL open from the inline end of the window. Below `md`, it SHALL open from the bottom, at full width, and scroll on its own. Its accessible title SHALL be the person's name.

#### Scenario: Open from a post
- **WHEN** the viewer activates All matches on rin.trades's post, and rin.trades has 14 collections the viewer wants and wants 2 of the viewer's
- **THEN** the sheet opens with rin.trades's name shown once, the URL carries `person=<rin.trades's id>`, the summary reads Mutual 2, 14 you want and 2 they want, and "They have, you want" shows all 14 captioned thumbnails above "You have, they want" with 2

#### Scenario: Captions
- **WHEN** the viewer opens a sheet whose They have, you want section holds SeoYeon 201Z
- **THEN** its thumbnail is captioned "SeoYeon" over "201Z" in monospace

#### Scenario: Grouped by list
- **WHEN** rin.trades's have list "spares" holds 10 collections the viewer wants and their sale list "selling" holds 4 others
- **THEN** They have, you want shows a group "from spares" with 10 thumbnails, then a group "from selling" with 4, each list name linking to its list page

#### Scenario: Summary jumps to a section
- **WHEN** the viewer activates the "they want" cell
- **THEN** the sheet scrolls to You have, they want and focus moves to its heading

#### Scenario: Not counted
- **WHEN** Mayu 203Z is on rin.trades's have list, but the indexer shows rin.trades no longer owns it, and the viewer opens rin.trades's sheet
- **THEN** Mayu 203Z shows struck through after the groups in "They have, you want", captioned "no longer owned", it isn't in the count or the summary, and a line explains it

#### Scenario: Back closes the sheet
- **WHEN** the viewer opens a sheet from the 30th post and presses the browser's back button
- **THEN** the sheet closes, the URL loses `person`, and the feed is still scrolled to the 30th post

#### Scenario: Linked from an old For you link
- **WHEN** the viewer follows `/trade/for-you?match=mutual&partner=<rin.trades's id>`
- **THEN** Browse opens under Mutual with rin.trades's sheet open

#### Scenario: Compare with applies
- **WHEN** Compare with names have list "spares" linked to want list "binary hunt", and the viewer opens a person's sheet
- **THEN** the sheet counts only matches against "spares" and "binary hunt"

#### Scenario: No longer a match
- **WHEN** the viewer opens `/trade?person=<id>` for a person they hid
- **THEN** the sheet shows that person's header and says they have no matches with the viewer's lists

#### Scenario: Phone
- **WHEN** the viewer opens a sheet at 390 px, and They have, you want holds 14 objekts
- **THEN** it rises from the bottom at full width, the reputation line wraps instead of truncating, the section shows two rows with a "+N" tile in the last place, Message and Make offer each take half the footer, and the page doesn't scroll sideways

#### Scenario: Show the rest on a phone
- **WHEN** the viewer at 390 px activates the "+N" tile in They have, you want
- **THEN** the rest of the section's objekts show in place, and the tile is gone
