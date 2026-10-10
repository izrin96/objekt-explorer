## MODIFIED Requirements

### Requirement: Message a seller from the Market tab
Each listing row in the objekt drawer's Market tab SHALL offer Message, unless the viewer owns the listing, under the rules in `web-chat`. Message SHALL open the conversation with the list's owner, adding a card for that objekt and sale list.

Below `sm`, while the Market tab is shown, the drawer SHALL keep a bar at its bottom for the first listing in the tab's current order that shows Message. The bar names that listing: its price, its serial, and its seller. It offers Message and Make offer as two full-width buttons that act as that row's Message and Make offer do. The bar SHALL not cover the last row: the tab's content gains room for it. With no such listing, there is no bar. From `sm` up, there is no bar.

#### Scenario: From a listing
- **WHEN** a user activates Message on the #537 row of SeoYeon 204Z
- **THEN** the conversation with the list owner opens with a card for SeoYeon 204Z #537 and its price

#### Scenario: Own listing
- **WHEN** the viewer owns the sale list behind a row
- **THEN** that row has no Message action

#### Scenario: Phone bar
- **WHEN** a user at 390 px opens SeoYeon 204Z's Market tab, sorted by price, and the cheapest listing is rin.trades's #537 at 6,000 KRW
- **THEN** the bar reads "6,000 KRW · #537 · rin.trades" with Message and Make offer, and Make offer opens the builder with SeoYeon 204Z #537 under You get

#### Scenario: Own cheapest listing
- **WHEN** the cheapest listing is the viewer's own
- **THEN** the bar names the next listing the viewer can message instead

#### Scenario: Desktop
- **WHEN** the same drawer is open at 1280 px
- **THEN** there is no bar, and each row keeps its menu
