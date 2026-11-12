# Tasks

## 1. Pairs from a hidden post

- [x] 1.1 Add `hidesOfSql` and `hiddenPostAtSql` to `packages/api/src/services/trade/lists.ts`, with `inHiddenPostSql` built on the first. In `job/want-alerts/pairs.ts`, keep a pair from a hidden post when its entry is newer than the hide and return `hidden`. Verified against the local database with temporary hide rows (older hide: flagged; newer hide: excluded), and lint, typecheck and build pass for `worker` and `@repo/api`.

## 2. Unhide

- [x] 2.1 Add `selectUnhides` to `apps/worker/src/lib/want-alert-match.ts`, sharing `tradable` with `judge`, with tests for both directions, alerts off, Can swap, not owned, already held and one unhide per list. Verified by `bun test apps/worker/src/lib/want-alert-match.test.ts`, and lint and typecheck pass for `worker`.
- [x] 2.2 `recordRun` deletes the hides before the alerts, in the same transaction, leaving hides made after the run began; `index.ts` passes them, merges their unowned pairs into `recheck` and counts them in the hourly line. Verified by running the delete locally inside a rolled-back transaction, and lint and typecheck pass for `worker`.

## 3. Copy and docs

- [x] 3.1 Add the sentence to `trade_hidden_description` in en, ko and ja; update `apps/worker/AGENTS.md` (Want alerts) and `packages/api/docs/trade.md` (Partner rules, hidden and idle posts). Verified by lint, typecheck and build passing for `web`.

## 4. Check

- [x] 4.1 Read-only verified against the local database with temporary hide rows, removed afterwards: for a hand-added entry that is a real match, a hide older than the entry flags its pairs and `selectUnhides` over the loaded context names exactly the hider and the partner list; a hide newer than the entry excludes the pairs; a rule entry stays excluded; the delete matches the row inside a rolled-back transaction. The job was not run whole, since a run moves the local cursor and writes alerts. `bun run check` passes for every package, and `web` and `worker` build.

## Workflow follow-up

- Rebuild the worker on the VPS after the web deploy.
- Archive the change once it is reviewed.
- Move "Bring a hidden post back when its content changes" out of `design/backlog.md`.
