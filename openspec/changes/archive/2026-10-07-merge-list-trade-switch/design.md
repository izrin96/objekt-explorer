## Context

`lists` has two flags. `discoverable` is in production; matching (For you, want alerts in the worker, the offer picker), Market and the trade-block rules read it. `show_on_trade`, `bumped_at`, the feed index on `show_on_trade` and the check `lists_trade_needs_discoverable` all come from migration `20261006165515_icy_alex_power`. That migration is on this branch only and is still waiting to run in production, so no production row or open tab knows `show_on_trade`.

Readers of `show_on_trade` today: the Browse feed and Your posts (`services/trade-feed.ts`), the bump-on-turn-on SQL and the partner bump lookup (`services/list.ts`: `tradeColumns`, `partnerBumpedAt`, `createdBumpedAt`, the list read), list create/update (`routers/list-crud.ts`), and on the web the list form, the edit dialog, the Post a list dialog and the list header badge.

## Goals / Non-Goals

**Goals:**
- `discoverable` becomes the one flag. Every reader of `show_on_trade` moves to it, and the column leaves the schema.
- The rules for bumps on turn-on, idle posts and pair posts stay as they are, keyed on the one flag.

**Non-Goals:**
- Renaming `discoverable` in the database or the API. The UI label changes, the column and field names do not.
- Renaming the `trade.setShowOnTrade` procedure. It already names the switch the user sees.

## Decisions

**Keep `discoverable` and drop `show_on_trade`.** Production, the worker, Market and every matching query already read `discoverable`. Keeping `show_on_trade` instead would touch more code and need a backfill on the column production depends on. The alternative of keeping both and syncing them was rejected, because it keeps the redundancy the change exists to remove.

**One new migration in the pending batch, not a held-back drop.** Past migrations are never edited, so `20261006165515` stays. A new migration generated from the schema drops `lists_trade_needs_discoverable`, `lists_trade_feed_idx` and `show_on_trade`. It creates `lists_trade_feed_idx` again as `(bumped_at DESC NULLS LAST, id) WHERE discoverable`. A second, custom migration (`drizzle-kit generate --custom`) backfills:

```sql
UPDATE lists SET bumped_at = updated_at
WHERE discoverable AND bumped_at IS NULL AND list_type_new IN ('have', 'want', 'sale');
```

Both migrations run with the other pending ones before the deploy. The live production code never reads these columns, so dropping them before the deploy is safe. A held-back drop like `drop_hide_user` exists only for columns the live code reads.

**Backfill `bumped_at` from `updated_at`.** At launch every discoverable list joins Browse. Taking the bump time from the last change orders the launch feed by recent activity, and lets the existing 30-day idle rule hide stale lists. `now()` was rejected, because it would put every existing list at the top of the feed with the same time. The migrations run before the deploy, and the old code never writes `bumped_at`, so a list switched on in between still has none. The feed and Your posts therefore order a post that was never bumped by its last change rather than its creation. Only that small group can move up when edited, and only until its first bump.

**Bump on turn-on keyed on `discoverable`.** `tradeColumns` becomes the column set for a write that sets `discoverable`. It compares the stored `lists.discoverable` (the pre-update row inside `SET`) with the new value, and applies `turnOnBumpedAt` on an off-to-on change. `partnerBumpedAt` reads `p.discoverable`. The pair cooldown behaves as before.

**Partner turn-on only when the link is made.** Today create and update both set the linked list's `discoverable` whenever the saved list asks for it, which re-enables a partner on every save. With one flag that would re-post a list its owner took off Trade. Create (with a link) and update (when `linkedListId` changes) apply the partner's own `resolveDiscoverable` and its turn-on bump. An update that leaves the link alone never writes the partner.

**Older production tabs.** They send `discoverable` and nothing else, which is now the whole switch, so the list input schemas need no shim. `showOnTrade` leaves the input and output list schemas, because no shipped client sends or reads it.

**One rule for "can be on Trade".** `canBeOnTrade(type, isProfileBind)` in `schemas/list.ts` is shared by `resolveDiscoverable`, the form's disabled state, the On Trade badge and the Post a list dialog's reason, because the web may import schemas. The dialog keeps showing the raw flag and lets an unbound list be switched off: an older unbound sale list can still be on Market, which does not check binding.

**Web form: one `SwitchRow`.** It reuses the existing component and message keys where the label fits (`list_create_show_on_trade_label`, `list_create_discoverable_sale_label`). New description keys spell out what the switch turns on per type, plus the linked-list note. Keys that nothing uses any more are removed from en, ja and ko. The header badge and the Post a list dialog read `discoverable`.

## Risks / Trade-offs

- [Browse launches fuller than with an opt-in switch] → the idle rule and the backfill hide anything untouched for 30 days.
- [An owner wanted matching without a Browse post] → that state is no longer offered. The switch description says plainly that it posts the list.
- [The local database has rows with `show_on_trade` off and `discoverable` on] → they become posted locally after the migration, which is expected. Production has no such rows.

## Migration Plan

1. Change `schema.ts` (drop `showOnTrade` and its check; swap the feed index), run `db:generate` for the schema migration, then `db:generate --custom` for the backfill. Apply both locally only, with approval.
2. Production ship order is otherwise unchanged. These two join the pending migrations that run before the web and worker deploy. `20261007090544_drop_hide_user` stays the only post-deploy step.
3. Rollback before the deploy: none is needed, because the live code ignores these columns. After the deploy, rolling the code back to `main` removes Browse entirely, and the data stays valid for it.
