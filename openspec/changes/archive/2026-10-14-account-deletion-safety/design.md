## Context

See proposal.md for why. Commit ea2e6adb built the scrub. This change keeps it and closes its gaps.

**Dependency.** `cosmo-link-sanction-guard` is applied first. It adds `address_link_event`, and makes `anonymizeUser` write an `unlinked` event with reason `account_deleted` for each address it unlinks, under a per-address advisory lock. Its console dossier gains the account's `linkHistory`. This change relies only on that contract, and records no addresses itself. That change's design still names `hasTradeInProgress`, which decision 2 removes, so merge onto its `anonymizeUser` as it stands after apply.

Current state, checked against the code:

**The scrub** (`services/account-anonymize.ts`, `anonymizeUser(userId)`) runs in one transaction:
1. `cancelOpenOffers(tx, offersOf(userId), "account_deleted")`;
2. `hasTradeInProgress`, which throws `refusalError("trade_in_progress")`;
3. the user row is renamed "Deleted account", given the email `<id>@deleted.invalid`, and has its image, username, socials and `showSocial` cleared and `deletedAt` set;
4. `user_address.user_id` is nulled, and the lists, notifications and both pref rows are deleted.

The scrub does not lock the user row, and it does not re-check sanctions. `cancelOpenOffers` writes a note to both parties, and step 4 deletes the deleting account's note, so only the partner keeps one.

**Refusals** (`services/account-delete.ts`):
- `deleteRefusal(userId)` returns `"sanctioned"` before `"trade_in_progress"`.
- `refusalError` builds a Better Auth `APIError` whose `code` and `message` are both the refusal.
- `DELETE_REFUSALS` (`schemas/user.ts`) is `["sanctioned", "trade_in_progress"]`.

**Better Auth 1.7.7 wiring** (`services/auth.ts`):
- `hooks.before` runs `deleteRefusal` on `/delete-user` and `/delete-user/callback`. On the callback it redirects to `/account/danger?refused=<code>` before the token is spent.
- `beforeDelete` calls `anonymizeUser`.
- `databaseHooks.user.delete.before` returns `false` and anonymizes only when `deletedAt` is unset, which happens on admin removal.
- `session.freshAge` is `0`.

**What the Better Auth source shows** (`dist/api/routes/update-user.mjs`, `dist/api/dispatch.mjs`, `dist/context/create-context.mjs`):
- `/delete-user/callback` calls `consumeVerificationValue` before `beforeDelete`. So a refusal thrown by the scrub comes after the token is spent and returns as JSON. The before-hook already handles a trade accepted between the email and the link; what is left open is the window between that hook and the scrub's transaction.
- `dispatchAuthEndpoint` catches the endpoint's `APIError`, stores it on `ctx.context.returned`, and runs the after-hooks. An `APIError` thrown by an after-hook, `ctx.redirect` included, replaces the response, with its `location` header.
- `POST /delete-user` with `body.token` calls `deleteUserCallback` as a plain function. The callback's hooks don't run, the `/delete-user` hooks do, and the token must belong to the session's user.
- `sendDeleteAccountVerification` runs inside `runInBackgroundOrAwait`, which catches and only logs errors, after the verification row is written. A throw there still returns "Verification email sent".

**Placeholder emails:**
- Discord: `mapProfileToUser` sets `<discord id>@discord.placeholder.local` when Discord gives no email.
- X: Better Auth's provider sets `<id>@twitter.placeholder.invalid` (`createPlaceholderEmail`), and our `mapProfileToUser` doesn't override it.
- Such an account could change its email in General first, but that is a detour this change removes.

**Elsewhere:**
- Offer create (`offer/index.ts`) and accept (`offer/accept.ts`) see a deleted partner only through `chatSafety`, read before their transactions.
- `mod_audit.action` is a `text` column with a TS `$type` union and no CHECK constraint.
- `AUDIT_ACTIONS` (`schemas/moderation.ts`) feeds the console's `AUDIT_LABEL`, which shows an unknown action as stored.

## Goals / Non-Goals

**Goals:**
- The user sees exactly what blocks deletion, and how each blocker ends.
- No refusal ever reaches the browser as raw JSON.
- Placeholder-email accounts can delete.
- No offer or trade can attach to an account mid-deletion.
- Moderators keep the evidence.

**Non-Goals:** hard delete, wallet-level bans, auto-cancelling trades, deleting messages, changing admin removal or `freshAge`, any migration.

## Decisions

1. **One pure module decides.**
   - `packages/api/src/lib/account-deletion.ts`, tested in `account-deletion.test.ts`, imports nothing request-bound.
   - `deletionBlockers({ trades, sanctions, now })`:
     - A trade is `{ id, partnerId, status, acceptedAt, endedAt, verifiedLegs, heldCopies }`. Only an `in_progress` trade blocks. It becomes `{ kind: "trade", tradeId, partnerId, cancelLocked, endsBy }`.
     - `cancelLocked` is `cancelRefusal(trade, false, heldCopies) === "locked"`. `indexer_behind` is transient, so it reads as Cancel available.
     - `endsBy` is `acceptedAt + TRADE_EXPIRE_DAYS` (`schemas/offer.ts`), when the verifier's expiry ends the trade.
     - A sanction is `{ type, expiresAt, revokedAt }`. It blocks unless it is a warning, revoked, or `expiresAt <= now`, the same rule as `activeSanctionWhere`. It becomes `{ kind: "sanction", type, until }`.
     - Blockers sort by `endsBy` / `until` ascending, open-ended last, then by kind and id.
   - `hasDeliverableEmail(email)` is false for a domain ending in `.invalid` (RFC 6761). That covers Better Auth's `*.placeholder.invalid` and the scrub's `deleted.invalid`. It is also false for a domain ending in `.placeholder.local`.
   - `deletionStep(email, sessionCreatedAt, now)` returns:
     - `"send-email"` when the email is deliverable;
     - `"delete"` when `now - sessionCreatedAt < FRESH_SIGN_IN_MINUTES` (10);
     - `"sign-in-again"` otherwise. Exactly 10 minutes gives sign-in-again.
   - `refusalOf(blockers)` returns `"sanctioned"` when any sanction blocks, else `"trade_in_progress"` when a trade does, else `null`. That keeps today's priority.
   - *Alternative:* keep the SQL-only `deleteRefusal`. It can't list blockers, and its rules would drift from the list's.

2. **One loader feeds every check.**
   - `deletionState(executor, userId)` in `services/account-delete.ts` reads:
     - the user's in-progress trades, with their verified-leg counts and `heldCopies` (`services/trade-verify.ts`);
     - their unrevoked, non-warn sanctions.
   - It takes `db` or a transaction.
   - `deleteRefusal(userId)` becomes `refusalOf(deletionBlockers(await deletionState(db, userId)))`. `hasTradeInProgress` goes.

3. **The scrub locks, then cancels, then re-checks.**
   - `anonymizeUser(userId, { self })`. `beforeDelete` passes `self: true`, and the admin-removal database hook passes `false`.
   - Inside its transaction, in order:
     1. `SELECT … FROM "user" WHERE id = $1 FOR NO KEY UPDATE`;
     2. `cancelOpenOffers`;
     3. `deletionState(tx)`.
   - Then it refuses:
     - on a trade blocker, on both paths, as today;
     - on a sanction blocker only when `self`.
   - The lock is `FOR NO KEY UPDATE`, not `FOR UPDATE`. A partner declining an offer holds the offer row, and its notification insert for the deleting account takes `FOR KEY SHARE` on the user row through the foreign key. Under `FOR UPDATE` that insert would wait on the scrub while the scrub waits on the offer row: a deadlock. `FOR NO KEY UPDATE` lets `FOR KEY SHARE` through but still conflicts with the `FOR SHARE` of decision 4. The scrub's own `UPDATE "user"` takes the stronger lock later, once the offers are settled.
   - Admin removal is usually ban, then remove, so checking sanctions there would refuse every banned account and change admin removal.
   - When `self`, it writes the audit entry (decision 7), then the existing scrub, which after the dependency also writes the link events.

4. **Offers can't attach to an account mid-deletion.**
   - Offer create: the first statement of its transaction reads both users `FOR SHARE` (`id`, `deleted_at`), ordered by id.
   - Offer accept: the same read is the `lockUsersShared` that `cosmo-link-sanction-guard` already takes first, ahead of the conversation lock and the fresh offer read.
   - Both go through `lockParties` (`offer/core.ts`), which reads `deleted_at` from that lock. A set `deleted_at` refuses with `not_accepting`, the code a block already gets, so the refusal reads as a block (see `web-chat`).
   - `FOR SHARE` waits on the scrub's `FOR NO KEY UPDATE`, and the scrub takes no conversation lock, so there is no cycle.
   - Accept was mostly covered already: the scrub's cancel and accept's `status = 'open'` update meet on the offer row. Create was not: an offer inserted after the scrub's cancel committed open against a deleted account.

5. **Better Auth hooks.**
   - `hooks.before` on `/delete-user`:
     - `deleteRefusal`, as today;
     - then, when `ctx.body?.token` is absent and `!hasDeliverableEmail(session.user.email)`, `throw refusalError("email_undeliverable")`.
   - Skipping that check when a token is present matters, or Delete now refuses itself.
   - `sendDeleteAccountVerification` also returns without sending to an undeliverable address. That is a backstop only, since Better Auth swallows its errors.
   - `hooks.after` (new): on `/delete-user/callback`, when `ctx.context.returned` is an `APIError` whose `body.code` is in `DELETE_REFUSALS`, it returns `new Response(null, { status: 302, headers: { location: "/account/danger?refused=<code>" } })`. Other paths and other errors pass through.
     - Not `throw ctx.redirect(...)`: dispatch keeps the endpoint's status for an `APIError` from an after-hook, so the browser gets a 4xx with a `Location` it won't follow (checked against 1.7.7). A returned `Response` keeps its own status.
   - `DELETE_REFUSALS` becomes `["sanctioned", "trade_in_progress", "email_undeliverable", "sign_in_again"]`.
     - The codes stay bare, an exception to the domain prefix `packages/api/AGENTS.md` asks of `refuse()` codes: they already travel as Better Auth codes and in `?refused=`, and an open tab's `isRefusal` matches them by value.
     - The `/account/danger` route's `z.enum(DELETE_REFUSALS)` picks up the new codes. An old tab shown a new code falls back to its raw message.

6. **Two procedures in `routers/user.ts`.**
   - `deletionCheck` (authed, no input) returns `{ blockers, openOffers, step }`:
     - trade blockers carry `partner: { userId, name }` from `loadIdentities` (the Chat as name) and ISO dates;
     - `openOffers` counts the offers that `cancelOpenOffers` would cancel. Its `status = 'open' AND expires_at > now()` predicate moves into an exported `openOffersWhere(where)` in `offer/cancel.ts`, shared by both;
     - `step` is `deletionStep(user.email, session.session.createdAt, now)`.
   - `deletionToken` (authed mutation, no input):
     - with any blocker, it refuses with that blocker's code through `refuse("BAD_REQUEST", code, message)`. `DELETE_REFUSALS` joins the `Refusal` union in `lib/refuse.ts`, so the oRPC path and the Better Auth path share one published list (the bare-code exception of decision 5);
     - when `step` is `sign-in-again`, it refuses `sign_in_again`;
     - when `step` is `send-email`, it throws `FORBIDDEN`, which the web never reaches;
     - otherwise it mints `delete-account-<token>`: `generateRandomString(32, "0-9", "a-z")` from `better-auth/crypto`, through `(await auth.$context).internalAdapter.createVerificationValue({ value: userId, identifier, expiresAt: now + 5 min })`, and returns `{ token }`.
   - The client then calls `authClient.deleteUser({ token })`. That goes through the `/delete-user` before-hook (blockers), Better Auth's own token check (it must belong to the session), and the scrub's re-check.
   - Both procedures are new, so no open tab calls them.
   - *Alternative:* a positive `session.freshAge` with the email flow skipped. That makes every sensitive Better Auth endpoint demand a fresh session, for every account.

7. **The `account_deleted` audit entry stays.** It puts the deletion on the console's timeline next to the reports and sanctions.
   - Actor and target are the account itself.
   - `reportIds` holds the ids of the reports still open against it, and `detail` is `{ openReports: <count> }`.
   - It holds no active-sanction count, which would always be 0, since a non-warn sanction blocks deletion. It holds no addresses, which the link history covers.
   - Only the self path writes it.
   - `"account_deleted"` joins the `$type` union in `packages/db/src/schema.ts` and `AUDIT_ACTIONS`. `AUDIT_LABEL` then needs `mod_audit_account_deleted`, which its `Record` type enforces. No migration is needed.

8. **The console.**
   - `accountDossier` returns `account.deletedAt`. `account.tsx` shows a Deleted chip with the date, reusing the console's existing chip or `Badge`.
   - `act-form.tsx` offers only Dismiss when `deletedAt` is set.
   - `applyModAction` refuses any action other than `dismiss` on a deleted account with a new `MODERATION_REFUSALS` code, `deleted_target`, worded in the console's refusal formatter.
   - The dossier's wallets come from the link history. Rendering it is the dependency's work; this change only relies on it being there for a deleted account.

9. **The Danger section.**
   - `danger.tsx` reads `deletionCheck` through a `deletionCheckOptions` query in `features/account/queries.ts`.
   - A new `features/account/deletion-blockers.tsx` renders "Finish your trades first":
     - a trade row is the mono `T-<id>`, the partner name, "Cancel available" or "Cancelling locked, ends by <date>", and a `Link` to `/trade/mine/$tradeId`;
     - a sanction row is its `SANCTION_LABEL`-style name and end date, or "no end".
   - It is a plain list, not a table. Nothing in `features/offers` renders a compact trade row with the cancel state, so a small component is cheaper than bending `trade-view.tsx`.
   - The existing `ConfirmDialog` takes a description listing the open-offer count, what stays with partners, and the unlinking. Delete is disabled while `blockers.length > 0`.
   - The action follows `step`:
     - **Send confirmation email:** `authClient.deleteUser()`, as today.
     - **Delete now:** `deletionToken`, then `authClient.deleteUser({ token })`, then `queryClient.invalidateQueries()` and navigate to `/`.
     - **Sign in again:** `authClient.signOut()`, then navigate to `/login?redirect=/account/danger`.
   - `refusalText` gains `email_undeliverable` and `sign_in_again`, and an unknown code shows the generic translated failure (see `api-errors`), not the server's message. A refusal refetches `deletionCheck`, so a new blocker shows at once.
   - Delete now meets two error shapes. `deletionToken` fails as an oRPC error, whose code is `data.reason`. `authClient.deleteUser({ token })` fails as a Better Auth error, whose code is `error.code` (equal to `error.message`). Both feed `refusalText`.
   - The messages, in en, ko and ja:
     - `auth_account_delete_blockers_title`;
     - `auth_account_delete_cancel_available` and `auth_account_delete_cancel_locked` (`{date}`);
     - `auth_account_delete_sanction_until` (`{date}`) and `auth_account_delete_sanction_no_end`;
     - `auth_account_delete_confirm_offers` (`{count}`), `auth_account_delete_confirm_keeps` and `auth_account_delete_confirm_unlinks`;
     - `auth_account_delete_send_email`, `auth_account_delete_now` and `auth_account_delete_sign_in_again`;
     - `auth_account_delete_email_undeliverable` and `auth_account_delete_sign_in_again_refused`;
     - `mod_audit_account_deleted`, `mod_account_deleted` and the `deleted_target` refusal.
   - `auth_account_delete_account_description` is reworded, since it promises an email to every account.

## Risks / Trade-offs

- **A sanction can race a deletion.** `cosmo-link-sanction-guard`, implemented before this change, makes `applyModAction` lock the target's user row first for `trade_block` and `ban`; this change takes that lock for every action but dismiss. It conflicts with the scrub's `FOR NO KEY UPDATE`, so a sanction and a deletion serialize: whichever commits first, the other sees it (a sanction first refuses the deletion; a deletion first makes the sanction hit `deleted_target`).
- **A spent link after a late refusal.** When the after-hook redirects, the token is already consumed. The user sends a new email once the blocker ends; the spec says the link was spent.
- **`deletionToken` is a bearer token for 5 minutes**, usable only with the same session (Better Auth compares `token.value` with the session's user), and only after the same blocker checks.
- **A send racing deletion.** `chatSafety` is still read outside any lock, so one message sent at the instant of deletion can land. Messages are kept anyway, so this is accepted.

## Migration Plan

Apply after `cosmo-link-sanction-guard` is implemented: decision 3 extends the `anonymizeUser` that change edits. Deploy `packages/api` and `apps/web` together. There is no migration. An open tab keeps the old Danger section: its email path is unchanged, a placeholder account now gets a refusal instead of a false success, and an unknown refusal code shows raw. To roll back, revert the commit. The `account_deleted` audit rows then show as stored.
