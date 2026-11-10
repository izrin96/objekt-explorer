# Spec Delta

## MODIFIED Requirements

### Requirement: Person page
`/trade/@<handle>` SHALL show the person's Trade row as Browse draws it (see `web-trade-browse` Trade card), holding every post Browse keeps for them, under a Back to Trade control and with the Trade tabs hidden. Posts the viewer hid SHALL be held and counted as if they were not hidden (see Hidden post on the person and post pages). Counts SHALL be taken as on Browse, against all of a signed-in viewer's lists. The visitor's artist selection and filters SHALL not hide any post. The row SHALL carry no clear control.

#### Scenario: Four posts
- **WHEN** a signed-in viewer opens `/trade/@rin.trades`, and rin.trades has 4 kept posts
- **THEN** the page shows rin.trades's row with all 4 posts and the counts the row would show on Browse

#### Scenario: Artist selection
- **WHEN** a visitor with only ARTMS selected opens the page of someone whose posts hold only tripleS objekts
- **THEN** every post is shown

#### Scenario: Back to Trade
- **WHEN** the viewer activates Back to Trade
- **THEN** Browse opens at `/trade`

### Requirement: Nothing to show
When Browse would not list the person to this viewer (hidden, blocking or blocked, trade-blocked, nothing listed, all idle, all sold out), the person page SHALL show an empty state saying the person has nothing on Trade right now, with Back to Trade, and SHALL not show their row. Posts the viewer hid SHALL not count toward this: a person whose every post the viewer hid SHALL still show their row. On the viewer's own page the empty state SHALL instead be the owner's (see Owner's view).

#### Scenario: Hidden person
- **WHEN** the viewer opens the page of a person they hid
- **THEN** the empty state shows, with Back to Trade, and no row

#### Scenario: Every post hidden
- **WHEN** the viewer hid both of rin.trades's posts, so Browse no longer lists rin.trades, and opens `/trade/@rin.trades`
- **THEN** the page shows rin.trades's row with both posts, each offering Unhide post

#### Scenario: All idle
- **WHEN** a visitor opens the page of someone whose posts are all idle
- **THEN** the empty state shows

#### Scenario: Own page
- **WHEN** rin.trades, whose posts are all idle, opens `/trade/@rin.trades`
- **THEN** the page shows the owner's empty state, not "rin.trades has no posts on Trade right now"

## ADDED Requirements

### Requirement: Hidden post on the person and post pages
The person page and the post page SHALL show a post the signed-in viewer hid as they show any other post (see `web-trade-for-you` Hide a post). Its ⋯ menu SHALL offer Unhide post in place of Hide post, and Unhide post SHALL bring it back to Browse and For you. A post the viewer has not hid SHALL offer Hide post there as on Browse.

#### Scenario: Open a hidden post's page
- **WHEN** the viewer hid rin.trades's post "Binary dupes" and opens `/trade/@rin.trades/<its slug>`
- **THEN** the post is shown, and its ⋯ menu offers Unhide post

#### Scenario: Unhide from the person page
- **WHEN** the viewer activates Unhide post on that post on `/trade/@rin.trades`
- **THEN** the post is listed again on rin.trades's row on Browse
