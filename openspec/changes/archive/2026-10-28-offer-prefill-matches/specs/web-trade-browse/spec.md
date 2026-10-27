## MODIFIED Requirements

### Requirement: Make offer on a post
Each row that shows Message SHALL also offer Make offer. It opens the offer builder for the person, addressed to the row's lead post's own list: the have list of a pair, or the post's only list. You get SHALL ask from all of the person's have and sale lists on Trade, as from a conversation, its picker opening on All their lists (see `web-trade-offers`).

The builder SHALL open with the viewer's matches with the person already added, swaps and sales alike, the ones the row counts under the current Compare with list (see `web-trade-offers` Matches added when the builder opens), and with none when the row has no match. Add SHALL open the full picker.

#### Scenario: From a WTT post
- **WHEN** a user activates Make offer on rin.trades's row, whose lead post is the have list "doubles" with the most matches, and rin.trades also has the sale list "spares" on Trade
- **THEN** the builder opens addressed to rin.trades, and You get's picker lists the entries of "doubles" and "spares"

#### Scenario: WTB post
- **WHEN** a user activates Make offer on a row whose only post is a WTB post wanting HaSeul 302Z open to swaps, and holds a sendable copy of it on a have list
- **THEN** the builder opens with that copy under You give and the line "Added 1 you give from your match", You give's picker lists the copy as picked, and You get's picker asks from the person's have and sale lists, or their collection when they have none

#### Scenario: Row with no match
- **WHEN** a user activates Make offer on a row with no header sentence, since nothing matches
- **THEN** the builder opens with nothing under You give or You get

## ADDED Requirements

### Requirement: Post menu
Each post on a person's row, on Browse and For you, SHALL carry a ⋯ menu: a ghost icon button in a column of its own at the post's top end, never inside a strip's label. Its accessible name SHALL be "More actions for the post {list}", where `{list}` is the post's own list (the have list of a pair). The menu SHALL offer Make offer on this post first, then Show all of {list} for each strip, which opens that strip's "+N" dialog whether or not it has the tile.

#### Scenario: Menu on a WTT post
- **WHEN** a user opens the ⋯ menu of rin.trades's post with the have list "doubles" and the want list "wants", on a row that also has the post "spares"
- **THEN** its button is named "More actions for the post doubles", and it offers Make offer on this post, Show all of doubles and Show all of wants

#### Scenario: Show all without a "+N" tile
- **WHEN** a strip shows all of its 5 objekts, so it has no "+N" tile, and the user chooses its Show all
- **THEN** the dialog of that list opens as the "+N" tile would open it, and closing it returns focus to the menu's button

#### Scenario: Phone
- **WHEN** a row is shown at 390 px
- **THEN** each post's ⋯ button stays inside the post in its own column, its target at least 24 px, and the strips stay one line without the page scrolling sideways

### Requirement: Make offer on one post
Make offer on this post SHALL go through the same sign-in gate as the row's Make offer (see `web-trade-offers` Matches of one post). It SHALL add the post's matches only when one of its strips counts a match, and otherwise open the builder empty, with no status line. It SHALL not mark which picks it added.

#### Scenario: Signed out
- **WHEN** a signed-out visitor chooses Make offer on this post
- **THEN** they are asked to sign in, as the row's Make offer asks, and no builder opens

#### Scenario: Post with no match
- **WHEN** a user chooses Make offer on this post on a post whose strips count no match
- **THEN** the builder opens empty, addressed to that post's list, with no status line

### Requirement: Where Make offer on one post shows
Make offer on this post SHALL be left out on the viewer's own posts and on a row that shows "Not taking messages". The menu then offers Show all only.

#### Scenario: One post on the row
- **WHEN** a user opens the ⋯ menu on mina.swaps's row, whose only post is the have list "extras"
- **THEN** it offers Make offer on this post and Show all of extras, as on a row of several posts

#### Scenario: Sell-only post
- **WHEN** a user opens the ⋯ menu of a WTS post on a Sell only sale list
- **THEN** it offers Make offer on this post and Show all, as on any other post

#### Scenario: Not taking messages
- **WHEN** the row shows "Not taking messages"
- **THEN** each post's menu offers Show all only

#### Scenario: Own post
- **WHEN** the viewer opens the ⋯ menu on one of their own posts
- **THEN** it offers Show all only
