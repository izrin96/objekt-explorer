# Tasks

The code for groups 1 and 2 is already in the working tree, uncommitted. Apply checks each task against it and ticks it once its verification passes.

## 1. Server

- [x] 1.1 Add `fetchProfileMatches(viewerId)` to `packages/api/src/services/trade-feed/index.ts`, returning `{ want: Object.fromEntries(viewer.want) }` (design decision 1), and `profileMatches` to `packages/api/src/routers/trade.ts` on `authed` with `limitFeed`. Verify lint and typecheck pass for `@repo/api`.

## 2. Profile Collection tab

- [x] 2.1 Add `profileMatchesOptions(enabled)` to `apps/web/src/features/trade/queries.ts`, mirroring `marketMatchesOptions`. Verify lint and typecheck pass for `web`.
- [x] 2.2 Add `profile_matches_empty_hint` to `apps/web/messages/{en,ko,ja}.json`. Verify each file parses and `paraglide:compile` succeeds.
- [x] 2.3 In `collection-view.tsx`, gate with `canMatch` (design decision 5), narrow `filtered` before pin ordering (decision 2), render `ShowMyMatches` before the Discord button, show the skeleton while matches load and hide the grid on a refusal (decision 3), and show the empty state with Show all only once `hasNextPage` is false (decision 4). Verify lint, typecheck and build pass for `web`.

## 3. Verify

- [x] 3.1 Run `bun run check` and `bun run build --filter=web`. All pass.
- [x] 3.2 Browser check (read-only, signed in through `SMOKE_TEST1_*`) at 1280 px and 390 px. Record:
  - on someone else's profile, turning the toggle on shows a skeleton, then only transferable objekts of wanted collections, and the chip names the want lists behind them;
  - on a profile with no match, "Nothing here matches your lists" shows only after every page is in, and Show all restores the grid;
  - the toggle is absent on the viewer's own profile, signed out, at a checkpoint and on Spin;
  - at 390 px the toggle and chip fit the filter bar with no horizontal overflow.

## 4. AGENTS.md

- [x] 4.1 State that no `AGENTS.md` changes: the root file, `apps/web/AGENTS.md` and `packages/api/AGENTS.md` describe no Show my matches internals this change alters. Verify lint, typecheck and build pass for `web`.
