## 1. Schema and migration

- [x] 1.1 In `packages/db/src/schema.ts`, make the D1 changes:
  - add `trade_feedback`;
  - add `trade_leg.transfer_id` (unique) and `trade_leg_open_idx`;
  - add `trade.reminded_at`;
  - add `report.trade_id`.

  Lint and typecheck pass for `@repo/db`.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate`, read the SQL, and confirm it only makes those changes. Check that `DATABASE_URL` resolves to localhost, then apply it with `db:migrate`. Never apply it to production.

## 2. Pure modules

- [x] 2.1 Add `apps/worker/src/lib/trade-match.ts` (D2) and `trade-match.test.ts`, covering:
  - verify;
  - a move between own addresses, then verify;
  - broken to a third party;
  - two any-copy legs needing two transfers;
  - a transfer before the window is ignored;
  - a mixed-case address;
  - a transfer already used by another leg.

  `bun test` passes for `worker`, and lint and typecheck pass.
- [x] 2.2 Add `firstSender` and `canReport` to `packages/api/src/lib/offer-rules.ts`, and the `cancelTrade` lock rule, with tests:
  - fewer verified trades sends first;
  - a tie goes to the newer account;
  - `canReport` at 7 days and when failed;
  - locked after the first verified leg.

  `bun test` passes for `@repo/api`.

## 3. Worker

- [x] 3.1 Add `apps/worker/src/job/trade-verifier.ts` (D3, D4, D6), and register it in `index.ts`:
  - a run on startup;
  - a cron every 2 minutes;
  - the debounced `transfers` subscription with the watch set;
  - single-flight with `pg_try_advisory_lock`;
  - per-trade transactions;
  - notifications, then `notify:` and `chat_changed` publishes after commit;
  - offer expiry and moved-objekt cancellation;
  - stall reminders;
  - `trade-verifier:last` in Valkey.
- [x] 3.2 Prove the job on local, without touching the real chain: create local trades whose legs name objekts with real past transfers in the indexer (read-only), with snapshots set to those transfers' addresses and windows before them. Run the job once and see:
  - the legs verify with the right hashes, and the trade completes;
  - a leg whose objekt later went to a third address marks the trade cancelled or failed;
  - an offer past `expires_at` becomes `expired`, with notifications;
  - a second run changes nothing.

  Lint, typecheck and `bun test` pass for `worker`.

## 4. API

- [x] 4.1 Add `services/reputation.ts` (D5): batched reads, the `rep:` cache, and invalidation from the worker and from `rate`. Attach reputation to:
  - the chat thread partner;
  - `trade.browse` posts;
  - For you partners;
  - the profile read when `userId` is present;
  - `offer.trade`.

  Over local `/rpc`, a hidden-user profile has no reputation key. Lint and typecheck pass.
- [x] 4.2 Extend `offer.trade` with:
  - the leg states and hashes, and progress;
  - `firstSender` and `canReport`;
  - the viewer's rating;
  - the last-checked time.

  Also add `offer.rate`, the `locked` refusal in `cancelTrade`, `moderation.report` with `tradeId` (party check), the attached trades on the console account read, and the `trade` notification type and payload, with `expired` added to offer events. Verify each over local `/rpc`. Lint and typecheck pass.

## 5. Web

- [x] 5.1 Add `features/offers/trust-line.tsx`, and place it in:
  - the thread header;
  - `browse-post.tsx` and `partner-row.tsx`;
  - `profile-header.tsx`;
  - the trade page.

  Use `baseline-ui`; all strings are `m.*` in en, ja and ko. Verify each surface in the browser, including "No verified trades yet". Lint, typecheck and build pass for `web`.
- [x] 5.2 Extend the trade page:
  - leg chips with hash and time;
  - the progress line and the who-sends-first panel;
  - the cancel lock note and the feedback control;
  - Report a problem through `ReportDialog` with `tradeId`;
  - "n of m transfers verified" on the accepted offer card.

  Add the Trades switch and the trade rows in the bell. Verify, in two isolated contexts, that a worker run updates both open pages without a reload. Lint, typecheck and build pass.
- [x] 5.3 Show attached trades on the console's account page (`features/moderation/mod-account.tsx`). Verify as the local admin. Lint, typecheck and build pass.

## 6. Whole-change checks

- [x] 6.1 Run `bun run check`, `bun run build --filter=web`, `bunx oxfmt --check .` and `bun run knip`: all pass, with 0 lint warnings. `openspec validate add-verified-trades --strict` passes.
- [x] 6.2 Walk every scenario in this change's specs on local with isolated test accounts, then run `better-interface` on the trade page and the trust line, and fix what it finds. Remove all local test data and Valkey keys afterwards, and write nothing to production.
