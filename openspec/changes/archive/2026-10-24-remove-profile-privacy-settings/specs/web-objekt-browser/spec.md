# Spec Delta

## MODIFIED Requirements

### Requirement: Objekt drawer
Clicking a card SHALL open a drawer with the objekt's attributes, a link to view it in
Apollo, and these tabs in order: Owned, only when the viewer holds copies; Serials,
labelled Trades; Market; Holders; and Metadata. Serials SHALL let the user step to the
previous, next, first and last existing serial or type one, and for the chosen serial show
loading, then either a missing notice when
it has no owner, or the owner with the transfer timeline. Market SHALL show five live
figures: Floor, Listings, Sellers, Median and Highest. Floor SHALL carry its change over 30
days: the live floor against the first record of the last 30 days (see `web-market` Daily
price history), as an up or down arrow with the percentage to one decimal, in the success
colour when up and the destructive colour when down, with the direction in words for
assistive technology. Under the figures, a 30-day sparkline of the daily floor SHALL sit
beside a History toggle that opens the price history chart (see `web-market` Price history
chart). With fewer than 2 records in the last 30 days there SHALL be no change and no
sparkline; with no live floor there SHALL be no change. Market SHALL then list current listings, sortable by price or date.
Metadata SHALL show every collection field. Holders SHALL behave as the
`web-collection-holders` capability specifies, and SHALL fetch nothing until it is first
opened.

#### Scenario: Private serial
- **WHEN** the chosen serial belongs to an owner who hid serials before this change
- **THEN** the Serials tab shows the owner and the transfer timeline

#### Scenario: Step to next existing serial
- **WHEN** serial 5 does not exist and the user presses Next from serial 4
- **THEN** the field jumps to the next serial that exists

#### Scenario: Holders loads on first open
- **WHEN** the drawer opens on the Trades tab
- **THEN** no holders request is made until the user opens the Holders tab

#### Scenario: 30-day change
- **WHEN** a USD viewer opens the Market tab of a collection whose first record in the last 30 days has a $10 floor and whose live floor is $12
- **THEN** Floor reads "$12.00" with "▲ 20.0%" in the success colour, a screen reader announces it as up 20.0%, and a 30-day sparkline shows under the figures

#### Scenario: No history
- **WHEN** the viewer opens the Market tab of a collection with no record yet
- **THEN** Floor shows the live floor with no change, and there is no sparkline and no History toggle

