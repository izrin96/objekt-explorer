## Context

This change builds on `add-chat`, which must land first: it owns `conversation`, `conversation_member`, `message`, `message_pref`, the `chat` router and the `/messages` UI.

The pieces it builds on:
- **Auth:** Better Auth runs with `username` and `i18n` plugins only. `packages/db/src/auth-schema.ts` is a hand-kept Drizzle copy of its tables.
- **Exclusion pattern:** phase 1's `hidden_trade_partner` is a per-viewer, trade-only hide. Its `NOT EXISTS` exclusion runs in For you stage 1 (`services/trade-matches.ts`) and in the Browse feed stage 1 (`services/trade-feed.ts`).
- **Other readers of lists:** Market reads sale lists in `routers/market.ts`, and want alerts run in `apps/worker/src/job/want-alerts.ts`.
- **Notifications:** the `notification` table stores the `type` as text, checked by a zod union. The payload is data only, and the client words it.

## Goals / Non-Goals

**Goals:**
- Moderators can act without reading inboxes.
- Every sanction takes effect through one shared predicate, so no surface forgets it.
- Every moderator action is audited.

**Non-Goals:**
- Automated sanctions.
- Machine-learning classification.
- Appeals.
- Moderating list text.

## Decisions

### D1. Roles through Better Auth's admin plugin, with custom access control
Add `admin()` with `createAccessControl`, starting from `defaultStatements`, and grant **no plugin permission to any role**: `user`, `moderator` and `admin` alike. Every `/api/auth/admin/*` endpoint, impersonation included, is therefore refused for everyone, so every sanction and role change goes through our audited `moderation` router.

`auth-schema.ts` gains the plugin's columns: `user.role`, `banned`, `ban_reason`, `ban_expires`, and `session.impersonated_by`. The last stays unused, but the plugin expects it. The plugin keeps two jobs: owning those columns, and refusing new sessions for a banned user (lifting an expired ban at sign-in).

Bans, unbans and role changes are written by the moderation router through Better Auth's server-side internal adapter: it updates the user columns and deletes the user's sessions in the same transaction as the audit row. The ban columns are always recomputed from the user's remaining active `ban` sanctions, so revoking one ban never lifts another.

Before wiring it, the implementer checks the installed version's option names (`ac`, `roles`, `adminRoles`, `bannedUserMessage`) with `ctx7` and the `better-auth-best-practices` skill.

*Alternative:* our own `role` column plus a session hook. Rejected: it duplicates ban handling and session revocation that the plugin already does correctly.

### D2. Ban message with reason and date
Better Auth 1.7.7 accepts `bannedUserMessage` as a function of the user. Ours returns JSON `{ reason, until }`, so the plugin's `BANNED_USER` error carries it. The web parses it with `parseBanNotice` and words it in the viewer's language. An invalid date falls back to a generic "banned" message.

The plugin checks bans only after the password check passes, so a wrong password never reveals a ban. `BANNED_USER` is kept out of the i18n plugin's translations, or the plugin would replace the JSON.

*Alternatives:*
- A signed-token follow-up call: unneeded now that the message can be a function.
- A public lookup by email: it reveals anyone's ban status.

### D3. Tables
- **`user_block`:** `(blocker_id, blocked_id)` primary key, `created_at`, and an index on `blocked_id`.
- **`report`:**
  - `id`, `reporter_id`, `target_user_id`, `conversation_id` (null for profile reports);
  - `reason`: a text CHECK over the five reasons;
  - `note` (up to 500 characters);
  - `excerpt jsonb` (null when not shared): at most 20 `{ fromTarget, body, card, at }` entries, copied at report time;
  - `status`: `open`, `dismissed` or `actioned`;
  - `created_at`, `resolved_by`, `resolved_at`;
  - index `(status, target_user_id)`.
- **`message_flag`:** `id`, `user_id` (the sender), `message_id`, `category` (`send_first` or `outside_payment`), `created_at`.

  The console reads counts by `user_id` and `category` only. No query joins `message_flag` to `message` text.
- **`user_sanction`:**
  - `id`, `user_id`;
  - `type`: `warn`, `chat_mute`, `trade_block` or `ban`;
  - `reason`, `expires_at`, `issued_by`, `created_at`, `revoked_at`, `revoked_by`;
  - partial index `(user_id, type) WHERE revoked_at IS NULL`.

  A ban is mirrored here for history. The plugin's `user.banned` stays the enforcement point for bans.
- **`mod_audit`:** `id`, `actor_id`, `action`, `target_user_id`, `report_ids int[]`, `detail jsonb`, `created_at`.
- **`message.caution text[]`** (nullable): the categories matched at send time, shown to the recipient. This is the only per-message trace.

Foreign keys:
- reporter and target cascade on account delete;
- `issued_by`, `resolved_by` and `actor_id` are `SET NULL`, so audit history survives a moderator leaving.

### D4. One predicate per rule
`packages/api/src/services/safety.ts` exports SQL fragments, used everywhere a rule applies:
- `notBlockedEither(viewerId, otherUserIdColumn)`;
- `notTradeBlocked(userIdColumn)`: `NOT EXISTS (… type='trade_block' AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now()))`;
- `activeChatMute(userId)`.

The call sites:
- `trade-feed.ts` stage 1 and `collectionPostCounts`;
- `trade-matches.ts` stage 1;
- `market.ts` (the summary, listings and stats);
- `chat.start` and `chat.send`, and the `chat.list` filter for the blocker;
- `want-alerts.ts` pair selection, through a copy of the fragment in the worker, which already imports `@repo/api`.

A sanction or block bumps:
- the affected users' trade version keys (`bumpTradeVersion`);
- a `market:v` version folded into Market's cache keys, so cached floors drop the seller at once.

The implementer checks how `market.ts` caches today and folds the version into those keys.

### D5. Scam patterns
`lib/scam-patterns.ts` is a pure, tested module. It holds case-insensitive patterns per category, with English, Korean and Japanese phrasings:
- **send first:** "send first", "you send first", "먼저 보내", "先に送";
- **outside payment:** payment app names (wise, paypal, venmo, toss, kakaopay, paypay) and payment-link hosts.

`chat.send` runs it on the body. Matches set `message.caution` and insert `message_flag` rows in the same transaction. The thread output sends `caution` only on messages the viewer received.

Patterns favour recall. A false positive costs one caution line and a flag a moderator can ignore.

### D6. Reports and excerpts
`moderation.report` checks these limits:
- the reporter is a member of the conversation when one is given;
- one report per reporter and target per 24 h.

It copies the excerpt inside the transaction, so later account deletion or message changes can't alter evidence the reporter chose to share. "Also block" inserts `user_block` in the same transaction.

### D7. Moderator API and console
The `moderation` router has an oRPC `moderator` middleware: session role `moderator` or `admin`, otherwise NOT_FOUND, so the route's existence isn't confirmed.

Procedures:
- `queue()`: open reports grouped by target with reason counts;
- `account({ userId })`: signals, reports with excerpts, flags by category, sanctions, audit;
- `act({ userId, action, days?, reason })`: resolves the open reports and audits;
- `revoke({ sanctionId, reason })`;
- `setRole({ userId, role })`: admin only;
- user-facing: `block`, `unblock`, `blocked()`, `report`, `banNotice`.

The web routes are `routes/(container)/mod/reports.tsx` and `mod/reports/$userId.tsx`. `beforeLoad` reads the session role and throws `notFound()` before any loader runs.

### D8. Notices
A new notification type `sanction` is added to the phase 1 union, with payload `{ action, reason, endsAt }` and `group_key` null. It is created for warn, chat mute and trade block.

The chat thread output carries `sendBlocked: { reason, until } | null` for the viewer, which the composer renders as the mute notice.

### D9. First admin
A script, `packages/api/scripts/set-role.ts`, is run as:

```
bun run --filter=@repo/api set-role <username> <role>
```

It prints the database host and asks for confirmation before writing. It refuses a non-localhost host unless `--production` is passed. Running it against production is the user's own step at ship time.

## Risks / Trade-offs

- **[Risk] A surface forgets the trade-block filter.** Mitigation: the shared fragments in D4. Tasks list every call site, and a grep check finds list reads in `market.ts`, `trade-*.ts` and `want-alerts.ts` that lack them.
- **[Risk] The admin plugin adds `/api/auth/admin/*` endpoints.** Mitigation: custom access control grants nothing to `user`, there is no impersonation anywhere, and a task tests that a normal session gets 403 on each admin endpoint.
- **[Trade-off] A reporter can share a misleading slice.** This is accepted by decision Q14. The excerpt is always the latest 20 messages, never a hand-picked set, which limits cherry-picking.
- **[Trade-off] Flags record only a category, so moderators can't verify a flag without an excerpt.** This is intended.
- **[Risk] Ban messaging differs across Better Auth versions.** Mitigation: D2 has a fallback, and a task verifies the sign-in flow end to end on local.

## Migration Plan

1. One migration, generated after `add-chat`'s:
   - the auth columns;
   - five tables;
   - `message.caution`.

   It is applied locally only.
2. At ship, after all earlier migrations, the user runs `set-role` against production for the first admin.
3. Rollback: drop the five tables and the column. The auth columns can stay; unused, they are harmless.
