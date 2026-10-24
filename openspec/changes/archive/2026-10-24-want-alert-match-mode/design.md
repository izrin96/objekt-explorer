# Design

## Context

- `notification_pref` is `(user_id, type, enabled)`. A missing row takes `NOTIFICATION_DEFAULTS` (`packages/api/src/schemas/notification.ts`), where `want_match` is on and `have_wanted` off.
- `notifications.prefs` returns `Record<NotificationType, boolean>`. Two places read it:
  - the settings section (`features/account/sections/notifications.tsx`), one `Switch` per type;
  - the bell (`notification-panel.tsx`), for `trade` only.
- The want-alerts job (`apps/worker/src/job/want-alerts`) works in four steps:
  - `fetchPairs` reads candidate pairs; blocks, hidden people, idle lists and Open to are already applied in SQL;
  - `loadContext` adds lists, addresses, holdings and prefs;
  - the pure `selectAlerts` (`apps/worker/src/lib/want-alert-match.ts`) drops pairs and returns `{ alerts, unowned }`;
  - `unowned` entry ids go into `state.recheck` (`want-alert-state.ts`, 24 h, at most `RECHECK_LIMIT` = 20,000), and each run reads them again through `fetchPairs`.
- For you's Mutual is `mutualOf(counts) > 0` (`schemas/trade.ts`), which is `min(tradeTheyHave, tradeYouHave)`. Those are swap counts after the ownership check, so sale lists never count. `recountPartners(userId, sides, "mutual", { ownerIds })` (`services/trade-matches/index.ts`) computes those counts for chosen partners.
- The alert link is built on the client: `notification-items.tsx` passes `search={{ match: "any", list }}`.
- `rename-mutual-to-can-swap` (applied first) shows For you's Mutual as "Can swap" (ko "교환 가능", ja "交換できる"); the alert choice reuses that label so the setting and the page it opens agree. The stored value stays `mutual`.
- The in-flight change `want-buying-only-unpaired` also edits `web-lists` "Want list match option". The scenario this change edits ("Buying only takes a sale list") is the same in both. Whichever change archives second must take the other's text first.

## Goals / Non-Goals

**Goals:**
- Off, Any or Can swap for both alert types, with Can swap meaning exactly what For you's Mutual means.
- No data rewrite in the migration: explicit Off rows stay Off as they are.
- `selectAlerts` stays pure and tested; the job does the I/O.

**Non-Goals:**
- Chasing a match that turns mutual through a list change after 24 hours.
- A per-list setting.
- Caching Mutual results across runs.

## Decisions

1. **Storage: a nullable `match` column, not a mode that replaces `enabled`.**
   - Add `match text` to `notification_pref`, with a CHECK that allows `any`, `mutual` or NULL. NULL reads as `mutual`, and Off stays `enabled = false`.
   - `NOTIFICATION_DEFAULTS.have_wanted` becomes `true`. That alone gives the spec's migration:
     - a missing row or `enabled = true` with NULL `match` means Can swap;
     - an existing `enabled = false` row means Off.
   - New constant: `ALERT_MATCH_DEFAULT = "mutual"`.
   - Alternative: one `mode` enum (`off | any | mutual | on`) in place of `enabled`. Rejected: Offers and Trades only need a boolean, and the bell's `trade` read would have to change.
   - Migration: new, made with `db:generate`. It is not applied without approval.

2. **API: `prefs` returns `{ enabled, match }`, and a new `setAlertMatch` procedure.**
   - `prefs` returns:
     - `enabled: Record<NotificationType, boolean>`;
     - `match: Record<"want_match" | "have_wanted", "any" | "mutual">`.
   - `setPref` stays the boolean switch for every type.
   - `setAlertMatch({ type: "want_match" | "have_wanted", choice: "off" | "any" | "mutual" })` upserts `enabled` and `match` in one statement, so Off followed by Any can't leave a half-written row.
   - Both consumers move to `prefs.enabled.*`.
   - Alternative: an optional `match` on `setPref`. Rejected: it would need a refine for "only alert types", and the UI's single choice would become two fields.

3. **The Mutual check: one recount per recipient per run, outside `selectAlerts`.**
   - New export `mutualPartnerIds(userId, partnerIds)` in a new `services/trade-matches/recount.ts`, which now also holds `recountPartners`, `resolveTradeSides` and `Sides` (re-exported from `index.ts`). `index.ts` and `mutual.ts` import `services/redis`, whose chain reaches `env.ts`, and the worker dies on start if it imports them (`apps/worker/AGENTS.md`); `recount.ts` keeps clear of both. It calls `recountPartners(userId, await resolveTradeSides(userId, undefined, "all"), "mutual", { ownerIds: partnerIds })` and keeps partners with `mutualOf(counts) > 0`.
   - Sides are the ones the alert's link opens: `resolveCompareSides(userId, listSlug, true)`, the alert's list and its linked list, or all lists when it compares one way. So the alert and the page agree. A first cut used all lists, and a review found it alerted for a partner the page did not list (mutual only through another have list).
   - It is not cached: For you's cache is per viewer and short-lived, and the job needs current ownership.
   - The job runs it in three steps:
     1. A pure helper, `mutualQuestions(input)`, applies every check `selectAlerts` makes before mutuality. Those are prefs, sale-list pairs under Can swap, the wanter holding a copy, and ownership. It returns `recipient → partnerIds` for recipients on Can swap.
     2. The job calls `mutualPartnerIds` once per recipient and alert list, four at a time, with `limit` set to the partners asked so the 200-candidate cut never applies. A failed call counts its partners as not mutual for that run (one `warn` per run), so one bad read cannot stall the job.
     3. `selectAlerts` receives `mutual: ReadonlySet<"recipient:partner">` and returns `{ alerts, unowned, notMutual }`.
   - Sale-list pairs under Can swap are dropped without a recheck, since they can never pass.
   - Alternative: a SQL "could be mutual" clause in `fetchPairs`. Rejected: it would duplicate the ownership and Open to rules that `recountPartners` already owns, and would drift from For you.

4. **Recheck: a second list.** `notMutual` entry ids go into `state.mutualRecheck`, with the same 24 h window but its own cap (`MUTUAL_RECHECK_LIMIT`, 5,000), so one-sided matches never push out an entry waiting for its objekt to arrive. Both lists are read through `fetchPairs`, which drops pairs already sent, so an entry that becomes mutual alerts once.

5. **Target: stored on the payload.**
   - `alertPayloadSchema` gets `match: z.enum(["any", "mutual"]).optional()`.
   - `selectAlerts` puts the recipient's choice on each alert, and `mergePayload` keeps the newest one, so a grouped row leads where its latest match was made.
   - The client links with `payload.match ?? "any"`, so rows from before this change keep `match=any`.

6. **UI: `SegmentedChoice` for the two alert rows.**
   - `features/offers/segmented-choice.tsx` is already a radio group drawn as a neutral segmented control, with arrow keys.
   - The alert rows get Off / Any / Can swap under their description. The description changes with the selected choice, and Can swap says it leaves out sale listings.
   - Offers and Trades keep `Switch`.
   - The save is optimistic, like the switches.
   - Below `sm`, the control goes full width on its own line.
   - Alternative: `Select`. Rejected: it hides the choices behind a click, and three short labels fit.

## Risks / Trade-offs

- **Run load.**
  - Default Can swap sends almost every recipient through a recount each run. The cost is one candidates query plus one holdings query per recipient, scoped by `ownerIds`.
  - Mitigation:
    - the check runs only for recipients left after cheap exclusions;
    - concurrency is capped;
    - the heartbeat logs a `mutual checks` count, to watch on staging before prod.
  - If runs pass the 10-minute promise, partners can be cached per recipient for one run interval.
- **Recheck cap.**
  - Most pairs are one-sided, so `mutualRecheck` can fill. Past 5,000 the oldest are dropped with a `warn`, and those matches never alert even if they turn mutual within 24 h. Ownership rechecks are unaffected.
  - Accepted: such a match was one-sided for hours already. The existing "Recheck list full" warning shows when it happens.
- **Reverse alerts turn on for everyone.** Users who never chose start getting Can swap reverse alerts. That is the intended default. Can swap keeps the volume low, and Off is one click away.
- **Spec conflict** with `want-buying-only-unpaired` on the same `web-lists` requirement. See Context.
