## Why

When a collection has only a few days of price records, the objekt drawer's Market tab looks broken. The 30-day sparkline has no label and draws across a fixed 30-day window, so two recorded days come out as a short flat dash floating in empty space beside the History button. The Floor figure shows a "0.0%" change measured against a single day. The chart pads its price axis below zero ($-1), and the listing bars hang beneath the $0 line. It draws three series with no legend, and it shows 7, 30 and 90 day range buttons that cannot be used yet.

## What Changes

- **A trend needs 7 records.** The sparkline and the change under Floor appear only once the collection has 7 or more records in the last 30 days. Below that, the tab shows the tracking text instead: "Tracking started {date}; daily changes appear from tomorrow" with one record, "Tracking since {date}" with 2 to 6.
- **The sparkline is labelled and fills its box.** It reads "Floor trend" and runs from the first record in the 30-day window, not from the window's first day.
- **One History row.** The sparkline (or the tracking text) and the History toggle merge into a single bordered row in the same style as the "On Trade" row below it. The whole row opens and closes the chart, so the sparkline is part of the control and no lone button floats on the right.
- **The price axis starts at $0.** It is never negative, and the listing bars sit on the same baseline as the floor.
- **The chart has a legend:** Floor, Median, Listings.
- **The range control is hidden while it is locked.** While the records span 7 days or fewer, the chart shows All with no range buttons, rather than three disabled ones.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-market`: "Price history chart" changes to add the 7-record threshold for the sparkline and change, the sparkline label, the single History row, the $0 axis floor, the legend and the hidden range control.

## Routes

The objekt drawer's Market tab, wherever the drawer opens: `/`, `/market`, profiles, lists and `/trade`. The `/market` grid itself is unchanged.

## Non-goals

- Any server, `/rpc` or `/api/v1` change. `market.priceHistory` already returns the points and `tracking.snapshots`.
- The "Current floor vs {date}" line under the chart keeps its 2-record rule. It names its date, so a short comparison stays readable.
- The median line drawn over the floor when the two are equal. The legend and tooltip cover it.
- The `/market` grid's floor figures and filters.

## Impact

- `apps/web/src/features/objekt/drawer/market.tsx`: the History row, the thresholds and the Floor change.
- `apps/web/src/features/market/price-history-chart.tsx`: the axis domain, the legend and the hidden range control.
- `apps/web/messages/{en,ja,ko}.json`: one new message for the sparkline label.
