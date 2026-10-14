## Context

See proposal.md (Why) and the `web-market` delta (the "Price history chart" requirement). Everything changes in two client files. `MarketPanel` (`features/objekt/drawer/market.tsx`) already fetches the 30-day history (`priceHistoryOptions(slug, "30d")`). From it the panel derives the sparkline rows, the Floor change and `tracking` (`since`, `snapshots`, which counts records of every age). `PriceHistoryChart` (`features/market/price-history-chart.tsx`) is lazy-loaded and owns the range control, the axes and the footer. `rangesLocked` and `rangeStart` live in `@repo/api/schemas/price-history` and stay unchanged.

## Goals / Non-Goals

**Goals:**
- One threshold, 7 records in the last 30 days, gates both the sparkline and the Floor change, so the two always appear together.
- The History row is a single disclosure control, styled to match `OnTradeLine` right below it.

**Non-Goals:**
- A new shared "row" component. Two rows share the look, which is not enough to justify one.
- Changing `components/ui/chart.tsx`. It is vendored and used as it is.

## Decisions

**Threshold source: the 30-day `points.length`, not `tracking.snapshots`.**
The sparkline and the change both read the 30-day points, so the gate counts the same data they draw. `snapshots` counts records of every age: a collection with 40 old records and 2 recent ones would pass it and still draw a dash. The text choice below the threshold uses `tracking`: "Tracking started …" only when `snapshots === 1` and `since` is today (UTC), since its "daily changes appear from tomorrow" is false for a lone old record; anything else gives "Tracking since {tracking.since}". It is a local constant in `market.tsx` (`TREND_MIN_RECORDS = 7`). It is not shared with the API, because only this panel uses it.

**The sparkline starts at its first record.**
`toRows(points, null, today, …)` replaces `toRows(points, rangeStart("30d", now), …)`. The points are already limited to 30 days, so the line still never reaches past 30 days, but it now fills its box. That is also why the label reads "Floor trend" and not "Floor · 30d": the line can cover fewer than 30 days. The sparkline keeps its `w-30` width but takes `min-w-0`, so on a narrow row it shrinks instead of pushing into the caret; the "History" label is `shrink-0`. It stays decorative (`aria-hidden`), and the visible label carries the meaning.

**The History row is a native `<button>` styled like `OnTradeLine`, not `Button`.**
`Button` is a fixed-height inline control. The row needs to span the full width with a label, a detail and a trailing caret, exactly like the `OnTradeLine` link (`rounded-lg border px-3 py-2 text-sm`, `hover:bg-secondary/60`, `focus-visible:ring-2`). Its layout:
- Leading: "History" (`m.objekt_market_history()`).
- Detail (muted, `text-xs`): with 7 or more records, the "Floor trend" label followed by the sparkline. Otherwise, the tracking text. It sits in a `min-w-0` span that may wrap at phone width, because "Tracking started …" is long in all three locales.
- Trailing: `CaretDownIcon` or `CaretUpIcon`.

The button carries `aria-expanded` and an `aria-controls` that points, through `useId`, to a wrapper that stays mounted (`hidden` while closed), so the reference never dangles; the chart inside it mounts only while open. `Collapsible` was not used: its panel would add a second state source for one boolean the panel already owns. Because the sparkline sits inside the button, pressing it toggles the chart. There is no second control.

**The price axis is `domain={[0, "auto"]}`.**
Recharts' `"auto"` lower bound pads below a flat series, which is how −$1 appears. Pinning the lower bound to 0 is also right for an area chart, whose fill already runs to 0. The count axis starts at 0 too, so the bars share the baseline. A flat $1 series then tops out exactly on its highest tick ($0, $0.25 … $1), on the plot's top edge, so the axis takes `padding={{ top: 12 }}`. A multiplied upper bound (`max * 1.2`) was rejected: Recharts' nice ticks for [0, 1.2] are 0.3, 0.6, 0.9, and for [0, 2.2] 0.55, 1.1, 1.65.

**The legend uses `ChartLegend` with `ChartLegendContent` from the vendored `chart.tsx`.**
`ChartLegendContent` already drops `type === "none"` entries, and the bridge `Line` sets `legendType="none"`, so the bridge needs no extra work. The swatches are squares for all three series, which is acceptable. The legend renders inside the `h-56` container, so the plot loses about 24px. If that looks cramped, raise the container, the `Suspense` skeleton and the `WidgetBoundary` height together to `h-64`.

**The range control renders only when `!locked`.**
The `disabled` prop on the items goes, since locked items are no longer rendered.

**New message: `objekt_market_floor_trend`.**
en "Floor trend", ja "最安値の推移", ko "최저가 추이", following the existing `objekt_market_floor` wording.

## Risks / Trade-offs

- [Short histories show "Tracking since {date}" in both the History row and the chart footer while the chart is open] → Accepted. The footer stays per the spec, and the row's text is what the closed state needs.
- [Pinning the axis at $0 flattens small moves on a high-priced collection, e.g. $40 to $42] → Accepted. Objekt floors are low, and a zero-based area is the honest scale. The tooltip gives exact values.
- [A collection with 7 or more records spread thinly over 30 days draws a broken sparkline] → Accepted. `sparklinePath` already breaks the line at missing days, as it does today.
