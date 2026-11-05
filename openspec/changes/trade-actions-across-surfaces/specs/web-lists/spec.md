## MODIFIED Requirements

### Requirement: On Trade mark in the list header
A list header SHALL mark a list that is on Trade with an On Trade badge, for every visitor. The badge SHALL link to the page of the post the list is in (see `web-trade-person-pages` Post page), reached through the list's Cosmo profile, or its linked list's when the list has none; a list with neither SHALL link to `/trade`. The On Trade badge on the list's row SHALL link the same way. Neither link SHALL load the post page ahead of a click. After it, the header and the list's row on `/list` SHALL show the tags of the post the list is in, as Trade tags it (see `web-trade-browse`): its linked list joins the post when that list is on Trade too. A list off Trade SHALL show no tags, and no list SHALL name its Open to in words, since the post sets it.

#### Scenario: Visitor sees the mark
- **WHEN** a signed-out visitor opens a have list that is on Trade
- **THEN** the header shows the On Trade badge

#### Scenario: Either half of a Swap pair
- **WHEN** have list "spares" and want list "binary hunt", open to swaps or buying, are on Trade as one Swap post
- **THEN** both headers show On Trade, WTT and WTB

#### Scenario: Off Trade
- **WHEN** a want list set to Buying only is not on Trade
- **THEN** its header and its row on `/list` show no tag and no Open to

#### Scenario: Badge opens the post
- **WHEN** a visitor activates On Trade on have list "spares", bound to rin.trades's profile and in a Swap post with "binary hunt"
- **THEN** rin.trades's post page for "spares" opens, under rin.trades's handle

#### Scenario: Want half of a pair
- **WHEN** a visitor activates On Trade on want list "binary hunt", which has no profile and is linked to "spares"
- **THEN** the same post page opens, at the anchor's slug

#### Scenario: A want list with no profile
- **WHEN** a want list with no profile and no linked list is on Trade
- **THEN** its On Trade badge links to `/trade`

#### Scenario: Idle post
- **WHEN** a list is on Trade but its post is idle, and a visitor activates its On Trade badge
- **THEN** the post page opens and says the post is no longer on Trade
