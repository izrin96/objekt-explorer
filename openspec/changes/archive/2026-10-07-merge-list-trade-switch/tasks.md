## 1. Database

- [x] 1.1 In `packages/db/src/schema.ts`, drop `showOnTrade` and the `lists_trade_needs_discoverable` check, and define `lists_trade_feed_idx` on `(bumpedAt desc, id) WHERE discoverable`; run `db:generate` and confirm the new migration only drops the check, the old index and the column and creates the new index; lint + typecheck pass for `@repo/db`
- [x] 1.2 Add the backfill with `db:generate --custom` (`UPDATE lists SET bumped_at = updated_at WHERE discoverable AND bumped_at IS NULL AND list_type_new IN ('have','want','sale')`); confirm both migrations sort after `20261007100900_chat_as` and that no past migration changed
- [x] 1.3 With the user's approval, apply both migrations to the local database only (`.env.local`); confirm `show_on_trade` is gone and the discoverable lists that had no bump time now have `bumped_at = updated_at`

## 2. API

- [x] 2.1 `services/list.ts`: `tradeColumns` keyed on `discoverable` (off-to-on bump against the stored row), `partnerBumpedAt` reads `p.discoverable`, `createdBumpedAt` unchanged in shape, list read selects no `showOnTrade`; typecheck passes for `@repo/api`
- [x] 2.2 `schemas/list.ts`: remove `showOnTrade` from the list output and the create/update inputs; fix every resulting type error; lint + typecheck pass
- [x] 2.3 `routers/list-crud.ts`: create and update set `discoverable` via `resolveDiscoverable` with the turn-on bump; the linked partner is turned on (own rule, own bump) only on create with a link or when `linkedListId` changes, never on an unchanged-link save; lint + typecheck pass
- [x] 2.4 `services/trade-feed.ts`: the feed, Your posts, bump and `setShowOnTrade` read and write `discoverable` (off takes the list out of matching and Market too); lint + typecheck + `bun test` pass for `@repo/api`
- [x] 2.5 Verify against the local dev server (read paths for real, writes on the local test accounts only): turning a want list on posts it to `/trade` and For you matches it; turning it off removes both; a sale list on shows on Market and as WTS; editing one half of a pair leaves the other half's switch alone

## 3. Web

- [x] 3.1 `features/list/list-form.tsx`: one switch row (Show on Trade on have and want, Show on Market on sale), disabled with the reason when it cannot be on; drop `showOnTrade` from the draft and `edit-list-dialog.tsx`; lint + typecheck + build pass for `web`
- [x] 3.2 Messages in en, ja and ko: per-type descriptions that name what the switch turns on, plus the linked-list note; remove the keys nothing uses any more (the discoverable descriptions, `list_create_show_on_trade_desc`, `list_create_show_on_trade_sale_desc` and `trade_post_sale_hint` if unused); `paraglide:compile` and typecheck pass
- [x] 3.3 `features/trade/post-list-dialog.tsx` and `features/list/list-header.tsx` read `discoverable`; the dialog's sale row says it also leaves Market when turned off; lint + typecheck + build pass
- [x] 3.4 Browser check with browser-use on the dev server: the create and edit dialogs show one switch per type with the right label and description, the switch is disabled on an unbound have list, and Post a list and the On Trade badge follow the switch; no console errors

## 4. Checks

- [x] 4.1 Full checks: `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build --filter=web` and `openspec validate merge-list-trade-switch --strict` all pass, and no code outside past migrations and their snapshots reads the `show_on_trade` column or a `showOnTrade` field
