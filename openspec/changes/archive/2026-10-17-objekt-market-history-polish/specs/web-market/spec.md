## MODIFIED Requirements

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
