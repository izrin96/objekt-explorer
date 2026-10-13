## Context

See proposal.md for why. Current state:
- **One row per address.** `user_address` has a unique `user_address_address_idx` on `address` (citext), so an address is linked to at most one account. `user_id` is nullable with `onDelete: "set null"`. An unlinked address keeps its row with `user_id` null, and a relink overwrites `user_id`, `linked_at`, `nickname` and `cosmo_id`. Nothing keeps the earlier holder.
- **All link logic sits in `routers/cosmo-link.ts`.** There is no `services/cosmo-link.ts` yet.
  - `checkAddress` and `generateCode` run `assertAddressNotLinked` before any proof.
  - `verifyStatusMessage` upserts with `WHERE user_id IS NULL` and refuses `cosmo_link_already_linked_other` when that matched nothing.
  - `removeLink` is a bare `UPDATE … SET user_id = null` with no checks.
- **Accounts are never hard-deleted.** Better Auth's `user.delete.before` hook returns false. `anonymizeUser` (`services/account-anonymize.ts`) scrubs the row in one transaction and nulls `user_address.user_id`, after `cancelOpenOffers` and an in-progress-trade refusal (`account-deletion-safety`, implemented after this change, replaces `hasTradeInProgress` with its deletion-state check). `deleteRefusal` (`services/account-delete.ts`) refuses self-deletion under any active non-warn sanction, chat mute included. An admin removal still scrubs a banned account, so an `account_deleted` event can come from a sanctioned account; R1 still applies to its addresses through the link history.
- **Trade snapshots.** `trade_leg.from_addresses` and `to_addresses` are **lowercase `text[]`**, not citext: every address the party had linked at accept. `open` is true until the leg verifies or the trade ends.
- **Reputation follows the address.** Verified counts stay with the account, and unfinished trades follow current links (`services/reputation.ts`, `l.from_addresses && linked.addresses`). The offer-upkeep worker (`apps/worker/src/job/trade-verifier/offer-upkeep.ts`) cancels an open offer naming a specific objekt when its owner is no longer among the party's linked addresses (`token_moved`). Any-copy offers are not touched by an unlink. Lists keep `lists.user_id` when their profile is unlinked.
- **Sanctions.** "Sanctioned" here means an active `trade_block` or `ban`: `activeSanctionWhere` plus the type filter in `notTradeSanctioned` (`services/safety.ts`).
- **Locking in moderation.** `applyModAction` (`services/mod-console.ts`) takes no user lock for `trade_block`. For `ban` it locks the row only inside `syncBan`, after the sanction insert.
- **Admin-only actions.** `setUserRole` checks `isAdmin` inside the service, behind the `moderator` middleware. There is no admin middleware.
- **Moderation refusals.** `MODERATION_REFUSALS` is an unexported tuple in `services/moderation.ts`, and `refuseModeration` assigns the HTTP status per code in a switch. The web maps these codes per component (`act-form.tsx`, `role-control.tsx`, `revoke-dialog.tsx`), not through `refusalText`.
- **Audit actions.** `mod_audit.action` has no CHECK. Its values are `AUDIT_ACTIONS` (`schemas/moderation.ts`) and the `$type` on `modAudit.action`. The web's `auditActionLabel` shows an unknown action as stored.
- **Web error display already exists.** `linked-card.tsx` toasts any unlink refusal through `refusalText`. `link-flow.tsx`'s `StepError` renders `refusalText` at check, generate, renew and verify. New codes need only `refusalText` cases and messages.

## Goals / Non-Goals

**Goals:**
- One pure module decides every refusal.
- One lock order shared by every writer of a link and every sanction write.
- History written in the same transaction as the link change it records.

**Non-Goals:**
- Making history the source of the current holder: `user_address` stays the authority.
- Changing `/rpc` inputs of existing procedures.
- Recovering holders before the backfill beyond what trade snapshots show.

## Decisions

1. **An append-only `address_link_event` table.**
   - Columns: `id bigserial`, `address citext(42) NOT NULL`, `user_id text NOT NULL`, `event text NOT NULL` (`linked | unlinked`), `reason text NOT NULL` (`verified | user | account_deleted | staff_move | staff_unlink | backfill`), `actor_id text`, `created_at timestamptz NOT NULL DEFAULT now()`.
   - CHECKs: one on `event`, one on `reason`, and `(reason IN ('staff_move','staff_unlink')) = (actor_id IS NOT NULL)`.
   - Indexes: `(address, created_at DESC)` and `(user_id, created_at DESC)`.
   - `user_id` and `actor_id` carry **no foreign key**, with a one-line comment as on `message_flag.message_id`: the event outlives the account. (`message_flag.user_id` itself does have a cascade FK; only the comment idiom is borrowed.) Accounts are never hard-deleted today. Without an FK, a future hard delete can't erase the evidence.
   - **Not chosen:** a `previous_user_ids` array on `user_address`. It loses times and reasons, and can't answer "who left when" for the cooldown.

2. **Pure rules in `lib/link-rules.ts`** with `COOLDOWN_DAYS = 7`. All three functions take plain data; the services fetch it.
   - `linkRefusal({ callerId, holders: { userId, sanctioned }[], lastLeave: { userId, at } | null, now })` returns `{ reason: "cosmo_link_address_restricted" }`, `{ reason: "cosmo_link_cooldown", retryAt }` or `null`. Restricted is checked first: it lasts longer and says more.
     - `lastLeave` is the address's newest event when that event is `unlinked` with reason `user`, `staff_unlink` or `account_deleted`.
     - A move writes its `unlinked` and `linked` in one transaction, so a move's newest event is always `linked`, and a move never starts a cooldown.
     - The cooldown refuses while `now < at + 7 days`, for any caller other than `lastLeave.userId`.
   - `unlinkRefusal({ sanctioned, inOpenTrade })` returns `cosmo_link_unlink_sanctioned`, then `cosmo_link_unlink_in_trade`, or `null`.
   - `moveRefusal({ fromId, toId, holderNow, sanctionedEither, inOpenTrade })` returns `same_account`, `address_changed`, `address_sanctioned`, `address_in_trade` or `null`, in that order.
     - A staff unlink calls it with `toId` absent, so `same_account` never applies. It does start a cooldown, since only moves are exempt.

3. **`services/cosmo-link.ts` takes over the writes.** The router keeps every procedure and input shape and calls:
   - `holdersOf(executor, address)`: the distinct `user_id`s in history for the address, plus the current `user_address.user_id`. The current holder covers links made between the migration and the deploy.
   - `inOpenTrade(executor, address)`: `EXISTS` over `trade_leg l JOIN trade t` with `l.open AND t.status = 'in_progress' AND lower(address) = ANY(l.from_addresses || l.to_addresses)`. The `trade_leg_open_idx` partial index keeps the scan to open legs.
   - `recordLinkEvents(tx, rows)`: one insert.
   - `linkVerified(userId, data)`: the old upsert, keeping `WHERE user_id IS NULL` and `cosmo_link_already_linked_other`, behind `linkRefusal`, then a `linked/verified` event.
   - `unlink(userId, address)`: behind `unlinkRefusal`; `UPDATE … RETURNING`, and an `unlinked/user` event only when a row changed.

   `checkAddress` and `generateCode` keep `assertAddressNotLinked` alone, so nothing before the proof hints at a sanction or a cooldown. The new refusals leave the verification key in Redis, as the other verify refusals do.

4. **Lock order.** Every writer follows it, and `packages/api/AGENTS.md` records it.
   1. Lock `"user"` rows in id order: `FOR SHARE` to read sanctions, `FOR NO KEY UPDATE` to write one. `FOR UPDATE` would also block the `KEY SHARE` of a notification insert for that user, so an accept holding an offer row the writer cancels would deadlock with it.
   2. Take `pg_advisory_xact_lock(hashtext(lower(address)))`, in address order when there are several.
   3. Read, write and record history, all in one transaction.

   Each path:
   - **Link:** read `holdersOf` (plus the caller) and lock those rows `FOR SHARE`. Take the advisory lock and re-read `holdersOf`. If the set grew, roll back and retry the transaction once, then refuse `cosmo_link_already_linked_other`. Only then read sanctions and the last leave.
   - **Unlink:** the caller's row `FOR SHARE`, then the advisory lock.
   - **Move and staff unlink:** both rows `FOR SHARE` in id order, then the advisory lock.
   - **`applyModAction`:** `SELECT 1 FROM "user" WHERE id = $1 FOR NO KEY UPDATE` as its first statement, for `trade_block` and `ban`. This must come before the `user_sanction` insert, because the insert's FK check takes only `KEY SHARE`, which doesn't conflict with a linker's `FOR SHARE`. `syncBan` takes the same lock, so its later lock is then a re-lock.
   - **`anonymizeUser`:** its user row `FOR NO KEY UPDATE` as its first statement, before it cancels offers. After the `UPDATE "user"` it reads the account's addresses, takes the advisory lock per address in order, then runs `UPDATE user_address … RETURNING address` and inserts an `unlinked/account_deleted` event for each.
   - **`acceptOffer`:** both parties' rows `FOR SHARE`, then the advisory locks on the addresses it read before the transaction, all before its conversation lock. It re-reads both parties' links. If either set changed, it refuses `links_changed` (an offer refusal), so no unlink lands between the read and the legs' snapshot. Two accepts that involve one person now run one after the other.

   **Why the order is safe.** No path takes a user row after an advisory lock, and `applyModAction` takes one row. So no cycle can form.

   **Not chosen:** `SERIALIZABLE` transactions. They would need retry loops in every caller, including Better Auth's delete hook.

5. **Moderation in `services/mod-links.ts`.**
   - **`moderation.addressHistory`** (moderator) takes `{ address } | { userId }`. It returns events newest first, each with the account named through `fetchPartners`, plus the current holder.
   - **`moderation.moveAddress` and `moderation.unlinkAddress`** check `isAdmin` in the service and throw `FORBIDDEN` otherwise, as `setUserRole` does. Each needs a reason (`MOD_REASON_MAX_LENGTH`).
     - The new codes join `MODERATION_REFUSALS`, each with a `BAD_REQUEST` case in `refuseModeration`.
     - A move writes `unlinked/staff_move` and `linked/staff_move` events with `actor_id`, sets `linked_at = now()`, and leaves `lists` alone.
     - The audit entries: `address_move` on each account, `detail: { address, fromUserId, toUserId, reason }`. `address_unlink` on the account. Both actions are added to `AUDIT_ACTIONS` and the `modAudit.action` `$type`. No migration is needed, since the column has no CHECK.
   - **`accountDossier`** gains:
     - `linkHistory`: events where `user_id` is the account;
     - `sharedHolders`: other `user_id`s with events on those addresses, each with its name and `sanctioned`.
   - The new procedures are new inputs, so open tabs aren't affected.

6. **Web.**
   - **`lib/refusal.ts`** gains four cases. `cosmo_link_cooldown` reads `data.retryAt` through a reader shaped like `providerOf`, and formats the date. Without one it uses a dateless message.
   - **Messages:** `api_errors_cosmo_link_address_restricted`, `_cooldown`, `_cooldown_date`, `_unlink_sanctioned` and `_unlink_in_trade` in en, ko and ja. `link_unlink_description` drops "You can link it again later" for the 7-day note: other accounts wait 7 days, and you can relink at once.
   - **Console.**
     - `link-history.tsx` is a section beside `Signals`, with also-held-by in `signals.tsx` marked using the existing `SANCTION_LABEL`.
     - `move-address-dialog.tsx` and `unlink-address-dialog.tsx` follow `revoke-dialog.tsx`: `ConfirmDialog`, a reason field, and their own refusal-to-text mapping. They show for admins only.
     - The move target is entered as an account id, which the console URL `/mod/reports/$userId` already carries. The dialog shows the resolved name before the admin confirms.
     - `labels.ts` gains the two audit labels.
   - **Route.** `routes/(container)/mod/addresses/$address.tsx` copies the `beforeLoad` staff guard from `mod/reports.tsx`, so non-staff get not-found before any loader runs.

7. **Migrations.** Both are expand-only and held for the user to apply.
   - `db:generate` creates the table.
   - `db:generate --custom` creates the backfill afterwards, so its timestamped folder sorts after the table's. Both run as pending migrations before the deploy.
   - The backfill is a single `INSERT … SELECT DISTINCT ON (address, user_id) … ORDER BY address, user_id, at` over a UNION of:
     - current links: `coalesce(linked_at, now())`;
     - `unnest(from_addresses)` × `from_user_id` and `unnest(to_addresses)` × `to_user_id` at `trade.accepted_at`.

     It keeps each pair's earliest time as `linked/backfill`, guarded by `NOT EXISTS (… address, user_id, reason = 'backfill')` so it can run again safely.

## Risks / Trade-offs

- [Links and unlinks between the migration and the deploy aren't recorded] → `holdersOf` adds the current holder. An unlink in that window starts no cooldown. The window is minutes.
- [Past holders who never traded can't be recovered, including a sanctioned account that unlinked before the migration (the evasion this change targets)] → the first such link after the deploy goes through. Moderators still see the new account's other signals. `lists.user_id × lists.profile_address` is a possible extra source, left out pending the user's call.
- [Any past holder taints for as long as its sanction lasts, including a trade block with no end] → revoking clears it. The refusal names no account, so it reveals nothing.
- [An address linked after a trade's accept isn't in its snapshot, so `inOpenTrade` lets it unlink mid-trade] → verification also counts addresses linked now, so such a transfer stops counting for the party. Rare, and the same as today.
- [The cooldown also blocks a legitimate buyer of a Cosmo account for 7 days] → the decided price. An admin move skips it.
- [Old tabs show `api_errors_unknown` for the new codes] → accepted. The link flow and the unlink toast both still fail closed.

## Migration Plan

1. The user reviews and applies both migrations (table, then backfill) before the deploy. Both are additive, and `main` ignores the table.
2. Deploy `packages/api` and `apps/web` together.
3. Rollback: revert the code. The table stays unused and can be dropped by a later migration.

## Open Questions

- Should a move or unlink that names the admin's own account be refused with `self`, as `applyModAction` does? It changes only one refusal case.
