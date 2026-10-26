# worker

`Bun.cron` jobs registered in `src/index.ts` (`job/`), plus one-off maintenance scripts in `src/script/`. Scripts run against the production `.env`, and only some are dry runs by default (`APPLY=1` to write), so read a script before running it. Pure logic goes in `src/lib/` beside its test (`serial-math.ts` is the model).

From `@repo/api`, import only modules whose import chain stays clear of `env.ts`. `env.ts` validates the web app's whole `serverEnv` (Discord, S3, SES and more) as it loads, and the worker container has none of those, so the worker dies on start. `services/redis` imports it, and so does every module that imports `services/redis`, such as `services/currency-rates`. Before importing an `@repo/api` service, follow its imports. Read such tables directly with `db`, as `update-currency-rates` and `snapshot-price-history` do.

## One run at a time

Register every cron job through `safeRun(tag, job)` in `src/index.ts`, with the job's kebab-case log tag: it runs the job under the Valkey lock `worker:lock:<tag>`, so a second worker, or a slow run overlapping its next tick, skips. A shutdown frees the locks of jobs still running. The trade verifier takes its own lock and passes `{ lock: false }`. A long-lived subscription that must run on one worker only goes through `whileLeader` (`src/lib/redis-lock.ts`), as the activity relay does.

## Logging

Jobs log only through `log(tag)` (`src/lib/log.ts`). A run that changed something logs one `info` summary; a run that changed nothing stays silent. Per-item lines go to `debug`, shown only with `WORKER_LOG_LEVEL=debug`. A job running every few minutes adds its counts to a `heartbeat`, which logs one line an hour. Drift and failures that retry on their own are `warn`, one line per run with a count; a failed job, or a failure only a person can fix (an expired Cosmo refresh token), is `error`. `src/script/` prints to the console, since its output is the point.

## Offline serials

Serials of objekts minted offline come from `populateSerialOffline` (`job/populate-serial.ts`), checked weekly by `job/verify-batch-boundaries.ts`. The model:

- Modhaus reserves token-id ranges per **batch**. A collection has many non-contiguous batches; the serial runs continuously across them, and an unminted token inside a reserved range still consumes a serial.
- From Atom02 on, batches are whole **100-token blocks** separated by one to three foreign tokens. Earlier seasons are listed in `preBlockSeasons` (`lib/serial-constants.ts`); Atom01 is scattered and outside the model.
- Discovery only sees minted tokens, so `refineBatches` fills reserved gaps and snaps lengths to whole blocks. Gap tokens come from the indexer database, not the Cosmo API. The indexer lacks a token id Cosmo assigned to another collection but never minted on chain, so `refineBatches` also takes `knownForeign` separators; the weekly verifier passes the tokens Cosmo reported foreign (its edge probes and `discoveryBoundaries` of the rediscovered batches).
- v1 serials are ground truth: an objekt minted before `V1_CUTOFF_MS` anchors its batch exactly. Batches with no such anchor (all of Summer26) are estimates.
- `objektNo` from the authenticated Cosmo API is visible only to the objekt's owner, so it is no general source of truth.
- Manual anchors are ground truth like v1 serials: reported `(tokenId, serial)` pairs in `collection.serial_anchors` that pin the batch their token sits in (v1 wins on the same token). Every serial write must pass them, and `computeOfflineSerials` / `computeOfflineSerialUpdates` take them as a required argument so a missed caller fails to type-check; only the holdout measurement in `refine-serial-batches.ts` passes `[]`, on purpose.
- Add, remove or list anchors with `script/serial-anchor.ts`; `add` and `remove` are a dry run until `APPLY=1`.

## Price history

`job/snapshot-price-history.ts` runs hourly at minute 5 and on startup. It writes only today's UTC rows of `collection_price_history`, never touches a past day, and skips the run when the rate table is empty. It reads and writes the app database only, so it runs outside `if (indexerWrites)`.

## Trade verifier

A wrong copy's deadline, like expiry, stall reminders and the away grace, is due against `seenUntil`, never the clock, so an asked-for objekt sent before the deadline but read late still verifies the leg first. A specific leg whose objekt left the giver breaks only once `seenUntil` is `AWAY_GRACE_HOURS` past the move (`matchLegs`); until then `recordAway` keeps `away_at` as `recordStuck` keeps `untransferable_at`: set with one `away` note per move, cleared silently when the objekt is back. Every automatic accept (deadline, expiry, break) goes through `acceptPicked` in `copy-deadlines.ts`, so the notes and progress stay the same whichever path accepts. A pending copy with a null `accept_by` gets its deadline from the worker the first time it sees the copy, not from the migration, so a copy recorded before the deploy still gets its full window after it.

`offerUpkeep` keeps `offer_item.sent_at` in step with the early send `itemStillHeld` counts (`earlySend`): `sentChanges` (`lib/offer-sent.ts`) sets it when the send appears and clears it when the objekt is back with its giver, which leaves the offer open. Both writes skip offers no longer open.

## Want alerts

`job/want-alerts` keeps its progress (cursor and state) in the `worker_progress` row `want-alerts`, saved in the same transaction as the alerts (`recordRun`), on every run. A worker reads and writes progress only in the database it alerts on, so a local worker can never move production's cursor. A missing row is a first run: it sets the cursor to `max(id)` and announces nothing already listed. Unreadable progress stalls the job with an error and never starts over.

The floor (`overlapFloor`) anchors on the previous run: the newest mark at or before the newest mark's time minus 10 minutes, so a gap between runs never shortens the late-commit window. `keepMarks` keeps marks by age with one-minute spacing and never cuts the anchor; a count cap would drop it in a crash loop.

Which partner lists may alert comes from `@repo/api`, the same as For you: `tradePartnerSql` (hidden, blocks, trade block) and `listedCte` (not idle) in `pairs.ts`. Change a partner rule there, never in the worker. An entry left out only because its owner cannot trade it yet (`unowned` from `selectAlerts`) goes into the state's `recheck` with the time it was first left out. Every run reads those entries again and keeps them for 24 hours, at most 20,000, dropping the oldest with a `warn` (`nextRecheck`).

Each alert type is Off, Any or Can swap (`notification_pref.match`, null reading as Can swap). For recipients on Can swap, `mutualQuestions` collects, per recipient and alert list, the partners that pass every other check. The job asks `mutualPartnerIds` (`@repo/api/services/trade-matches/recount`, For you's Mutual read live) over the lists that alert's link opens (`resolveCompareSides`), so the alert and the page agree. It runs four at a time, and a failed call counts as not mutual for that run, with one `warn`. That module is kept clear of `services/redis`, so keep it that way. `selectAlerts` alerts only the mutual partners and returns the rest as `notMutual`, which goes into the state's separate `mutualRecheck`: 24 hours, at most 5,000, so it never pushes out an `unowned` entry. A Sell only sale-list pair under Can swap is dropped without a recheck; a sale list that takes swaps (`takes_swaps`) is asked about like a have list. Each alert writes its choice to `payload.match`, which picks the link it opens.

## Want-list rules

`job/refresh-list-rules.ts` runs every 10 minutes and on startup. It re-expands every rule against the indexer's collections and its owner's holdings through `@repo/api/services/list-rules/expand` (env-free; keep it so), reading each described collection set and each owner's addresses once per run, and `bumpTradeVersion` the owners whose entries changed. It never touches `lists.updated_at`: the feed reads that as the owner's edit, so a refresh would keep an idle post listed and show it as updated. Unchanged rules write nothing.
