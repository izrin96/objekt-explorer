## MODIFIED Requirements

### Requirement: Nothing to show
When Browse would not list the person to this viewer (hidden, blocking or blocked, trade-blocked, nothing listed, all idle, all sold out), the person page SHALL show an empty state saying the person has nothing on Trade right now, with Back to Trade, and SHALL not show their row. On the viewer's own page the empty state SHALL instead be the owner's (see Owner's view).

#### Scenario: Hidden person
- **WHEN** the viewer opens the page of a person they hid
- **THEN** the empty state shows, with Back to Trade, and no row

#### Scenario: All idle
- **WHEN** a visitor opens the page of someone whose posts are all idle
- **THEN** the empty state shows

#### Scenario: Own page
- **WHEN** rin.trades, whose posts are all idle, opens `/trade/@rin.trades`
- **THEN** the page shows the owner's empty state, not "rin.trades has no posts on Trade right now"

### Requirement: Owner's view
The owner SHALL see their own row as on Browse: the "You" tag, no counts, no Make offer or Message, and each post's menu with the owner's actions (see `web-trade-browse` Owner actions on a post). The person page SHALL show Bump among the row's actions; a post page SHALL show Edit post, which opens the post composer for that post and returns to the page, Copy link, Take off Trade, which acts as Take off Trade in Your posts does, and Bump. Bump SHALL act as Your posts' Bump does, disabled and saying when the next bump is allowed while it is not.

When the row would not show (see Nothing to show), the owner SHALL see an empty state that says why and offers the fix, the first that applies: no posts, with New post; a trade block hiding their posts; every post idle, with Bump and a link to Your posts; otherwise, that their posts have nothing left to show, with a link to Your posts.

#### Scenario: Owner opens their post
- **WHEN** rin.trades opens `/trade/@rin.trades/<spares slug>`
- **THEN** the row carries the "You" tag, no counts, Edit post, Copy link, Take off Trade and Bump

#### Scenario: Owner opens their person page
- **WHEN** rin.trades, who bumped an hour ago, opens `/trade/@rin.trades`
- **THEN** the row shows Bump, disabled and saying the next bump is in 23 hours, and each post's menu offers Edit post and Take off Trade

#### Scenario: Every post idle
- **WHEN** rin.trades, whose 2 posts are both idle, opens `/trade/@rin.trades`
- **THEN** the page says their posts are idle and hidden from Browse until they bump, and offers Bump and a link to Your posts; after Bump the row shows both posts

#### Scenario: No posts
- **WHEN** a viewer with no posts opens their own person page
- **THEN** the page says they have no posts on Trade and offers New post

#### Scenario: Trade block
- **WHEN** an owner under a trade block opens their own person page
- **THEN** the page says their account has a trade block, which hides their posts from Trade, and offers no Bump

#### Scenario: Listed but nothing left
- **WHEN** an owner's only listed post is a have list whose every copy has left their profile
- **THEN** the page says their posts have nothing left to show on Trade and links to Your posts
