# Tasks

## 1. Matcher (packages/api, pure)

- [x] 1.1 Add `AWAY_GRACE_HOURS = 24` to `packages/api/src/schemas/offer.ts`; `bun run lint`, `bun run typecheck` and `bun run build` pass for `@repo/api`
- [x] 1.2 In `trade-match.test.ts`, add failing tests: away and back after the accept stays `pending`; away for under 24h reads `pending` with `awaySince`; away 24h by `seenUntil` is `broken` dated when it left; null `seenUntil` never breaks; the token reaching the receiver from a third wallet after the accept verifies; a pre-accept early send returned by the receiver still doesn't verify; `nearMisses` ignores a copy sent after `awaySince`. Update the existing "after the accept breaks" and "sold before the accept" tests to pass a `seenUntil` past the grace. `bun test packages/api/src/lib/trade-match.test.ts` fails on the new cases only
- [x] 1.3 Change `matchLegs` to take `{ used, seenUntil }`, track the holder chain after the accept as in design decisions 1–3, and return `pending` with `awaySince`; make `nearMisses` end at `awaySince`. The tests from 1.2 pass, with lint, typecheck and build for `@repo/api`

## 2. Callers and data (packages/db, packages/api)

- [x] 2.1 Add nullable `away_at` (timestamptz) to `tradeLeg` in `packages/db/src/schema.ts` and generate the migration with `bun run --filter=@repo/db db:generate`; apply it to the local database only. The generated SQL adds one nullable column and nothing else; lint, typecheck and build pass for `@repo/db`
- [x] 2.2 `matchOpenLegs` takes `seenUntil` and passes it to `matchLegs`; `cancelTrade` passes null, since its lock reads only verified legs and held copies, which the grace doesn't change; `loadOpenLegs` and `LegRow` carry `away_at`. Typecheck passes across the repo
- [x] 2.3 Add the `away` trade event to `TRADE_EVENTS` with an optional `breaksAt` (ISO) in `tradePayloadSchema`; the trade read in `services/offer/trades.ts` returns `awayAt` and `breaksAt` for an open leg with `away_at`. Lint, typecheck and build pass for `@repo/api`

## 3. Worker (apps/worker)

- [x] 3.1 In `job/trade-verifier/index.ts`, pass `seen?.seenUntil` to `matchOpenLegs`, and count a newly reported or changed `awaySince` as deciding a trade, like a stuck change
- [x] 3.2 Add `recordAway` beside `recordStuck` under the trade's row lock: set `away_at` and note both parties with `away` and `breaksAt` when it is new or changed, clear it silently when the leg no longer reports it, skip ended trades. Lint, typecheck and build pass for `worker`, and `bun run test` passes

## 4. Web (apps/web)

- [x] 4.1 Add en/ko/ja messages: the `away` notification ("{objekt} left {name}'s wallet. The trade fails if it isn't back or delivered by {date}"), the leg card line, and the banner warning line for each party; `bun run --filter=web typecheck` (which compiles Paraglide) passes
- [x] 4.2 Render the `away` event in `features/offers/format.ts` and give it the warning tone in `features/notifications/tone.ts`; show the away line and its deadline on the leg card and as a warning line in `next-step-banner.tsx` without changing the state order in `next-step.ts`. Lint, typecheck and `bun run build --filter=web` pass
- [x] 4.3 Check `/trade/mine/$tradeId` and the notifications popover on the dev server against a local trade whose leg has `away_at` set, in en, ko and ja (local database only): the card and banner show the deadline, and the line disappears when `away_at` is cleared

## 5. Wrap-up

- [x] 5.1 Run `bun run check` and `bunx oxfmt --check` at the root; both pass
- [x] 5.2 Update `apps/worker/AGENTS.md` ("Trade verifier": breaks wait `AWAY_GRACE_HOURS` against `seenUntil`, and `away_at` mirrors `untransferable_at`); state that no other package's `AGENTS.md` changes

## Workflow follow-up

- Apply the migration to staging and production with the user's approval, before the worker that writes `away_at` deploys.
- Deploy web and worker together; on the first run, legs whose objekt is already away get `away_at` and one notice.
