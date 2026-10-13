`@repo/db` and `@repo/api` have no build script, so for them "build" is `bun run build --filter=web`, which bundles both.

## 1. Schema and migrations (held for approval)

Never run `db:migrate` or `db:push`: the user reviews and applies both migrations.

- [x] 1.1 Add `addressLinkEvent` to `packages/db/src/schema.ts` as in design decision 1:
  - the columns, the three CHECKs and the two indexes;
  - no FK on `user_id` or `actor_id`, with a one-line comment that the event outlives the account.

  Run `bun run --filter=@repo/db db:generate`. Verify the generated `migration.sql` only creates the table, its CHECKs and its indexes, and that lint and typecheck pass for `@repo/db`.
- [x] 1.2 Run `bun run --filter=@repo/db db:generate -- --custom --name address_link_backfill`. Write the idempotent backfill from design decision 7:
  - a UNION of current links and both trade-leg sides, with `lower()` on the `text[]` addresses;
  - `DISTINCT ON (address, user_id)`, keeping the earliest time;
  - `NOT EXISTS` on `(address, user_id, reason = 'backfill')`.

  Verify its folder sorts after 1.1's, and that the SQL reads only `user_address`, `trade_leg` and `trade`. Then stop and ask the user to apply both migrations before anything is deployed.

## 2. Link rules (pure)

- [x] 2.1 Add `packages/api/src/lib/link-rules.ts` (`COOLDOWN_DAYS`, `linkRefusal`, `unlinkRefusal`, `moveRefusal`, design decision 2) and `link-rules.test.ts`. The tests cover:
  - the account the address left relinks during the cooldown;
  - another account refused during the cooldown, with `retryAt` 7 days after the leave;
  - the boundary: refused just before 7 days, allowed at exactly 7 days;
  - a previous holder with an active sanction refuses linking;
  - an expired or revoked sanction (`sanctioned: false`) allows it;
  - restricted wins over cooldown;
  - unlink refused when sanctioned, then when in a trade;
  - each move refusal, in order, and that a staff unlink never gets `same_account`.

  Verify `bun test packages/api/src/lib/link-rules.test.ts` passes, and lint and typecheck pass for `@repo/api`.

## 3. Link and unlink

- [x] 3.1 Add `cosmo_link_address_restricted`, `cosmo_link_cooldown`, `cosmo_link_unlink_sanctioned` and `cosmo_link_unlink_in_trade` to `COSMO_LINK_REFUSALS`.

  Add `packages/api/src/services/cosmo-link.ts` with `holdersOf`, `inOpenTrade`, `recordLinkEvents`, `linkVerified` and `unlink`, following the lock order in design decisions 3 and 4. Move `verifyStatusMessage`'s upsert and `removeLink` in `routers/cosmo-link.ts` onto them. Leave every input unchanged, and leave `checkAddress` and `generateCode` on `assertAddressNotLinked` alone.

  Verify:
  - lint and typecheck pass for `@repo/api`;
  - `bun run build --filter=web` passes;
  - read-only: the SQL that `inOpenTrade` and `holdersOf` would send runs as a `SELECT` against production for the smoke-test account's address and returns rows.
- [x] 3.2 In `services/mod-console.ts`, make `applyModAction` lock the target's `"user"` row `FOR UPDATE` as the transaction's first statement for `trade_block` and `ban`, before the `user_sanction` insert (design decision 4). Verify lint and typecheck pass for `@repo/api`, and `bun run build --filter=web` passes.
- [x] 3.3 In `services/account-anonymize.ts`, change the `user_address` update to `RETURNING address`. Take the advisory lock per address in order, and record an `unlinked/account_deleted` event for each, in the same transaction (design decision 4). Verify lint and typecheck pass for `@repo/api`, and `bun run build --filter=web` passes.

## 4. Moderation API

- [x] 4.1 Add `packages/api/src/services/mod-links.ts`:
  - `addressHistory({ address } | { userId })`;
  - `moveAddress` and `unlinkAddress`, admin only via `isAdmin` as `setUserRole` does, behind `moveRefusal`, under the lock order (design decision 5).

  Add `address_sanctioned`, `address_in_trade`, `address_changed` and `same_account` to `MODERATION_REFUSALS`, with cases in `refuseModeration`. Add `address_move` and `address_unlink` to `AUDIT_ACTIONS` and the `modAudit.action` `$type`. Mount `addressHistory` (moderator), `moveAddress` and `unlinkAddress` in `routers/moderation.ts`, with input schemas in `schemas/moderation.ts`. Verify lint and typecheck pass for `@repo/api`, and `bun run build --filter=web` passes.
- [x] 4.2 Add `linkHistory` and `sharedHolders` (with `sanctioned`) to `accountDossier` in `services/mod-reads.ts`. Verify lint and typecheck pass for `@repo/api`, `bun run build --filter=web` passes, and `moderation.account` for the smoke-test account (read-only) returns both fields.

## 5. Web: link copy

`apps/web/messages/{en,ja,ko}.json` may carry uncommitted entries from other work. Merge into the current contents, and commit only this change's hunks.

- [x] 5.1 In `apps/web/src/lib/refusal.ts`, add the four cases. `cosmo_link_cooldown` reads `data.retryAt` through a reader shaped like `providerOf`, and falls back to a dateless message.

  Add these to en, ko and ja:
  - `api_errors_cosmo_link_address_restricted`, `api_errors_cosmo_link_cooldown`, `api_errors_cosmo_link_cooldown_date`, `api_errors_cosmo_link_unlink_sanctioned` and `api_errors_cosmo_link_unlink_in_trade`, worded neutrally ("restricted by a moderation action");
  - a reworded `link_unlink_description` with the 7-day note.

  `linked-card.tsx` and `link-flow.tsx` already route errors through `refusalText`. Change them only if the wording needs it. Verify lint, typecheck and build pass for `web`.

## 6. Web: moderator console

- [x] 6.1 Add `features/moderation/console/link-history.tsx`, shown with the account's signals. Add also-held-by to `signals.tsx`, marking a sanctioned holder with `SANCTION_LABEL`, and the two audit labels to `features/moderation/labels.ts`. Each address links to its lookup. Add the en, ko and ja messages. Verify lint, typecheck and build pass for `web`.
- [x] 6.2 Add `move-address-dialog.tsx` and `unlink-address-dialog.tsx`, following `revoke-dialog.tsx`:
  - a reason field;
  - the target account's id, resolved to its name before confirming;
  - each dialog's own refusal-to-text mapping.

  Show them for admins only. Verify lint, typecheck and build pass for `web`.
- [x] 6.3 Add `routes/(container)/mod/addresses/$address.tsx` with the staff `beforeLoad` guard copied from `mod/reports.tsx`. It renders `addressHistory` and the current holder, each account linking to `/mod/reports/$userId`. Verify lint, typecheck and build pass for `web`.

## 7. Verify

- [x] 7.1 Run `bun run check`, `bun run build --filter=web` and `bun run knip`. Verify all pass, with no new unused exports or messages.
- [x] 7.2 Browser check at 1280 px and 390 px, read-only: unlink nothing, link nothing, move nothing. Record:
  - `/account/profiles` Unlink confirmation shows the 7-day note;
  - `/mod/reports/$userId` shows link history and also held by;
  - `/mod/addresses/$address` lists events, and gives a non-staff account the not-found surface;
  - the Move and Unlink dialogs open for an admin and are absent for a moderator.

  Check the refusal texts by reading the `refusalText` branches, since triggering them would write.

## 8. AGENTS.md

- [x] 8.1 Update `packages/api/AGENTS.md`:
  - the link lock order (user rows by id, then the advisory lock on `lower(address)`, then history in the same transaction) and that sanction writes lock the user row first;
  - that every link change goes through `services/cosmo-link.ts` or `services/mod-links.ts` so history stays whole;
  - the new refusal codes' homes.

  Update `packages/db/AGENTS.md`: `address_link_event` is append-only and has no FK, and the backfill's two gaps (links made between the migration and the deploy, and past holders who never traded). State that the root `AGENTS.md` and `apps/web/AGENTS.md` are unchanged. Verify lint and typecheck pass for `@repo/api` and `@repo/db`.
