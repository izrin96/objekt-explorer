## ADDED Requirements

### Requirement: Seller not taking messages on the Market tab
A Market tab listing row whose seller can't be messaged under the rules in `web-chat` (messages turned off, or, for a signed-in viewer, a block between the two) SHALL read "Not taking messages" as a muted line under the seller's name, in the words Trade rows use, wrapping rather than cut short. The row keeps its link to the sale list. A row whose seller takes messages, and the viewer's own listing, SHALL show no note.

#### Scenario: Seller with messages off
- **WHEN** a signed-in viewer opens SeoYeon 204Z's Market tab and rin.trades, who lists #537, has messages turned off
- **THEN** the #537 row reads "Not taking messages" under rin.trades, offers no Message or Make offer, and keeps its link to rin.trades's sale list

#### Scenario: Blocked seller
- **WHEN** the viewer has blocked the seller of a listing, or the seller has blocked the viewer
- **THEN** that row reads "Not taking messages", with no word of the block

#### Scenario: Seller taking messages
- **WHEN** the seller of a listing takes messages from the viewer
- **THEN** that row shows no note and keeps its menu with Message and Make offer

#### Scenario: Own listing
- **WHEN** the viewer owns the sale list behind a row
- **THEN** that row shows no note

#### Scenario: Signed out
- **WHEN** a signed-out visitor opens the Market tab and rin.trades has messages turned off
- **THEN** the #537 row reads "Not taking messages", as a Trade row does for a signed-out visitor

#### Scenario: Japanese
- **WHEN** a viewer using Japanese sees a row whose seller isn't taking messages
- **THEN** the row reads "メッセージを受け付けていません", as Trade rows do

#### Scenario: Narrow drawer
- **WHEN** the drawer is 360 px wide and a row shows the note
- **THEN** the note wraps within the seller's cell and reads in full, and the table is no wider than without it
