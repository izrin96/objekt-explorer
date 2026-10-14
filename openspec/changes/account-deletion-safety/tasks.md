Start only after `cosmo-link-sanction-guard` is implemented, since its `anonymizeUser` writes the link events this change relies on. Merge into the current contents of `services/account-anonymize.ts` and `apps/web/messages/{en,ja,ko}.json`. Mutations against the production database are verified read-only, up to the request boundary.

## 1. Pure module

- [x] 1.1 Add `packages/api/src/lib/account-deletion.ts` (design decision 1) with:
  - `deletionBlockers`, `refusalOf`, `hasDeliverableEmail` and `deletionStep`;
  - `FRESH_SIGN_IN_MINUTES = 10`.

  Add `account-deletion.test.ts` with these cases:
  - a warning, an expired sanction and a revoked sanction don't block, and a ban with no end does, sorted last;
  - completed, failed and cancelled trades don't block;
  - a trade's `endsBy` is accept + 14 days;
  - `cancelLocked` is true with a verified leg or a held copy, and false for `indexer_behind`;
  - blockers sort by their end;
  - `refusalOf` prefers `sanctioned`;
  - `*@discord.placeholder.local`, `*@twitter.placeholder.invalid` and `*@deleted.invalid` are undeliverable, and a real address is deliverable;
  - `deletionStep` gives `delete` at 9:59, `sign-in-again` at exactly 10:00, and `send-email` for a deliverable address whatever the session's age.

  Verify that `bun test packages/api/src/lib/account-deletion.test.ts` passes, and that lint, typecheck and build pass for `@repo/api`.

## 2. Service and transaction hardening

- [x] 2.1 In `services/account-delete.ts`, add `deletionState(executor, userId)` and rebuild `deleteRefusal` on `refusalOf(deletionBlockers(...))`, removing `hasTradeInProgress` (design decision 2). In `schemas/user.ts`, extend `DELETE_REFUSALS` with `email_undeliverable` and `sign_in_again`. In `offer/cancel.ts`, export `openOffersWhere` and use it in `cancelOpenOffers`. Add `DELETE_REFUSALS` to the `Refusal` union in `lib/refuse.ts`. Verify that lint, typecheck and build pass for `@repo/api`.
- [x] 2.2 Give `anonymizeUser` the `{ self }` option (design decision 3):
  - lock the user row `FOR NO KEY UPDATE` first, then cancel offers, then re-check through `deletionState(tx)`;
  - refuse on trades on both paths, and on sanctions only when `self`;
  - when `self`, write the `account_deleted` audit entry (design decision 7).

  Add `"account_deleted"` to the `mod_audit.action` `$type` union in `packages/db/src/schema.ts` and to `AUDIT_ACTIONS`. This needs no migration: the column is `text` with no CHECK constraint. Run no `db:*` script. Verify that lint, typecheck and build pass for `@repo/db` and `@repo/api`.
- [x] 2.3 In `offer/index.ts` (create) and `offer/accept.ts`, read both users `FOR SHARE` at the point design decision 4 names, and refuse `not_accepting` (the block code) when either is deleted. Verify that lint, typecheck and build pass for `@repo/api`.

## 3. Better Auth hooks

- [x] 3.1 In `services/auth.ts` (design decision 5):
  - add the `email_undeliverable` check to the `/delete-user` before-hook, only when `ctx.body?.token` is absent;
  - add the `hooks.after` that redirects a refusal on `/delete-user/callback`;
  - make `sendDeleteAccountVerification` skip undeliverable addresses;
  - pass `{ self: true }` from `beforeDelete` and `{ self: false }` from `databaseHooks.user.delete.before`.

  Re-read `dist/api/dispatch.mjs` in the installed `better-auth` version, to confirm that the after-hook still sees the endpoint's `APIError` on `ctx.context.returned`. Verify that lint, typecheck and build pass for `@repo/api`.

## 4. Router

- [x] 4.1 Add `deletionCheck` and `deletionToken` to `routers/user.ts` (design decision 6), with output schemas in `schemas/user.ts`. Verify that lint, typecheck and build pass for `@repo/api`. Then, read-only with the smoke-test account: `user.deletionCheck` returns its in-progress trades with partner names and `endsBy`, the open-offer count, and `step: "send-email"`. Do not call `deletionToken` or `deleteUser`.

## 5. Moderation console

- [x] 5.1 Make the console changes from design decision 8:
  - `accountDossier` returns `deletedAt`;
  - `applyModAction` refuses non-dismiss actions on a deleted account with `deleted_target`;
  - `account.tsx` shows the Deleted chip;
  - `act-form.tsx` offers only Dismiss for a deleted account;
  - `labels.ts` gets `account_deleted`.

  Add the console messages in en, ko and ja. Verify that lint, typecheck and build pass for `@repo/api` and `web`.

## 6. Web: Danger section

- [x] 6.1 Add `deletionCheckOptions` to `features/account/queries.ts` and `features/account/deletion-blockers.tsx`. Rework `sections/danger.tsx`: the blockers, the confirmation text, the per-step action and the new `refusalText` cases (design decision 9). Add and reword the `auth_account_delete_*` messages in en, ko and ja. Verify that lint, typecheck and build pass for `web`.
- [x] 6.2 Browser check of `/account/danger` at 1280 px and 390 px, light and dark, signed in with the smoke-test account. It is read-only: open the confirmation and close it, and never confirm. Record each of these:
  - the blocker rows, or their absence;
  - the mono T-number and its link;
  - the Delete button's disabled state;
  - the confirmation's open-offer count and wording;
  - the action label for the account's step;
  - `/account/danger?refused=trade_in_progress` and `?refused=email_undeliverable` showing their text;
  - no sideways scroll at 390 px.

## 7. Verify

- [x] 7.1 Run `bun run check`, `bun run build --filter=web`, `bun run knip` (no new unused exports or messages) and `openspec validate account-deletion-safety --strict`. All pass.

## 8. AGENTS.md

- [x] 8.1 Add an "Account deletion" section to `packages/api/AGENTS.md`:
  - the user row is never deleted: deletion scrubs it in `anonymizeUser`, and both Better Auth paths (`beforeDelete`, and the `user.delete.before` database hook returning `false`) end there;
  - what blocks deletion is decided only by `lib/account-deletion.ts`, which the hooks, the router and the scrub's in-transaction re-check all call;
  - a new foreign key to `user` may keep `onDelete: "cascade"`, but nothing may rely on the cascade firing;
  - offer writes read both users `FOR SHARE` before writing, against the scrub's `FOR NO KEY UPDATE`, which is chosen so foreign-key `FOR KEY SHARE` locks from notification inserts pass;
  - `DELETE_REFUSALS` are bare codes, the one exception to the domain prefix, because Better Auth and `?refused=` carry them too.

  State that the `AGENTS.md` files of `packages/db` and `apps/web`, and the root one, are unchanged, unless the `mod_audit.action` union without a CHECK became a convention worth recording in `packages/db/AGENTS.md`. Verify that lint and typecheck pass for `@repo/api`.
