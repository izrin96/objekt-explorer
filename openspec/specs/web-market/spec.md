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

### Requirement: Daily price history
The server SHALL keep one record per collection per UTC day holding, in USD, the collection's floor price and median price, and its number of listings and of priced listings. Each figure SHALL be counted under the same rules as Market's floor: sale lists that are discoverable, listings with a collection, sellers without an active trade block or ban (see Trade-blocked sellers), and prices converted to USD through the server's rate table. QYOP and unpriced listings count toward the number of listings only.

The server SHALL record the current day at least once an hour. A day's record SHALL hold the last recording made that day, so today's record changes until UTC midnight. A collection with no priced listing at a recording SHALL have no record for that day: a record written earlier that day SHALL be removed. A recording made while the server has no currency rates SHALL write and remove nothing. Records for past days SHALL never change, whatever happens to the listings or sellers afterwards. No record SHALL be created for a day before the first recording.

The site SHALL read a collection's records for the last 7, 30 or 90 days or all of them, together with the date of the collection's first record and its number of records. A range of N days SHALL cover today and the N − 1 days before it. This read SHALL also be offered as `GET /api/v1/market/{collectionSlug}/history`.

#### Scenario: Blocked seller
- **WHEN** at a recording the cheapest priced listing of SeoYeon 204Z belongs to a trade-blocked account
- **THEN** that day's floor for SeoYeon 204Z is the next cheapest listing's price, and the blocked listing is not counted

#### Scenario: Delisted today
- **WHEN** a recording at 14:05 UTC wrote today's record for a collection, and its last priced listing is removed before the 15:05 recording
- **THEN** after the 15:05 recording the collection has no record for today, and its records for earlier days are unchanged

#### Scenario: No rates
- **WHEN** a recording runs while the server's rate table is empty
- **THEN** no record is written or removed

#### Scenario: Later sanction
- **WHEN** a seller whose listing set a collection's floor on 10 October is banned on 12 October
- **THEN** the 10 October record still holds that floor, and records from 12 October leave the listing out

### Requirement: Price history chart
Once a collection has a record, the drawer's Market tab SHALL show a History row under its figures. The whole row SHALL be one control that opens and closes a chart of the collection's daily records, shows its state through its caret and to assistive technology, and is styled like the tab's "On Trade" row. The chart SHALL draw the floor as an area, the median as a dashed line and the number of listings as bars. A legend SHALL name Floor, Median and Listings. The price axis SHALL start at zero, never show a negative amount, and leave room above its highest tick so a flat series does not run along the plot's top edge. A range control SHALL offer 7 days, 30 days, 90 days and All, starting on 30 days. Prices SHALL be plotted in the viewer's currency at today's rate, and the tooltip SHALL say the converted amounts are approximate, without marking each value.

Beside the chart the tab SHALL read "Tracking since {date}", the collection's first record, and, when the range holds 2 or more records, "Current floor vs {date}", with the change from the first record in the range to the live floor. With fewer than 2 records in the range the chart SHALL show no "Current floor vs" line. Today's point SHALL follow the latest recording until UTC midnight. A day with no record between two recorded days SHALL be drawn as a gap: no bar, and the floor joined across it by a faded dashed line that runs only over the gap's own days, never across a recorded day.

A trend needs 7 records. While the collection has fewer than 7 records in the last 30 days, the tab SHALL show no change under Floor and no sparkline. Instead, the History row SHALL read "Tracking started {date}; daily changes appear from tomorrow" when its only record was written today, and "Tracking since {date}", the collection's first record, otherwise. With 7 or more, the History row SHALL show a sparkline of the daily floor labelled "Floor trend", drawn from the first record in those 30 days to today, and Floor SHALL show the change from that first record to the live floor. While its records span 7 days or fewer, the range SHALL be All and the range control SHALL not be shown. The floor in the tab's figures SHALL always be the live floor, never a record.

#### Scenario: Day one
- **WHEN** a collection's only record was written today, 13 October, and the viewer opens its Market tab
- **THEN** Floor, Listings, Sellers, Median and Highest show live figures, there is no change and no sparkline, the History row reads "Tracking started 13 Oct; daily changes appear from tomorrow", and opening it shows the All range with no range control and no "Current floor vs" line

#### Scenario: Two days
- **WHEN** a collection has records for 13 and 14 October only, and the viewer opens its Market tab on 14 October
- **THEN** Floor shows no change, there is no sparkline, the History row reads "Tracking since 13 Oct", and opening it shows the chart with no range control

#### Scenario: One old record
- **WHEN** a collection's only record is from 2 September and the viewer opens its Market tab on 14 October
- **THEN** the History row reads "Tracking since 2 Sep", not "daily changes appear from tomorrow"

#### Scenario: Trend
- **WHEN** a collection has records on 9 days of the last 30, the first of them 2 October
- **THEN** the History row shows the "Floor trend" sparkline running from 2 October to today across its full width, Floor shows the change from the 2 October floor to the live floor, and pressing anywhere on the row opens the chart

#### Scenario: Flat price
- **WHEN** every record in the range has a floor of $1
- **THEN** the price axis runs from $0 upward with no negative tick, and the listing bars rise from the same baseline as the floor area

#### Scenario: Legend
- **WHEN** the viewer opens the chart
- **THEN** a legend under it names Floor, Median and Listings, and the faded line across a gap has no legend entry

#### Scenario: 7-day range
- **WHEN** a collection has records from 1 September to 13 October and the viewer picks 7 days
- **THEN** the chart shows 7 to 13 October, and reads "Current floor vs 7 Oct" with the change from the 7 October floor to the live floor

#### Scenario: Gap
- **WHEN** a collection has records for 1 and 4 October and none for 2 and 3 October
- **THEN** the chart has no bars on 2 and 3 October, and the floor runs from 1 to 4 October as a faded dashed line
