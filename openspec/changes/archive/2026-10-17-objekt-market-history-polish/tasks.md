## 1. Messages

- [x] 1.1 Add `objekt_market_floor_trend` to `apps/web/messages/en.json` ("Floor trend"), `ja.json` ("最安値の推移") and `ko.json` ("최저가 추이") next to the other `objekt_market_*` keys. Verify that `bun run typecheck --filter=web` passes, which compiles Paraglide first.

## 2. History row and trend threshold (`features/objekt/drawer/market.tsx`)

- [x] 2.1 Add `TREND_MIN_RECORDS = 7`. Compute the Floor `change` and the `sparkline` only when the 30-day `points.length >= TREND_MIN_RECORDS`. Build the sparkline rows with `toRows(points, null, utcDate(now), …)` so they start at the first record, and drop the now-unused `rangeStart` import. Verify that, on a collection with fewer than 7 records, Floor shows no "0.0%".
- [x] 2.2 Replace the `flex … justify-between` div and its outline `Button` with one native `<button>` row styled like `OnTradeLine`: "History", then the detail (the "Floor trend" label and the sparkline, or the tracking text: "Tracking started …" when `snapshots === 1`, "Tracking since {date}" otherwise), then the caret. Give it `aria-expanded` and `aria-controls` pointing, via `useId`, to an id on the element wrapping the chart. Verify on the drawer from the screenshot (2 records, 13 and 14 Oct) that the row reads "History · Tracking since 13 Oct", that clicking anywhere on it toggles the chart, and that Tab plus Enter/Space toggle it too.
- [x] 2.3 Check the row at phone width (390px) in all three locales: the "Tracking started …" text wraps inside the row, the caret stays on the right, and there is no horizontal scroll. Then lower `TREND_MIN_RECORDS` to 2 locally to see the trend branch. Confirm the "Floor trend" sparkline fills its box and that clicking the sparkline itself opens the chart, then restore the constant to 7. Verify that `bun run lint`, `bun run typecheck --filter=web` and `bun run build --filter=web` pass.

## 3. Chart (`features/market/price-history-chart.tsx`)

- [x] 3.1 Set the price `YAxis` to `domain={[0, "auto"]}`. Verify on the 13–14 Oct collection that the axis shows no negative tick and the listing bars rise from the floor area's baseline. If the flat $1 line sits on the plot's top edge, switch the upper bound to `(max: number) => max * 1.2` and confirm the ticks stay round.
- [x] 3.2 Add `<ChartLegend content={<ChartLegendContent />} />` (from `@/components/ui/chart`, unmodified). Verify that it lists Floor, Median and Listings only, with no entry for the bridge line. If the plot looks cramped, raise `h-56` to `h-64` on the chart container, the chart's own skeleton, and the `WidgetBoundary` and `Suspense` skeleton in `market.tsx` together.
- [x] 3.3 Render the `ToggleGroup` only when `!locked`, and remove its items' `disabled` prop. Verify that a collection whose records span 7 days or fewer opens the chart with no range buttons, and that `bun run lint`, `bun run typecheck --filter=web`, `bun run test` and `bun run build --filter=web` pass.

## 4. Docs

- [x] 4.1 Confirm that no package `AGENTS.md` (root or `apps/web`) needs an update: this change alters no convention, trap or workflow. State that in the apply summary.

## 5. Review fixes

- [x] 5.1 Keep the chart wrapper mounted (`hidden` while closed) so `aria-controls` always resolves; show "Tracking started …" only when the lone record is today's; let the sparkline shrink (`min-w-0`, "History" `shrink-0`); give the price axis `padding={{ top: 12 }}`. Verify lint, typecheck, test and build pass.
