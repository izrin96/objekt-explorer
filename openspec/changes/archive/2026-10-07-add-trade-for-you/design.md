## Context

See proposal.md for why. The current state that shapes the approach:

- **Matching** lives in `packages/api/src/services/trade.ts`. `fetchSingleDirectionPartners` and `fetchPairedPartners` match one anchor list by `collection_slug` and cap at 50 partners. `buildTradePartnersResponse` groups by `userId` and names partners with `toPublicUser`. `list.findTradePartners` is the only caller, and open tabs still send its `{ slug, mode }` input.
- **Data shape** (production snapshot, 2026-10-06): 554k list entries, of which about 400k name a collection rather than a specific objekt. There are 98 discoverable have lists, 149 want lists and 161 sale lists. A single want list can hold thousands of collections.
- **Ownership** is partly handled already: the worker's outbox drain (`apps/worker/src/job/drain.ts`) deletes token entries from profile-bound lists once the token leaves that address. Unbound lists and collection entries are never cleaned. The indexer has `idx_objekt_owner_collection_id (owner, collection_id)`, which answers "does this owner hold a copy" by index.
- **Lists** have no `updated_at`. The list pages guard sign-in in `beforeLoad` with `currentUserOptions`, and redirect to `/login?redirect=<href>`.
- **Local development:** the app database is a local Docker postgres holding a trimmed production copy. The indexer is production, reached read-only through `.env.local`. So the full flow, writes included, runs locally against real-shaped data.

## Goals / Non-Goals

**Goals:**
- One matching service that phase 1b's alerts and phase 2's Browse feed can reuse.
- Ranking, filtering and identity in a pure module that `bun test` covers.
- Ranking that never shows a partner above another because of objekts they no longer own.

**Non-Goals:**
- Precomputing matches into tables. Caching first; see Risks.
- Changing `list.findTradePartners`.

## Decisions

### D1. Two-stage matching: aggregate and pre-rank in SQL, then check ownership and rank in TypeScript
**Stage 1 (app database).** A new `services/trade-matches.ts` takes the user's have and want lists and joins them on `collection_slug` against other accounts' discoverable lists. When the `list` filter names a list, that list replaces the user's side only in its own direction, and the other direction keeps all of the user's lists of the other type (see the spec's Filters requirement). Without this rule, a single list could never have a mutual partner:
- partner have and sale lists against the user's want lists;
- partner want lists against the user's have lists.

Hidden partners are excluded. One `GROUP BY partner user_id` returns, per partner:
- both counts;
- the matched entries as JSON arrays of `(listId, collectionSlug, objektId)` per direction, including the user's own have entries that partner wants;
- `max(lists.updated_at)` over the partner's matched lists.

The query orders by the active filter's key and keeps the top 200 candidates:
- All and Mutual only: `least(a, b) desc, a + b desc`;
- They have what I want: `a desc`;
- They want what I have: `b desc`.

Aggregating in SQL keeps a large want list from shipping hundreds of thousands of rows to Node. A `HAVING` clause per filter drops partners who can't pass it before the limit. Each candidate carries the `updated_at` of each contributing list, so idleness is judged only on lists that still contribute a kept match after D2. The user's own have entries for the ownership check come from a separate small query, not from the stage 1 JSON.

**Stage 2 (indexer + TypeScript).** The ownership pass (D2) recomputes the counts. The pure module then applies the filter, ranks by the spec's order with idle partners last, and cuts to 50.

*Alternatives:*
- Rank in SQL, then check ownership: a partner whose matches are mostly sold would hold a top slot. That's the bug this design avoids.
- Return raw rows and do everything in TypeScript: too many rows for large want lists.
- Extend `fetchPairedPartners`: it's tied to one anchor and requires linked pairs, the restriction we're removing.

### D2. Ownership pass as one indexer query
For the ≤200 candidates, resolve the addresses of every account involved (partners and the user) from `user_address.user_id`. One indexer query returns:
- the transferable `(owner, collection_slug)` holdings for those addresses, restricted to the candidates' matched collections;
- the `owner` and `transferable` flag of every matched `objekt_id`.

An entry is kept or dropped by the spec's Current ownership rule. Dropped entries are counted per reason (`not_owned`, `not_transferable`) for Not shown: the user's own entries once, and each partner's once per partner, across all ≤200 candidates. The pure helpers are `entryVerdict`, `collectionVerdict`, `recount` and `countDropped` in `packages/api/src/lib/trade-rank.ts`. Because the query is restricted to matched collections, it never scans whole wallets.

*Alternative:* extending the outbox drain to unbound lists. That deletes user data the user never asked to delete, and still doesn't cover collection entries.

### D3. Caching with a per-user version
The result is cached through `getCache` in `services/redis.ts` under `trade:foryou:<userId>:<version>:<filter>:<list|all>`, with a 300 s TTL. `<version>` is an integer at `trade:foryou:v:<userId>`. It's incremented on any of the user's own list or entry mutation (through `touchList`) and on hide or unhide, which invalidates every filter at once without scanning keys.

`listMatchCount({ slug })` is the length of the cached Mutual-only result for that list, under the D1 rule that the named list only replaces its own direction. A list page reuses the same entry as the For you page it links to. Partner edits appear within the TTL, as the spec's 5 minutes allows. The client queries use `staleTime: 0`, so every visit asks the server, which answers from this cache.

### D4. Identity
`toPartnerIdentity(partner, matchedLists, addresses)` in the pure module picks:
- the nickname of the best-matching list's `profile_address`, unless that address has `hide_nickname`;
- otherwise the account name.

Other bound nicknames are listed as "also". Avatar and socials come from `toPublicUser` as today. `lists.hide_user` is deliberately not consulted: the user accepted this on 2026-10-06.

### D5. `lists.updated_at` and `hidden_trade_partner`
- **`lists.updated_at`:** `timestamp with time zone not null default now()`. The migration backfills it to the greater of the list's `created_at` and its newest entry's `created_at`.
- **Keeping it current:** `touchListWith(redis, listIds)` in `packages/lib/src/server/list-touch.ts` sets it and bumps the owner's D3 version (`tradeVersionKey`, `bumpTradeVersion`). It lives in `@repo/lib` because the worker can't import `@repo/api`. `touchList(listIds)` in `packages/api` wraps it.
  - It runs **after** the write commits and takes no transaction. Bumping inside the transaction would let a request rebuild the cache from pre-commit data and keep it for the TTL.
  - It's called on entry insert and delete, price and QYOP edits, and list create, edit and delete (delete bumps the version directly). The outbox drain's cleanup and its weekly full scan call it too, since a removed entry means the owner traded the objekt.
  - Application code rather than a trigger keeps every write path visible in review.
- **`hidden_trade_partner`:** `(user_id, hidden_user_id)` primary key, both foreign keys to `user` with cascade on delete, plus `created_at` and an index on `hidden_user_id`.

### D6. Client
- **Routes:** `routes/(container)/trade/index.tsx` redirects to `/trade/for-you`. `trade/for-you.tsx` uses `validateSearch` with `filter` (`all` | `mutual` | `they_have` | `they_want`, default `mutual`) and `list` (string, optional). It uses the same `beforeLoad` guard as `list/index.tsx`, and a loader that prefetches with `staleTime: "static"`.
- **Rows:** the `Collapsible` partner row and `ObjektCard` thumbnails from `features/list/trade-matches/content.tsx` move to `features/trade/` and gain the mutual score, my-list labels, the idle marker and Hide. The dialog wrapper (`trade-matches/index.tsx`) is deleted. `list.findTradePartners` and its schemas stay for open tabs.
- **List header:** the Trade matches button becomes a `Link` showing `listMatchCount`.
- **Account menu:** `user-menu.tsx` gains Trade matches.
- **Shared constants:** `TRADE_FILTERS`, `TradeFilter`, `DEFAULT_TRADE_FILTER` and `CARD_LIMIT` live in `packages/api/src/schemas/trade.ts`, the only `@repo/api` path TanStack Start lets the client import.
- **Row extras:** an expanded row lists its Not counted entries. Hide shows an Undo toast, and the hidden-partners dialog names partners by nickname.

## Risks / Trade-offs

- **[A huge want list makes stage 1 slow]** → It joins on the indexed `list_entries.collection_slug` and returns at most 200 aggregated rows, and D3 caches the result. Measure it with the local copy of production data. If p95 is over 1.5 s, precompute in the worker as a follow-up.
- **[A partner who would rank in the top 50 after ownership is outside the 200 pre-ranked candidates]** → They would need their raw counts to sit below 200 others' while their owned counts beat 50 of them. That's unlikely with today's 400 discoverable lists. The 200 is a constant that can be tuned against local data.
- **[Missing a write path makes a list look idle]** → All writes go through one helper, and a task greps every `update(lists)`, `insert(listEntries)` and `delete(listEntries)` site.
- **[The cross-database round trip]** → It's one batched query per cache miss, hitting `idx_objekt_owner_collection_id`.

## Migration Plan

1. Generate the migration with `db:generate` (`hidden_trade_partner`, `lists.updated_at`, plus the backfill as custom SQL). Apply it to the local Docker database. Apply it to production only with the user's approval.
2. Deploy API, web and worker together. The worker change only adds `updated_at` writes.

**Rollback:** redeploy the previous images. The new table and column are additive, and old code ignores them.
