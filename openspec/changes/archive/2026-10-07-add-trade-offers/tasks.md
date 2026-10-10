## 1. Schema and migration

- [x] 1.1 In `packages/db/src/schema.ts`, add `offer`, `offer_item`, `trade` and `trade_leg`, with the columns, checks, `offer_one_open` and `trade_leg_reserved` from design D1. Add `message.offer_id` and widen `message_has_content`. Lint and typecheck pass for `@repo/db`.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate`. Read the SQL and confirm it:
  - creates the four tables, their indexes and their checks;
  - adds `message.offer_id`;
  - drops and re-adds `message_has_content`, and nothing else.

  Check that `DATABASE_URL` resolves to localhost, then apply it with `db:migrate`. `\d trade_leg` shows the partial unique index. Never apply it to production.

## 2. Rules module

- [x] 2.1 Add `packages/api/src/lib/offer-rules.ts`, pure with no DB, Redis or Cosmo imports. It holds:
  - `createEffect`, which returns counter, replace or new (D2);
  - `allowedActions(offer, viewerId, now)`;
  - `effectiveStatus` (lazy expiry);
  - `validateShape` (empty, too many, top-up);
  - `itemFlags`;
  - `offerSummary`.

  Add `offer-rules.test.ts` covering these spec scenarios:
  - counter;
  - replace own;
  - expired has no Accept;
  - cash buy is valid;
  - an empty offer is refused;
  - 11 objekts on one side are refused;
  - a muted user may accept but not create.

  `bun test` passes, and lint and typecheck pass for `@repo/api`.

## 3. API

- [x] 3.1 Add `schemas/offer.ts`:
  - the inputs, and `OfferView` and `TradeView`;
  - the refusal codes (D3, D6, D7) and the limits as constants;
  - the `offer` notification payload, added to the notification union and the type list.

  Lint and typecheck pass for `@repo/api`.
- [x] 3.2 Extract the conversation-opening part of `chat.start` into a shared service function, so `offer.create` can reuse it with no card message (D7). `chat.start` behaves the same. Prove it over local `/rpc` by starting a chat from a profile and from a list. Lint and typecheck pass.
- [x] 3.3 Add `services/offer.ts` and `routers/offer.ts`, registered in `routers/index.ts` but not in `openApiRouter`. They provide `candidates`, `create`, `accept`, `decline`, `withdraw`, `suggest`, `mine`, `trade` and `cancelTrade`, following D2 to D4, D6, D7 and D9.

  Over local `/rpc`, with two test accounts created only in the local DB, verify:
  - a swap, a counter, and a replace-own;
  - each refusal code;
  - an accept that creates a trade and legs and cancels a second offer holding the same objekt;
  - two accepts racing (fired in parallel) yield one trade and one `reserved`;
  - `cancelTrade` frees the reservation.

  Lint, typecheck and `bun test` pass for `@repo/api`.
- [x] 3.4 Hydrate offers in `toChatMessages` (D5): the thread returns `offer` on offer messages, with viewer-relative sides and actions, in one batched read per page. Over `/rpc`, a thread with three offers costs one extra query, not three. Lint and typecheck pass.
- [x] 3.5 Add the cancel hooks (D6):
  - block cancels open offers between the pair (`blocked`);
  - `moderation.act` with `trade_block` or `ban` cancels the target's open offers (`sanction`);
  - each runs in the same transaction, with notifications and nudges after commit.

  Verify over local `/rpc` with the local admin account. Lint and typecheck pass.

## 4. Web

- [x] 4.1 Add `features/offers/offer-builder.tsx` and its pickers, using `baseline-ui` and `vercel-react-best-practices`. It is a `Dialog`, and the `Drawer` pattern on a phone. It holds:
  - the virtua grid over `offer.candidates`;
  - the flags;
  - the top-up `Select` and the note;
  - the refusal messages, mapped through `errorReason`.

  All strings are `m.*` in en, ja and ko. In the browser on local, send a swap, a cash buy and a counter, and see a not-transferable objekt disabled. No sideways scroll at 390 px. Lint, typecheck and build pass for `web`.
- [x] 4.2 Add `features/offers/offer-card.tsx` in `thread.tsx`: the full card is the newest, older ones collapse, the actions depend on the viewer, and the status is live through `chat_changed`. Add Offer to the composer. Verify in two isolated browser contexts that an accept updates the other tab without a reload. Lint, typecheck and build pass.
- [x] 4.3 Add the entry points, gated by the same `messageable` flag as Message:
  - Make offer on `browse-post.tsx`;
  - Propose this trade on `partner-row.tsx`, prefilled through `offer.suggest`;
  - Make offer on Market tab rows in the drawer.

  Verify each opens the builder prefilled as the specs say. Lint, typecheck and build pass.
- [x] 4.4 Add the routes `trade/mine.tsx` and `trade/mine/$tradeId.tsx`, using `router-core` and `tanstack-router-best-practices`. Use the loader-first paint with `staleTime: "static"`, add My trades to `trade-tabs.tsx`, the signed-out redirect, and not-found for non-parties. Add the Offers switch to the account dialog's Notifications section, and the offer rows to the bell. Verify the four groups, History paging, the redirect and not-found in the browser. Lint, typecheck and build pass.

## 5. Whole-change checks

- [x] 5.1 Run `bun run check`, `bun run build --filter=web`, `bunx oxfmt --check .` and `bun run knip`: all pass, with 0 lint warnings. `openspec validate add-trade-offers --strict` passes.
- [x] 5.2 Walk every scenario in this change's specs on local with isolated test accounts, then run `better-interface` on the builder, the offer card and My trades, and fix what it finds. Remove all local test data and Valkey keys afterwards, and write nothing to production.
