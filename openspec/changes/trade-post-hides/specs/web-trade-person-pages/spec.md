## MODIFIED Requirements

### Requirement: Hidden post on the person and post pages
The person page and the post page SHALL show a post the signed-in viewer hid as they show any other post (see `web-trade-for-you` Hide a post). Its ⋯ menu SHALL offer Unhide post in place of Hide post, and Unhide post SHALL bring it back to Browse and For you. A post the viewer has not hid SHALL offer Hide post there as on Browse.

#### Scenario: Open a hidden post's page
- **WHEN** the viewer hid rin.trades's post "Binary dupes" and opens `/trade/@rin.trades/<its slug>`
- **THEN** the post is shown, and its ⋯ menu offers Unhide post

#### Scenario: Unhide from the person page
- **WHEN** the viewer activates Unhide post on that post on `/trade/@rin.trades`
- **THEN** the post is listed again on rin.trades's row on Browse

#### Scenario: A post hidden through its other list
- **WHEN** the viewer hid rin.trades's Buy post "Looking for", rin.trades then paired it with "Binary dupes", and the viewer opens that post's page
- **THEN** the post "Binary dupes · Looking for" is shown, its ⋯ menu offers Unhide post, and Unhide post lists it again on Browse
