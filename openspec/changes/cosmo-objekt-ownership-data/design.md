# Design

## Context

See proposal.md, Why. This change builds on `cosmo-qr-collection-media` (shipped and deployed, not archived). "Earlier change, Decision N" means that change's design.md.

### What Cosmo returns per objekt

Measured on production on 2026-11-17, read-only, with the owner's own connected session; no value was printed.

- Each `collections[]` item of `GET /bff/v3/objekt-summaries` is `{collection, count, objekts[]}`. Each `objekts[]` entry holds:
  - `metadata`: `objektNo` (number, the serial), `transferable` (boolean), `tokenAddress` (hex), `collectionId` (string), `tokenId` (number), `artist.{category, name}`;
  - `inventory`: `status` (`"minted"` on every entry seen), `acquiredAt`, `updatedAt`, `mintedAt` (ISO), `mintedAtDay` (number), `usedForGrid` (boolean), `lenticularPairTokenId` (number), `owner` (hex), `objektId` (number);
  - `nonTransferableReason` (string, absent when transferable; seen: `challenge-reward`, `welcome-objekt`).
- The owner's 182 objekts against the indexer: serial matched on 181 (one Cream02 Double off by 1, an offline estimate); `transferable` matched on all 182. The owner reports `transferable` wrong for other accounts' objekts. `usedForGrid` was true on 12, all non-transferable challenge rewards.
- Sessions have died 1 to 2.75 hours after connecting without a sign-out; another lived through 35 minutes, an egress IP change and opening the app. Lifetime is still being measured.

### Our code

- **The sync.** `job/collection-media.ts` pages every artist of each due session (earlier change, Decision 10): at most 50 requests a run, one at a time, about 1 to 1.5 s apart, under `safeRun("collection-media")` inside `if (indexerWrites)`. `recordPage` merges each page into `collection_media`, then the apply phase writes the indexer. `objektSummariesSchema` (`packages/cosmo/src/session-parse.ts`) parses each item alone and drops `count` and `objekts`.
- **Serials.** Offline serials (`on_offline = 'offline'`, plus `preAssignedCollections` in `apps/worker/src/lib/serial-constants.ts`) minted at or after `V1_CUTOFF_MS` are computed from `collection.serial_batches` by `computeOfflineSerials`. A batch with no v1 serial and no anchor is an estimate, chained from the batch before (`apps/worker/docs/offline-serials.md`). Online serials are mint order; v1 serials are authoritative.
  - Anchors are `collection.serial_anchors` (`{tokenId, serial, note, addedAt}[]`). `script/serial-anchor.ts` checks one with `checkManualAnchor`, then writes the anchors and `computeOfflineSerialUpdates` through `writeSerialUpdates` in one indexer transaction.
  - `populateSerialOffline` only revisits collections that hold a serial 0, so a new anchor changes nothing unless its writer rewrites the serials.
  - Populate, the 15-minute drift pass and the weekly verifier all run under the `serial-offline` job lock; the script takes none.
  - `anchoredSerialIds` (`packages/api/src/services/objekt/serial-anchored.ts`) treats any range holding an anchor as exact, and the verifier never probes an anchored batch.
- **Transferability.** The indexer reads `isObjektTransferable` at mint, and a later on-chain change (`transferability_update`: `token_id`, `transferable`, `block_number`, `applied_at`, no timestamp) sets the value on an existing objekt. A change at or before the read block that says false wins over a true read (`transferableAfterRead`), since such objekts never move. Cosmo-spin's objekts are false by design (`job/cosmo-spin.ts`). `fix-transferability.ts` writes the chain value under three guards: compare-and-set, not spin, and no `transferability_update` above its pinned final height; its pure helpers are in `lib/transferability-check.ts`. `job/collection.ts` settles unapplied updates on existing objekts.
- **The estimate mark.** Trade surfaces (offer builder, chat cards, My trades, the trade page) mark a post-cutoff serial with "~" through `isSerialEstimated(mintedAt, anchored)` (`@repo/lib/serial`). `anchored` comes from `anchoredSerialIds(ids)` (`packages/api/src/services/objekt/serial-anchored.ts`), one indexer query per 500 ids that treats a token as anchored when its stored batch also holds a pre-cutoff serial or a manual anchor. Its callers are `services/offer/verify.ts`, `services/offer/picker/*` and `services/chat/cards.ts`. The `web-trade-offers` requirement "Estimated serials are marked" defines it.
- **Account paths.** Disconnect is `disconnectSession`, a ban or an account anonymize or delete revokes through `revokeSessionsOf` (`packages/api/src/services/cosmo-session/sessions.ts`, called from `services/account/anonymize.ts`), and the worker's `deleteLongDead` deletes session rows dead for 30 days.
- **Databases.** The app and indexer databases cannot join (`packages/api/AGENTS.md`). The local `.env.local` indexer is production with `default_transaction_read_only=on`, so every local indexer write fails.

## Goals / Non-Goals

**Goals:**

- No Cosmo request beyond those the sync already sends.
- Every indexer write comes from the job that already owns that column, under that column's existing guards: serials from the `serial-offline` job lock holder, `transferable` with `fix-transferability`'s guards. Nothing but the manual script writes `collection.serial_anchors`.
- A per-objekt row records Cosmo's view of a token, never who holds it: no user id, session id, nickname or address.
- Everything recorded is permanent: a token's Cosmo serial (an anchor once it passes the trust rules), its Cosmo-confirmed transferability, its grid use and non-transferable reason, and the serials and corrections written from them. Grid use and the reason are stored, not shown, in this change.
- Indexer writes converge: run twice, they change nothing more; after an indexer rebuild, the stored reads put the corrections back (Risks, An indexer rebuild).
- Every write path ships behind an off-by-default switch, with a read-only plan script the owner runs first.

**Non-Goals** (design level; product scope is in the proposal):

- Rediscovering ranges or refitting grids when a confirmed serial arrives (Decision 5, Ranges).
- Back-filling objekts no live session holds.
- A per-holder history of grid use or non-transferable reasons.

## Decisions

### 1. Same pages, same job

The per-objekt data rides on `recordPage` in `job/collection-media.ts`. It adds no request, cursor, budget or backoff of its own.

- A separate job would either read the same pages again (doubling Cosmo load) or need the sync to hand pages over, with nothing gained.
- The transferable check runs in the job's apply phase, which runs every 5 minutes even while the sync backs off from Cosmo.
- Confirmed serials are the exception (Decision 5): the serials they move are written by the `serial-offline` job lock holder.

### 2. Parsing `objekts[]` (`packages/cosmo/src/session-parse.ts`)

`objektSummariesSchema` keeps `count` and gains `objekts` per collection. Each entry parses on its own with `summaryObjektSchema`, so a malformed objekt costs one `skippedObjekts` and never its collection's media.

`summaryObjektSchema` keeps only these fields:

| Field | From | Rule |
| --- | --- | --- |
| `tokenId` | `metadata.tokenId` | positive safe integer, kept as a decimal string |
| `objektNo` | `metadata.objektNo` | positive integer |
| `collectionId` | `metadata.collectionId` | string |
| `transferable` | `metadata.transferable` | boolean |
| `nonTransferableReason` | `nonTransferableReason` | kept when it matches `^[a-z0-9-]{1,64}$`; else `"other"`; absent → `null` |
| `usedForGrid` | `inventory.usedForGrid` | boolean, absent → `false` |
| `owner` | `inventory.owner` | `^0x[0-9a-fA-F]{40}$`, lowercased |
| `status` | `inventory.status` | string |

Everything else is dropped as it parses: `acquiredAt`, `mintedAt`, `mintedAtDay`, `updatedAt`, `lenticularPairTokenId`, `objektId`, `tokenAddress` and `artist`. `owner` and `status` are only compared while recording (Decision 4), never stored.

- **Dates.** The chain already gives `objekt.minted_at` and `received_at`, and `acquiredAt` describes the holder, not the token.
- **Lenticular pair.** Nothing on the site would show it, and its meaning on a non-lenticular objekt (0, or the token's own id?) is unverified. A follow-up can add a column once a reader exists.
- **`artist.category`.** Not needed: which serials are estimates is decided by the indexer's collection (Context, Serials), not by Cosmo's category.

### 3. Two tables (app database): `cosmo_objekt` and `cosmo_transferable`

**`cosmo_objekt`**: one row per token, Cosmo's latest read of it, kept for good (Decision 7).

| Column | Type | Notes |
| --- | --- | --- |
| `token_id` | `varchar(20)` PK | CHECK `token_id ~ '^[0-9]+$'`; matches `objekt.id` |
| `slug` | `varchar(255) NOT NULL` | `slugifyObjekt(collectionId)`, the indexer's own mapping |
| `objekt_no` | `integer NOT NULL` | CHECK `> 0`; Cosmo's serial, permanent |
| `transferable` | `boolean NOT NULL` | the latest read's raw value |
| `non_transferable_reason` | `varchar(64)` | CHECK `~ '^[a-z0-9-]+$'`; stored, not shown in this change |
| `used_for_grid` | `boolean NOT NULL` | stored, not shown in this change |
| `chain_height` | `integer NOT NULL` | the indexer's final height read before the page (Decision 4) |
| `observed_at` | `timestamptz NOT NULL` | when the page was read |
| `serial_eligible` | `boolean` | the trust rules of Decision 5; null until judged |
| `serial_due` | `boolean NOT NULL DEFAULT true` | the serial step has yet to rewrite its collection with this read |
| `serial_checked_at` | `timestamptz` | |
| `transferable_due` | `boolean NOT NULL DEFAULT true` | the apply has yet to judge this read |
| `transferable_outcome` | `text` | CHECK in the list of Decision 6 |

Indexes: `cosmo_objekt_confirmed_idx` on `(slug) WHERE serial_eligible`, which loads one collection's confirmed serials (Decision 5); `cosmo_objekt_serial_due_idx` on `(slug) WHERE serial_due`; `cosmo_objekt_transferable_due_idx` on `(observed_at) WHERE transferable_due`.

**`cosmo_transferable`**: one row per token, the Cosmo-confirmed transferable value, kept for good.

| Column | Type | Notes |
| --- | --- | --- |
| `token_id` | `varchar(20)` PK | CHECK `token_id ~ '^[0-9]+$'` |
| `transferable` | `boolean NOT NULL` | the value the worker wrote to, or found in, `objekt.transferable` |
| `observed_at` | `timestamptz NOT NULL` | the confirming read's time |
| `chain_height` | `integer NOT NULL` | the indexer final height that read was judged against |
| `received_at` | `timestamptz NOT NULL` | the indexer's `objekt.received_at` at the judgement |
| `confirmed_at` | `timestamptz NOT NULL` | when the apply stored it |
| `superseded_at` | `timestamptz` | set when a newer chain change outranked it (Decision 6) |
| `superseded_block` | `integer` | that change's `block_number`; CHECK both superseded columns null or both set |

Neither table has a foreign key, and no column names a user, session or address.

- **Why the app database.** It matches `collection_media` (earlier change, Decision 8): what connected accounts reported survives an indexer rebuild, after which the stored reads write their corrections again. It adds nothing to tables the indexer owns, and needs no indexer migration or indexer restart. The cost is one extra app read in the estimate mark (Decision 8).
- **Why the app table is the anchor store.** One row per token holds any number of confirmed serials with no list to rewrite, the serial job loads a collection's in one index scan, and an indexer resync leaves them in place, so the next rewrite of each collection anchors on them again. The indexer's `collection.serial_anchors` stays the operator's hand-kept list, and `objekt` gains no column.
- **Why a separate permanent table for confirmed values, not columns in `cosmo_objekt`.** `cosmo_objekt.transferable` is overwritten by every read, including reads later judged `moved` or `chain_newer`. A confirmed value must hold only what passed every guard, so it has its own writer (the apply step's outcome statement, never the per-read upsert), its own lifecycle (replaced by a newer confirming read, superseded by a newer chain change) and its own readers (`fix-transferability`, the plan script). A separate row keeps the per-read `ON CONFLICT` from ever touching it, lets `fix-transferability` read it by id with no other columns, and keeps it whatever later happens to the read rows (the rollback's contract migration drops `cosmo_objekt` only).
- **Why no owner column.** Without it the tables cannot say who held what. Staleness uses the chain instead: a read is current while the indexer's `objekt.received_at` is at or before `observed_at` (Decision 6, guard 1). At read time the sync keeps only entries whose `inventory.owner` is the session's own address (Decision 4), so every row was the signer's at `observed_at`.
- **Why a table at all.** `transferable` and grid use could live on `objekt`, but those columns are the indexer's, and Cosmo's view must stay apart from the corrected value so a later chain change can be weighed against it.
- **Why due flags.** The table can reach millions of rows. A partial index on a boolean keeps "what is new" one index scan, where `collection_media`'s read-everything apply would not scale.

### 4. Recording

In `recordPage`, after the collection merge, the page's objekts become rows through the pure `observationsOf(objekts, sessionAddress, indexerObjekts, chainHeight, observedAt)` (`apps/worker/src/lib/cosmo-objekts.ts`). It returns the rows and counts by reason:

- `inventory.status` other than `"minted"` → skipped (`not_minted`);
- `owner` other than the session's lowercased `cosmo_address` → skipped (`other_owner`): Cosmo's view of another account's token is not what this session vouches for;
- the indexer holds the token under another owner → skipped (`holder_mismatch`): Cosmo and the chain disagree on who holds it, so the read is stale on one side;
- two entries with one `tokenId` → the later one is kept (`duplicate`).

**The holder check.** `indexerObjekts` comes from one indexer read per page (`select o.id, o.owner, o.minted_at, c.slug, c.on_offline from objekt o join collection c on c.id = o.collection_id where o.id = any($1)`), so a page costs one indexer read and one app write; the same read gives `serialEligible` its inputs (Decision 5). A token the indexer does not have yet is kept: its `serial_eligible` stays null for the serial step, and the transferable step reports it `missing`. The check compares the read's holder with the indexer's holder at record time, and `received_at <= observed_at` (Decision 6, guard 1) covers a move after it, so neither path stores an address.

**Chain height.** `syncPhase` reads `select max(height)::int from squid_processor.status` once, before its first Cosmo request, and passes it to every page of the run. Every chain change at or below that height was indexed before Cosmo was asked, so Cosmo's answer is at least as new (Decision 6). When the read fails or returns null, the run records no objekts (counted), and collection media still records.

**The write.** One statement per page: `INSERT … SELECT FROM unnest(…) ON CONFLICT (token_id) DO UPDATE`, which:

- sets `slug`, `objekt_no`, `transferable`, `non_transferable_reason`, `used_for_grid`, `chain_height` and `observed_at`;
- sets `transferable_due = true` on every read, so each read is judged again;
- sets `serial_due = true` only when `objekt_no` or `slug` changed, and `serial_eligible` as Decision 5 says. A serial is the token's for life, so a read that repeats it is not new work, and an operator's exclusion is never undone (Decision 5).

It never touches `cosmo_transferable`.

**Failure isolation.** The holder read and the upsert sit in their own try/catch inside `recordPage`, after the media merge. A failure counts the page's objekts as `record_failed`, logs one `warn` per run with the count, and lets the sync go on: the media is recorded, the cursor moves, and the session is never parked for it. Those objekts are recorded on the session's next sync.

**Load.** Each page of 30 collections adds one indexer read and one app statement, so a full run adds at most 50 of each. The run's `info` summary gains `objekts recorded N`; the skip counts go to the heartbeat. `count` versus `objekts.length` per item is counted as `partial` at `debug` (Open questions).

**Old consent.** Sessions connected under the earlier consent text (Decision 9) record from the deploy on. Production held only the owner's own account when this was written; task 9.1 checks that before the deploy.

### 5. Confirmed serials as anchors

"Anchor" is this project's own concept (`collection.serial_anchors`, Context, Serials), not a Cosmo term: Cosmo supplies only `objektNo`. A **confirmed serial** is a `cosmo_objekt` row whose `serial_eligible` is true. The app table is the store of these anchors: nothing is copied into `collection.serial_anchors`, and no column is added to the indexer's `objekt`. Manual anchors stay in the jsonb list, written only by `script/serial-anchor.ts`.

**Which reads count (`serial_eligible`).** The trust rules are filters on the row, judged by the pure `serialEligible(read, indexerObjekt)` (`apps/worker/src/lib/cosmo-objekts.ts`). True when all hold:

- the holder check passed at the read (Decision 4; a row exists only then);
- the token is in the indexer, in the collection the read names (the indexer's `collection.slug` equals the row's `slug`);
- that collection is offline or in `preAssignedCollections`;
- the token was minted at or after `V1_CUTOFF_MS`.

False when any fails: online and v1 serials are compared by the plan script, never used. Null when the token is not in the indexer yet: the serial step judges it again later. `objektNo` is the token's serial whoever holds it, so staleness does not apply. Recording judges eligibility from its one indexer read per page, extended to `minted_at`, the collection's `slug` and `on_offline` (Decision 4). The upsert sets `serial_eligible` only on insert, when `objekt_no` or `slug` changed, or while it is null, so an operator's exclusion (`serial_eligible = false`, an owner-approved write) sticks across repeated reads. It sets `serial_due` only where eligibility is true or null, so online and v1 reads never queue a rewrite.

**The merge.** The pure `mergeAnchors({ manual, confirmed, rows, batches })` (`apps/worker/src/lib/cosmo-anchors.ts`) returns `{ anchors, conflicts, refused }`. It walks confirmed serials in token order:

| Case | Result |
| --- | --- |
| a manual anchor on the same token, same serial | dropped, adds nothing |
| a manual anchor on the same token, another serial | dropped; a conflict |
| its batch already pinned by a manual anchor or v1 serial, and the pinned numbering gives its token the same serial | dropped, adds nothing |
| its batch pinned that way, another serial | dropped; a conflict |
| token outside every stored batch, or `checkManualAnchor` fails against the anchors so far | dropped; refused |
| otherwise | an anchor `{ tokenId, serial: objektNo, note: COSMO_ANCHOR_NOTE, addedAt: observed_at }` |

Manual anchors always win: a confirmed serial only pins a batch nothing else pins, and several confirmed serials in one such batch all pin it (nearest-anchor numbering). A conflict is reported (a count, and token ids at `debug`), never resolved by the code; the owner settles it with `script/serial-anchor.ts`. `COSMO_ANCHOR_NOTE` (`"Cosmo objektNo from a connected account"`) names no session, nickname or address.

**The loader.** `loadConfirmedSerials(slugs)` (`apps/worker/src/job/confirmed-serials.ts`) is one app query: `select slug, token_id, objekt_no, observed_at from cosmo_objekt where slug = any($1) and serial_eligible`, served by the partial index on `(slug) WHERE serial_eligible`. It returns an empty map unless `COSMO_OBJEKT_WRITES` holds `anchors` (Decision 10). The worker reads the app database through `db` and the indexer through `indexer`, with no join, so every caller loads its collections from the indexer first and then the confirmed serials of those slugs, one query per collection or per run. The module imports `db` and worker libs only, never an `@repo/api` service (`apps/worker/AGENTS.md`).

**Every serial path reads both sources.** Wherever a path passes `collection.serial_anchors` to `fitRanges`, `computeOfflineSerials`, `computeOfflineSerialUpdates` or `rewriteSerials`, it passes `mergeAnchors` of the manual list and the loaded confirmed serials instead: populate, `settleOpenDrops` and the grid writes (`job/serial-batches.ts`), the verifier's drift fix and weekly pass (which also stops probing a batch a confirmed serial pins), `refine-serial-batches.ts`, `anchor-gaps.ts` and `backfill-offline-serials.ts`. The holdout measurements that pass `[]` keep passing `[]`. `serial-anchor.ts` still edits manual anchors only: it checks a new one against manual anchors and v1 serials alone, so a confirmed serial never refuses it, and its rewrite uses the merged list, so it keeps the confirmed pins.

**The switch is per process.** Every serial path, in the worker or a script, reads `COSMO_OBJEKT_WRITES` from its own environment. The owner runs the serial scripts with the worker's value; a script run without `anchors` drops the confirmed pins from the collections it rewrites until their next rewrite with it.

**Re-arming.** A new read queues its own rewrite (`serial_due`). Any other change to which confirmed serials count (an exclusion, turning `anchors` off, or back on after it ran) reaches a collection only at its next rewrite, so the owner applies it by running `refine-serial-batches.ts` under `APPLY=1` for the collections concerned, with the worker's `COSMO_OBJEKT_WRITES` value.

**The rewrite step.** Populate only revisits collections that hold a serial 0, so a new confirmed serial changes nothing until its collection is rewritten. `applyConfirmedSerials()` (`job/confirmed-serials.ts`) is the last step of `populateSerialOffline`, after the collection loop, under the `serial-offline` job lock, in its own try/catch (a failure logs one `warn`). It runs only when `anchors` is on.

- Per run it takes up to 20 `slug`s with `serial_due` rows whose `serial_eligible` is not false, observed in the last 30 days and not checked in the last 6 hours, oldest `observed_at` first.
- For each, it reads the collection and its objekts minted before `now − MINT_DELAY_MS` (populate's window), judges rows whose `serial_eligible` is null, and stores those judgements in one app statement first, so the load that follows sees the newly eligible rows. Then it loads the confirmed serials, merges them and calls `rewriteSerials`, which writes through `writeSerialUpdates` and warns through `shiftedSerials`.
- Then one app statement stores `serial_checked_at`, and sets `serial_due = false` except on rows still unjudged. A row still unjudged after 30 days stays due but out of the selection until a newer read refreshes `observed_at`.

The step adds nothing to `serial_anchors` and keeps no per-row outcome: whether a serial pins, conflicts or is refused is recomputed by every merge.

**After an indexer rebuild.** The confirmed serials are in the app database, so populate's rewrite of each collection uses them again with no step of its own. Manual anchors return through `serial-anchor.ts list` output saved before the rebuild, as before.

**Ranges and grids.**

- The step rewrites serials only. It never calls `fitRanges`, which wants fresh discovery output and Cosmo calls; the paths that do refit pass the merged anchors.
- Anchors already outrank both grids, and `grid_fitted_at` is untouched.
- A gap a confirmed serial reveals (`anchorGaps`) shows in `script/anchor-gaps.ts`, and closing it is the owner's `script/refine-serial-batches.ts` run (task 9.5).
- A batch a confirmed serial pins is shielded from drift probes, like a v1 or manual one. That is intended: the serial is ground truth.

**The API's estimate mark.** Confirmed serials count as anchored on the site exactly as manual anchors do (Decision 8).

### 6. Transferable: Cosmo's view against the chain

**Authority.** Cosmo's `metadata.transferable` for a token's current holder is what decides whether that holder can send it in the app. The chain read is a proxy the indexer already overrides by hand (the pre-mint false rule). So a Cosmo read wins over the indexer's value when all of these hold, and the value it wins with is kept for good in `cosmo_transferable`:

1. **Not moved.** The objekt's `received_at` is at or before the read's `observed_at`, so the holder Cosmo answered for still holds it.
2. **No newer chain change.** No `transferability_update` for the token has `block_number` above the read's `chain_height`, and none is unapplied. A newer chain change wins. A later read, with a later height, can win back.
3. **Not cosmo-spin.** The owner is not `Addresses.SPIN`, whose objekts are false by design.
4. **Still the planned value.** The row still holds the value the plan saw (compare-and-set), so a concurrent indexer or `fix-collection` write is never overwritten.

**Two directions, two switches.** The causes differ, so the owner enables each one separately (Decision 10):

- **`untransferable`** (Cosmo false, ours true): Cosmo-side reasons (challenge rewards, welcome objekts, grid use) and the held-mint replay gap the indexer documents. Showing a sendable objekt as not transferable hides it from trade, which is the safer error.
- **`transferable`** (Cosmo true, ours false): this contradicts the indexer's deliberate false rule or a chain read. Showing a non-transferable objekt as sendable breaks trades, so it ships off until the owner has read the plan.

**The apply step.** `applyCosmoTransferable(mode)` runs in the collection-media apply phase. Each run takes up to 5,000 `transferable_due` rows, oldest first, and reads the indexer in chunks of 500 in one statement each: `objekt.id, transferable, owner, received_at`, the collection's `slug`, and whether a newer or unapplied `transferability_update` exists. The height is passed per token through `unnest`.

The pure `judgeTransferable(objekt, read, mode)` (`apps/worker/src/lib/cosmo-transferable.ts`) checks the guards before the values, so `matched` means the read passed every guard. It returns one outcome, in this order:

| Outcome | When | Effect on `cosmo_transferable` |
| --- | --- | --- |
| `missing` | no objekt, or another collection's | none |
| `moved` | guard 1 fails | none |
| `chain_newer` | guard 2 fails | none; the record stays and `fix-transferability` weighs it |
| `spin` | guard 3 fails | none |
| `matched` | values agree | stored: the read confirms the indexer's value |
| `report_untransferable`, `report_transferable` | would write, but the direction is off | none; the record keeps the value the indexer holds |
| `written_untransferable`, `written_transferable` | the write landed | stored: the read's value |
| `raced` | the compare-and-set matched nothing; the row stays due | none |

**The record's invariant.** A `cosmo_transferable` row always holds a value the worker wrote to, or found in, `objekt.transferable` under every guard. Storing it is an upsert of the read's `transferable`, `observed_at`, `chain_height`, the judged `received_at` and `confirmed_at = now()`, which clears `superseded_*`, and applies only when the read's `observed_at` is newer than the stored one: the newest Cosmo observation wins. A later read that disagrees replaces the record once its write lands (`written_*`); while its direction is off it is `report_*` and the record stays as it is.

**The write.** It is one statement per chunk and direction, inside a transaction with `SET LOCAL lock_timeout = '5s'`:

```sql
UPDATE objekt o SET transferable = $value
FROM unnest($ids, $observedAt, $height) AS r(id, observed_at, height)
WHERE o.id = r.id AND o.transferable = NOT $value AND o.owner <> $spin
  AND o.received_at <= r.observed_at
  AND NOT EXISTS (SELECT 1 FROM transferability_update u WHERE u.token_id = o.id
                  AND (u.block_number > r.height OR u.applied_at IS NULL))
RETURNING o.id
```

It repeats every guard of the plan. A write landing during an indexer batch fails that batch with 40001 and the batch reruns, as for staff colours. A lock timeout leaves the chunk due for the next run. Then one app transaction stores each outcome, sets `transferable_due = false` except on `raced`, and upserts `cosmo_transferable` for `matched` and `written_*`. If that transaction fails, the rows stay due, and the next run finds the indexer already holding Cosmo's value (`matched`) and stores the record then.

**What the write touches.** Neither the indexer's transferability writes, `fix-collection`'s settle nor `fix-transferability` bumps a cache: none calls `bumpTradeVersion` or writes a Redis key (checked 2026-11-17). Trade matching reads `objekt.transferable` live (`services/trade/matches/holdings.ts`). This write is the same column with the same readers (trade matching, the verifier's stuck check, the drawer), so it bumps nothing either. Task 4.2's check (2026-11-17) found readers that cache values derived from it, each on a timer every indexer write already lives with: `collection-metadata:1:<slug>` (the drawer's transferable count, 60 s), `trade:person:…` (60 s) and `trade:post:…` (fresh 60 s, served stale up to 900 s while it refreshes). None is keyed so a token write could bump it without naming its holder, so the write bumps none. A correction to false can mark a running trade's leg stuck, which is that check doing its job.

**Against `fix-transferability`.** A Cosmo-confirmed value is never reverted by the chain check. Per page of mismatches, the script reads the `cosmo_transferable` rows of those ids and, for tokens that have one, the highest `transferability_update.block_number`. The pure `cosmoHold(mismatch, record, newestBlock)` (`lib/transferability-check.ts`) returns:

- `apply` when there is no record, the record is already superseded, or the record's value equals the chain value (the write agrees with Cosmo);
- `superseded` when a `transferability_update` has `block_number` above the record's `chain_height`: a newer on-chain change wins, so the chain value is applied and the record is marked superseded (`superseded_at`, `superseded_block`);
- `held` otherwise: the token is left out of the write and counted as "held by Cosmo".

The dry run counts `held` and `superseded` and writes nothing; under `APPLY=1` the superseded marks are one app statement per page after `applyPage`. A move or the record's age changes nothing here. A later Cosmo read that passes the guards replaces a superseded record (Decision 6, the record's invariant).

**Failure isolation.** `applyCosmoTransferable` runs inside its own try/catch in the apply phase. Anything other than a lock timeout logs one `warn` with the error code and leaves the rows due, and the phase goes on to `deleteLongDead` and `sendExpiryNotices`.

**Rate.** At most 5,000 tokens judged, 20 read statements and 20 writes per 5-minute run.

### 7. What is kept

Nothing in `cosmo_objekt` or `cosmo_transferable` is ever deleted: there is no retention job and no deletion on any account event. These are kept for good:

- `cosmo_objekt` rows: each token id with its Cosmo serial (`objekt_no`; the eligible ones are the confirmed serials the serial job anchors on), its latest raw `transferable`, its grid use and its non-transferable reason;
- `cosmo_transferable` records;
- the serials rewritten from confirmed serials;
- the transferable corrections written to `objekt.transferable`.

None of them names a user, session or address, so nothing ties them to an account. Disconnecting, a session dying or expiring, `deleteLongDead`'s 30-day deletion of dead session rows, a ban, and an account anonymize or delete (`disconnectSession`, `revokeSessionsOf`) leave all four as they are: neither table has a foreign key, and no account path reads or deletes them. A fact changes only through its own rules: a newer read overwrites the row (Decision 4), a newer chain change supersedes a confirmed value (Decision 6), and the owner can exclude a confirmed serial or outrank it with a manual anchor (Decision 5, Re-arming). `inventory.owner` and `inventory.status` are compared while recording and never stored.

- **Grid use and the non-transferable reason.** They are stored for later use and shown nowhere in this change: no API output and no page carries them (tasks.md, follow-ups). A later reader must treat them as current only while the objekt has not been received since the read (`received_at <= observed_at`), since they describe the token as its holder had it.
- **Bursty data.** Sessions may die within hours (Context), so reads arrive in bursts after connects and Sync now. Nothing assumes a session lives through a 72-hour cycle: each page is complete and judged on its own.

### 8. The estimate mark counts confirmed serials

A batch pinned by a confirmed serial reads as exact on every trade surface, exactly like one pinned by a manual anchor, so its serials lose the "~". The mark must agree with what the serial job used, so it follows the same switch.

- **The switch.** `objektWriteModes` moves to `@repo/lib` (`packages/lib/src/cosmo-objekt-writes.ts`, pure) so the worker and the API parse `COSMO_OBJEKT_WRITES` the same way. `serverEnv` (`packages/api/src/env.ts`) gains it as an optional string, and `docker-compose.yml` passes the root `.env` value to `web` as well as `worker`. Without `anchors`, the mark is today's.
- **`anchoredSerialIds(ids)`.** With `anchors` on, it runs in two steps. First the indexer query, extended to return, for each post-cutoff id it does not already mark anchored, its collection's `slug` and the `start` and `end` of the stored batch holding it. Then, when any such candidate exists, one app query: `select slug, token_id from cosmo_objekt where serial_eligible and slug = any($1)`, served by `cosmo_objekt_confirmed_idx`. The pure `pinnedByConfirmed(candidates, confirmed)` (`packages/api/src/lib/confirmed-pins.ts`) returns the candidate ids whose batch holds a confirmed token of the same slug, and those join the anchored set. With `anchors` off it skips both additions.
- **Failure.** A failed app read logs one `console.warn` with the error code and leaves the confirmed pins out: the serial reads as estimated, the safe error. The caller never fails.
- **Agreement with the serial job.** Both read the one root `.env` value, so the owner changes it there and restarts web and worker together. A confirmed serial that `mergeAnchors` refuses while sitting inside a stored batch (`checkManualAnchor`'s below-1 rule) would still mark its batch exact; the plan script and the serial step's `warn` list refusals, and the owner's exclusion (`serial_eligible = false`) clears both the pin and the mark. A conflict needs no rule here, since its batch is already pinned by the manual anchor or v1 serial that won.
- **Cost.** One extra app query per call, only when a post-cutoff serial is not already anchored. Callers and the response shapes are unchanged.

### 9. Consent text

The section (earlier change, Decision 14) says it keeps "only that media, not a list of what you hold" and that others see "the media, with no link to you". Both stop being true, so three strings change. `stored` and `stop` stay: `stored`'s "the rest is deleted within 30 days" is about the session's nickname and address, which is still true. The new text promises no deletion of per-objekt data, says it stays after disconnecting, and says grid use and the reason are kept but not shown. The ko (합니다체) and ja (です/ます, full-width colons, 。 where en has a full stop) texts are drafts for the owner to review, as the earlier change's were.

| Key | en | ko | ja |
| --- | --- | --- | --- |
| `cosmo_session_intro` | Connect your Cosmo account to help fill in motion videos, voice and colours for the collections you hold, and to correct the serials and transferability of your objekts. Everyone on the site sees the results. | Cosmo 계정을 연결하면 보유한 컬렉션의 모션 영상, 보이스, 색상을 채우고 보유한 Objekt의 시리얼과 전송 가능 여부를 바로잡는 데 도움이 됩니다. 결과는 사이트의 모든 사람에게 보입니다. | Cosmoアカウントを接続すると、保有しているコレクションのモーション動画、ボイス、カラーの補完と、保有しているObjektのシリアルと転送可否の修正に協力できます。結果はサイトの全員に表示されます。 |
| `cosmo_session_read` | What we read: the collections and objekts you hold. We keep each collection's media and colours, and for each objekt its serial, whether it can be sent and why not, and whether it was used for a grid. Grid use and the reason are kept for later use and not shown yet. Objekt details are kept by objekt, with no account, address or user stored beside them, and as facts about the objekt they stay after you disconnect. We keep nothing else from your Cosmo account, such as your email. | 읽는 정보: 보유한 컬렉션과 Objekt입니다. 컬렉션의 미디어와 색상, 그리고 Objekt별 시리얼, 전송 가능 여부와 불가 사유, 그리드 사용 여부를 보관합니다. 그리드 사용 여부와 불가 사유는 나중에 쓰기 위해 보관하며 아직 표시하지 않습니다. Objekt 정보는 Objekt별로 보관하며 계정, 주소, 사용자 정보는 함께 저장하지 않고, Objekt에 대한 사실이므로 연결을 해제한 뒤에도 남습니다. 이메일 등 Cosmo 계정의 다른 정보는 보관하지 않습니다. | 読み取る情報：保有しているコレクションとObjektです。コレクションのメディアとカラー、そしてObjektごとのシリアル、転送できるかどうかとできない理由、グリッドに使用したかどうかを保存します。グリッドの使用と転送できない理由は今後のために保存し、まだ表示しません。Objektの情報はObjektごとに保存し、アカウント、アドレス、ユーザーの情報は一緒に保存しません。Objektについての事実のため、接続を解除した後も残ります。メールアドレスなど、Cosmoアカウントのその他の情報は保存しません。 |
| `cosmo_session_shown` | What others see: the media, and the corrected serials and transferability of objekts you hold. Corrections come only from connected accounts, so one can hint that an objekt's holder connected an account. Your Cosmo nickname and address show only to you, here. | 다른 사람에게 보이는 정보: 미디어, 그리고 보유한 Objekt의 바로잡은 시리얼과 전송 가능 여부입니다. 수정은 연결된 계정에서만 오므로, 해당 Objekt의 보유자가 계정을 연결했다는 것을 짐작할 수 있습니다. Cosmo 닉네임과 주소는 이 화면에서 회원님에게만 보입니다. | ほかの人に表示される情報：メディアと、保有しているObjektの修正したシリアルと転送可否です。修正は接続されたアカウントからのみ行われるため、そのObjektの保有者がアカウントを接続したと推測できることがあります。Cosmoのニックネームとアドレスは、この画面であなたにのみ表示されます。 |

### 10. One switch for every indexer write: `COSMO_OBJEKT_WRITES`

A comma list in the root `.env`, passed to `worker` and `web`, read through the pure `objektWriteModes(raw)` (`packages/lib/src/cosmo-objekt-writes.ts`, shared with the API, Decision 8): `anchors`, `untransferable`, `transferable`. Unset or empty means record and report only; an unknown word logs one `warn` per start and is ignored.

- `anchors` lets the serial job use confirmed serials as anchors. Without it, `loadConfirmedSerials` returns none, every serial path uses manual anchors only, the rewrite step does not run, and rows stay `serial_due`; turning it on the first time rewrites every collection with due reads in the last 30 days, and the rest at their next read or populate rewrite. Turning it off, or on again later, follows Decision 5, Re-arming.
- Without `untransferable` or `transferable`, the apply step still judges rows and stores `report_untransferable` or `report_transferable`. Turning a direction on applies from each token's next read; the owner may also set `transferable_due = true` on the `report_*` rows by hand (an owner-approved write) to apply at once.

**The plan script.** `script/cosmo-objekt-plan.ts` runs both planners over every row and prints the outcomes, writing nothing:

- confirmed serials per collection: the serials `mergeAnchors` would move and by how much, the conflicts and refusals, and the online and v1 serials that differ (compared only);
- transferable outcomes by direction, non-transferable reason and class, and the `cosmo_transferable` records split by whether a `transferability_update` above their `chain_height` exists: those `fix-transferability` would supersede, and the rest, which it holds wherever the chain disagrees. The script makes no chain reads, so it cannot say which of the rest the chain disputes.

It refuses to start without a read-only connection, as `fix-transferability` does. The owner runs it on production before enabling each word (tasks 9.3 and 9.4). Every switch is an env change and a restart of the worker (and of web for `anchors`), with no deploy.

### 11. Logs

- **The sync's `info` summary** gains `objekts recorded N`. Skips by reason (`not_minted`, `other_owner`, `holder_mismatch`, `duplicate`, `no_height`) and `partial` go to the heartbeat; `record_failed` is a `warn`.
- **The transferable step** logs one `info` with counts per outcome and records stored when it judged anything, and a `warn` with the count of lock timeouts and `raced` rows.
- **The serial step and every merge** log through `serial-offline`: one `info` with collections rewritten and serials moved; one `warn` per run with the count of conflicts and their token ids, and the count of refusals, plus `shiftedSerials`' per-collection warning. Other per-token lines go to `debug`.
- **`fix-transferability`** prints "held by Cosmo" and "Cosmo record superseded" beside its totals.
- No log line carries a session id with a token id, so the logs cannot tie a token to an account either.

### 12. Names: Cosmo's terms

Objekt Tracker has its own, unrelated lock feature (`locked_objekts`). This feature never reads or writes that data, and its names keep to Cosmo's terms so the two are never confused: transferable, untransferable, non-transferable reason (`nonTransferableReason`, `non_transferable_reason`), and the switch words `untransferable` and `transferable`. Otherwise "lock" appears in this change only to name that other feature and for database and job mutexes (`lock_timeout`, the `serial-offline` job lock).

## Risks / Trade-offs

- **A wrong Cosmo value.** → Every write is off until the owner reads the plan. Each direction has its own switch. `chain_newer` lets the chain win, and compare-and-set never overwrites a concurrent write. A newer Cosmo read replaces a wrong record once it passes the guards.
- **A permanent wrong record.** `fix-transferability` no longer reverts a confirmed value on its own. → Only a newer chain change, a newer Cosmo read, or the owner deleting the record (rollback) undoes it; the plan script lists the records the script holds.
- **Confirmed serials move shown serials.** That is the point, but a bad one would move a batch. → `serialEligible`'s filters, `mergeAnchors` (manual anchors and v1 serials win, `checkManualAnchor` refuses), the `shiftedSerials` warning, the plan script before enabling, and an operator's exclusion or manual anchor to override one.
- **The estimate mark and the serial job disagree.** Web and worker restarted with different `COSMO_OBJEKT_WRITES`, or a refused confirmed serial inside a batch. → One root `.env` value for both; refusals are listed and an exclusion clears the mark (Decision 8).
- **Privacy hint.** A corrected transferability can hint that its holder connected an account. → Stated in the consent text; no address, account or session is stored with a row; grid use and the reason are shown nowhere.
- **Short-lived sessions.** Data may come only in bursts after connects. → Each page stands alone; nothing waits for a full cycle; the facts stay after the session ends.
- **Table size.** Rows are permanent, one per token any connected account ever held, bounded by the number of objekts. → Partial indexes on the due flags keep the jobs' reads small; one statement per page.
- **An indexer rebuild.** It drops manual anchors and transferable corrections. → Confirmed serials live in the app database, so populate's rewrite of each collection anchors on them again. The owner re-arms the corrections (`update cosmo_objekt set transferable_due = true`, an owner-approved write) and the next runs write them back under the same guards. Manual anchors return through `serial-anchor.ts list` output saved before the rebuild, as before.
- **An unjudged row.** A token the indexer never gets. → Judged again every 6 hours while its read is under 30 days old, then left out until a newer read (Decision 5). A confirmed serial outside every stored batch is refused by each merge until the batches cover it.

## Migration Plan

1. Generate the app migration (`cosmo_objekt`, `cosmo_transferable`) with `db:generate`. It is expand-only. The owner applies it with `docker compose run --build --rm migrate` before the deploy.
2. Deploy the web and the worker with `COSMO_OBJEKT_WRITES` unset: the sync records, and nothing is written to the indexer or changes on the site. `matched` reads still store `cosmo_transferable` records, which only make `fix-transferability` hold values Cosmo agrees with.
3. After the first syncs, the owner runs the plan script read-only, then enables `anchors` on web and worker (confirmed serials as anchors, and the estimate mark with them), then `untransferable`, and decides on `transferable`.
4. **Rollback.** Disconnecting accounts is not a rollback: it removes none of the facts (Decision 7).
   - Unset `COSMO_OBJEKT_WRITES` and restart the worker; recording continues harmlessly.
   - To stop using confirmed serials: unset `anchors`, restart, then run `refine-serial-batches.ts` under `APPLY=1` (owner, without `anchors` in its env) for the collections the plan listed, which rewrites them from manual anchors only. To drop one confirmed serial: set its `serial_eligible = false` (an owner-approved write) and re-arm its collection (Decision 5, Re-arming), or add a manual anchor, which wins at once.
   - To undo transferable corrections: the owner deletes the `cosmo_transferable` rows concerned (a production write), then runs `fix-transferability.ts` under `APPLY=1`, which restores the chain value.
   - Dropping `cosmo_objekt` is a later contract migration; `cosmo_transferable` stays unless the owner drops it too.

## Open Questions

- **`count` against `objekts.length`.** Does `objekts[]` list every copy the account holds, or a capped preview? The 182-objekt probe suggests every copy. The `partial` count answers it; a cap would leave some tokens unread, but changes nothing here.
- **Other `inventory.status` values.** Are there any (pending, burned)? They are skipped and counted.
- **Other `nonTransferableReason` values.** The plan script lists them. A frequent one earns its own label.
- **Sessions under the old consent text.** If any account other than the owner's connected before this deploy, does it record per-objekt data from the deploy, or only after a reconnect? Those records are now permanent, so this matters more than it did. The default is from the deploy, since production held only the owner's account when this was written. A reconnect rule is a filter on `cosmo_session.created_at` in `observationsOf`'s caller.
- **The `transferable` direction.** Enable it at all? The owner decides after the plan (task 9.4).
