## 1. Pure window and tie order

- [x] 1.1 Add `apps/web/src/features/filters/listed-window.ts` with `LISTED_WINDOWS`, `ListedWindow`, `LISTED_WINDOW_SECONDS` and `isListedWithin` (design decision 2), and `listed-window.test.ts` with the cases in design decision 10. Verify `bun test apps/web/src/features/filters/listed-window.test.ts` passes, and lint, typecheck and build pass for `web`.
- [x] 1.2 In `search-schema.ts`, add `listed: z.enum(LISTED_WINDOWS).optional().catch(undefined)` (design decision 3). In `filter-utils.ts`, give `filterObjekts` the `nowSec` parameter and the window check after the floor range (design decision 4), and export `compareSupply(dir)` and use it in the `supply` branch of `sortObjekts` (design decision 5). Add `filter-utils.test.ts` with the cases in design decision 10. Verify `bun test` passes for `web`, and lint, typecheck and build pass for `web`.

## 2. Control, chip and messages

`apps/web/messages/{en,ko,ja}.json` may already hold entries from `market-price-history`: merge into the current contents and keep every existing entry.

- [x] 2.1 Add the five messages in design decision 9 to en, ko and ja. Add `LISTED_WINDOW_LABEL` to `features/filters/labels.ts` (design decision 2). Add `features/market/filter-listed.tsx` on `SingleSelect` (design decision 6). Verify lint, typecheck and build pass for `web`.
- [x] 2.2 Add `filter-listed` to `market-view.tsx`'s `extras` after floor, with `listedActive` in the memo's dependencies (design decision 7). Add the Listed chip to `buildChips` after the floor chip (design decision 8). Verify lint, typecheck and build pass for `web`, and that the dev console shows no facet parity warning on `/market`.
- [x] 2.3 Optional: add one line to the newest `CHANGELOG` entry in `components/layout/changelog.tsx`, or a new dated entry if the newest is older than this release: "Market: filter by when collections were listed (last 24 hours, 7 days or 30 days), and Most listed ties now go cheapest first." Verify lint, typecheck and build pass for `web`.

## 3. Verify

- [x] 3.1 Run `bun run check`, `bun run build --filter=web` and `bun run knip` (no new unused export or message). All pass.
- [ ] 3.2 Browser check on `/market` (read-only) at 1280 px and 390 px, light and dark. Record:
  - Last 24 hours, Last 7 days and Last 30 days each narrow the grid, and the counts never grow as the window shrinks;
  - the URL carries `listed=…` and the chip reads "Listed: Last 7 days";
  - removing the chip, and Reset, both clear `listed`;
  - `?listed=1y` shows no chip and an unnarrowed grid, and the next filter change drops it from the URL;
  - `?listed=24h&floor_max=5` shows both chips and only collections that pass both;
  - the footer total equals the sum of the shown cards' listing counts;
  - at 390 px the Listed control is in the Filters sheet, the badge counts it, and nothing overflows horizontally;
  - with Most listed, equal counts read cheapest first in both directions;
  - `/?listed=7d` leaves the home grid unchanged.

## 4. AGENTS.md

- [x] 4.1 State that no `AGENTS.md` changes: the root file and `apps/web/AGENTS.md` describe no filter internals this change alters, and `listed` follows the existing `priced` / `floor_*` pattern. Verify lint, typecheck and build pass for `web`.
