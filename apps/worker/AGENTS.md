# worker

`Bun.cron` jobs registered in `src/index.ts` (`job/`), plus one-off maintenance scripts in `src/script/`. Scripts run against the production `.env`, and only some are dry runs by default (`APPLY=1` to write), so read a script before running it. Pure logic goes in `src/lib/` beside its test (`serial-math.ts` is the model).

## Offline serials

Serials of objekts minted offline come from `populateSerialOffline` (`job/populate-serial.ts`), checked weekly by `job/verify-batch-boundaries.ts`. The model:

- Modhaus reserves token-id ranges per **batch**. A collection has many non-contiguous batches; the serial runs continuously across them, and an unminted token inside a reserved range still consumes a serial.
- From Atom02 on, batches are whole **100-token blocks** separated by one to three foreign tokens. Earlier seasons are listed in `preBlockSeasons` (`lib/serial-constants.ts`); Atom01 is scattered and outside the model.
- Discovery only sees minted tokens, so `refineBatches` fills reserved gaps and snaps lengths to whole blocks. Gap tokens come from the indexer database, not the Cosmo API.
- v1 serials are ground truth: an objekt minted before `V1_CUTOFF_MS` anchors its batch exactly. Batches with no such anchor (all of Summer26) are estimates.
- `objektNo` from the authenticated Cosmo API is visible only to the objekt's owner, so it is no general source of truth.
- Manual anchors are ground truth like v1 serials: reported `(tokenId, serial)` pairs in `collection.serial_anchors` that pin the batch their token sits in (v1 wins on the same token). Every serial write must pass them, and `computeOfflineSerials` / `computeOfflineSerialUpdates` take them as a required argument so a missed caller fails to type-check; only the holdout measurement in `refine-serial-batches.ts` passes `[]`, on purpose.
- Add, remove or list anchors with `script/serial-anchor.ts`; `add` and `remove` are a dry run until `APPLY=1`.

## Price history

`job/snapshot-price-history.ts` runs hourly at minute 5 and on startup. It writes only today's UTC rows of `collection_price_history`, never touches a past day, and skips the run when the rate table is empty. It reads and writes the app database only, so it runs outside `if (indexerWrites)`.
