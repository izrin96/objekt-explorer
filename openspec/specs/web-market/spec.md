# web-market Specification

## Purpose
The marketplace view of `apps/web`: which collections are for sale, at what floor, in the
viewer's currency.

## Requirements

### Requirement: Priced collection grid
`/market` SHALL show the collection grid with, per collection, the number of listings and
a price label: the floor price when one exists, a QYOP marker when every listing is
quote-your-own-price, and nothing when unlisted. Sorting SHALL offer the market sorts
including floor price with unpriced collections last. A priced-only switch and a floor
range SHALL filter through the `priced`, `floor_min` and `floor_max` URL parameters.

#### Scenario: Floor range
- **WHEN** the user sets a floor range of 1 to 5 in their currency
- **THEN** only collections whose floor converts into that range remain and the URL carries `floor_min=1&floor_max=5`

#### Scenario: Unpriced last
- **WHEN** the sort is floor price descending
- **THEN** every priced collection precedes every unpriced one

### Requirement: Currency preference
Settings SHALL offer a currency select over the server's rate table, default USD, persisted
per browser. Every price on `/market` and in the drawer's Market tab SHALL be shown in that
currency using the server's rates.

#### Scenario: Switch to KRW
- **WHEN** the user selects KRW and returns to `/market`
- **THEN** price labels are in won and reload keeps KRW

### Requirement: Trade-blocked sellers
Market's collection grid, floor prices, listing counts and the drawer's Market tab SHALL leave out sale lists owned by accounts under an active trade block.

#### Scenario: Floor without the blocked seller
- **WHEN** the cheapest listing of a collection belongs to a trade-blocked account
- **THEN** the collection's floor is the next cheapest listing, and the blocked listing does not appear
