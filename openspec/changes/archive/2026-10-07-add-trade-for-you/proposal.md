## Why

Trade matching is a dialog per have or want list. It ranks partners in one direction, so a partner with 9 ⇄ 0 outranks a real 2 ⇄ 2 trade. It counts objekts that have already left the owner's wallet, and it names partners by their site account rather than the Cosmo nickname people know them by. This is phase 1a of the agreed chat and trade roadmap (mockups: `design/chat-and-trade-concepts.html`, §02). It needs no new infrastructure, so it ships before notifications (phase 1b, `add-notifications-and-alerts`), which build on it.

## What Changes

- **`/trade/for-you`:** matches across all of the user's have and want lists, one row per partner account.
  - Both directions are always shown, and partners rank mutual-first.
  - Filters (All, Mutual only by default, They have what I want, They want what I have, one list) replace the Have / Want / Both modes.
- **Current ownership:** an entry counts only while its owner holds a transferable copy, and ranking uses the counts after that check. Entries left out are summarised by reason.
- **Idle and hidden partners:** partners whose lists haven't changed for 30 days rank last, and a partner can be hidden and unhidden.
- **Identity:** partners are named by the Cosmo nickname of their list's bound address, falling back to the account name. Hide User on a list doesn't change this (accepted 2026-10-06, as today).
- **List header:** Trade matches opens `/trade/for-you?list=<slug>` with that list's mutual-partner count. The dialog is retired; `list.findTradePartners` stays for open tabs.
- **Account menu:** a Trade matches item.
- **`lists.updatedAt`:** kept current on list and entry changes, and backfilled from existing data so old lists don't look fresh.

## Non-goals

- Notifications, the per-user socket and want-list alerts (phase 1b).
- The Browse feed, Show on Trade and Bump (phase 2).
- Message and Propose actions (phase 3).
- A primary-nav Trade link. It arrives with Browse, so signed-out visitors don't land on a sign-in wall.

## Routes

`/trade` (redirects), `/trade/for-you`, the list pages `/list/<slug>` and `/@<nickname>/list/<profile-slug>` (header button), and the account menu on every page.

## Capabilities

### New Capabilities
- `web-trade-for-you`: the account-wide match view: ranking, filters, the ownership check, idle ranking, hidden partners and partner identity.

### Modified Capabilities
- `web-lists`: the header's Trade matches button becomes a shortcut to For you with a count.
- `web-shell`: the account menu gains a Trade matches item.

## Impact

- **Database:** new table `hidden_trade_partner`, and `lists.updated_at` (backfilled). One migration, applied locally freely and to production only with approval.
- **`packages/api`:** a `trade` router and a matching service. Ranking and identity live in a pure module tested with `bun test`. List write paths keep `updated_at` current.
- **`apps/worker`:** the outbox drain keeps `updated_at` current when it removes entries.
- **`apps/web`:** the `/trade` routes, the For you view, the list header, the account menu, and en/ja/ko messages. The trade-matches dialog is removed.
