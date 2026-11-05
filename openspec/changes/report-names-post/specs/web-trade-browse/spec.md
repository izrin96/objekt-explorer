## MODIFIED Requirements

### Requirement: Post menu
Each post on a person's row, on Browse, For you and the person and post pages, SHALL carry a ⋯ menu: a ghost icon button in a column of its own at the post's top end, never inside a strip's label. Its accessible name SHALL be "More actions for the post {list}", where `{list}` is the post's own list (the have list of a pair). On another person's post, the menu SHALL offer Make offer on this post and Message about this post first, then Show all of {list} for each strip, which opens that strip's "+N" sheet whether or not it has the tile, then View post and Copy link, then, for a signed-in viewer, Report this post…, which opens the report dialog for the post's owner naming that post (see `web-moderation` Reports with a Trade post attached). On the viewer's own post it SHALL offer Edit post first, then Show all of {list} for each strip, then View post, Copy link and Take off Trade (see Owner actions on a post).

#### Scenario: Menu on a WTT post
- **WHEN** a signed-in user opens the ⋯ menu of rin.trades's post with the have list "doubles" and the want list "wants", on a row that also has the post "spares"
- **THEN** its button is named "More actions for the post doubles", and it offers Make offer on this post, Message about this post, Show all of doubles, Show all of wants, View post, Copy link and Report this post…

#### Scenario: Show all without a "+N" tile
- **WHEN** a strip shows all of its 5 objekts, so it has no "+N" tile, and the user chooses its Show all
- **THEN** the sheet of that list opens as the "+N" tile would open it, and closing it returns focus to the menu's button

#### Scenario: Phone
- **WHEN** a row is shown at 390 px
- **THEN** each post's ⋯ button stays inside the post in its own column, its target at least 24 px, and the strips stay one line without the page scrolling sideways

#### Scenario: Report this post
- **WHEN** a signed-in user chooses Report this post… on rin.trades's post "doubles"
- **THEN** the report dialog for rin.trades opens with a line saying the post "doubles" goes with the report, and closing it returns focus to the menu's button

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens the ⋯ menu of rin.trades's post "doubles"
- **THEN** it offers no Report this post…

### Requirement: Where Make offer on one post shows
Make offer on this post and Message about this post SHALL be left out on the viewer's own posts and on a row that shows "Not taking messages"; the menu then offers Show all, View post and Copy link, on another person's post for a signed-in viewer also Report this post…, and on the viewer's own posts also the owner's actions. For a person with no linked Cosmo profile, Make offer on this post SHALL show disabled with its reason as a second line, as on the row (see Make offer on a post), and Message about this post SHALL still show.

#### Scenario: One post on the row
- **WHEN** a user opens the ⋯ menu on mina.swaps's row, whose only post is the have list "extras"
- **THEN** it offers Make offer on this post, Message about this post and Show all of extras, as on a row of several posts

#### Scenario: Sell-only post
- **WHEN** a user opens the ⋯ menu of a WTS post on a Sell only sale list
- **THEN** it offers Make offer on this post and Show all, as on any other post

#### Scenario: Not taking messages
- **WHEN** the row shows "Not taking messages" to a signed-in viewer
- **THEN** each post's menu offers Show all, View post, Copy link and Report this post…

#### Scenario: Own post
- **WHEN** the viewer opens the ⋯ menu on one of their own posts
- **THEN** it offers Edit post, Show all, View post, Copy link and Take off Trade

#### Scenario: No Cosmo profile
- **WHEN** a signed-in user opens the ⋯ menu of a post by hana, whose account links no Cosmo profile
- **THEN** it offers Message about this post, a disabled Make offer on this post whose second line says hana hasn't linked a Cosmo profile, Show all, View post and Copy link disabled with their reason, and Report this post…
