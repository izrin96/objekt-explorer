## Why

Want-list alert progress (`alerts:cursor`, `alerts:state`) lives only in Valkey, apart from the alerts it describes.
- **Lost keys.** A missing key reads as a first run. The cursor jumps to `max(id)`, every discoverable list is marked known, and everything since the last good run is skipped without a word. Compose gives Valkey no volume, so recreating the container loses the keys.
- **Shared keys.** A local worker reads the production Valkey through the root `.env` but writes its local database's state back to it. Production then re-reads almost all of `list_entries` and alerts on old entries.
- **Short window.** The late-commit window is anchored on `now`, so it gives 5 minutes, not the 10 the spec promises, and nothing at all after an outage longer than 10 minutes. Marks are kept by count, so a crash loop narrows the window further.

## What Changes

- **Progress in the app database.** A new `worker_progress` table (expand only) holds the cursor and state. The worker writes it in the same transaction as the alerts, on every run, including runs with no alerts. A missing row is a genuine first run only when Valkey holds no usable seed.
- **One-time seed from Valkey.** When the row is missing, the worker reads the old keys once. It uses them only if no id in them is above this database's `max(id)`. It never writes or deletes them.
- **Unreadable progress stalls the job.** The worker logs an error and leaves progress as it is. It never starts over.
- **A true 10-minute late-commit window.** The floor is anchored on the previous run's mark, not on `now`. Marks are kept by age, back to the anchor, with a bounded count. Both are pure functions in `lib/want-alert-state.ts`, with tests.
- **Lag in the log line**: entries behind, and minutes since the previous run.
- **Realtime publish retry.** `call()` in `packages/api/src/realtime.ts` retries once on a network error, a timeout or a 5xx. Each publication carries a Centrifugo `idempotency_key`, so a retry never delivers twice. Polling stays off while the live connection is open.
- **Worker docs.** `apps/worker/AGENTS.md` records where progress lives, that it is never shared across databases, and the floor rule.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `web-notifications`: "Want-list alerts" gains scenarios for a late commit, a worker outage and a lost Valkey. "Reverse-direction alerts" needs no delta: it already applies the same timing and once-only rules.

## Routes

None. The change is worker and server only.

## Non-goals

- A job queue, or moving the scan off committed rows.
- Matching rules, grouping, or notification UI.
- The `markRead` and grouping race (accepted).
- Other state the worker keeps in Valkey: rarity cache, verifier heads, image lock.
- Re-enabling polling while connected.
- Deleting the old Valkey keys. The user does that after the cutover.

## Impact

- `packages/db`: `worker_progress` in `schema.ts`, and a generated migration held for the user to apply before the deploy.
- `apps/worker`:
  - `job/want-alerts/index.ts` and `record.ts` (one transaction per run);
  - a new `job/want-alerts/progress.ts` (load, seed, save);
  - `lib/want-alert-state.ts` and its tests (`overlapFloor`, `keepMarks`, `parseState` on a parsed value).
- `packages/api`: `realtime.ts` (retry), and `lib/realtime-requests.ts` with its tests (idempotency keys).
- `apps/worker/AGENTS.md`.
