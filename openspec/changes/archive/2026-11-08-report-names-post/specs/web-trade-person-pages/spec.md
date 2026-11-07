## MODIFIED Requirements

### Requirement: Post page
`/trade/@<handle>/<slug>`, where the slug is a post's anchor list (the have or sale list of a pair, else its only list), SHALL show the person's row holding only that post, outlined, and below it "Show N more posts from <name>", which adds the rest in the row's order. The header's counts SHALL still count the whole person. The row's Make offer SHALL open the builder addressed to that post's anchor list, with that post as its matches' post, Message SHALL attach that post's card, and the row menu's Report… SHALL name that post (see `web-moderation` Reports with a Trade post attached).

#### Scenario: One post of three
- **WHEN** a visitor opens `/trade/@rin.trades/<spares slug>`, and rin.trades has 3 kept posts
- **THEN** only the "spares" post shows, outlined, with "Show 2 more posts from rin.trades" below it

#### Scenario: Make offer on the post
- **WHEN** a signed-in viewer activates Make offer on the post page of rin.trades's "spares" post, though another post leads rin.trades's row on Browse
- **THEN** the builder opens addressed to "spares"

#### Scenario: Message on the post
- **WHEN** a signed-in viewer activates Message on that page
- **THEN** the conversation opens with a post card for "spares"

#### Scenario: Report on the post
- **WHEN** a signed-in viewer chooses Report… in the row's ⋯ menu on the post page of rin.trades's "spares" post
- **THEN** the report dialog says the post "spares" goes with the report, and the report names it
