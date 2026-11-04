# Design

## Context

See proposal.md (Why) and `specs/web-admin/spec.md` for behaviour.

- **Staff routes.** There is no `/mod` layout. `routes/(container)/mod/reports.tsx` (the console's layout) and `mod/addresses/$address.tsx` each repeat the staff check in `beforeLoad` (`currentUserOptions`, `isStaffRole`, `notFound()`). The API's `moderator` procedure (`packages/api/src/orpc.ts`) refuses non-staff with NOT_FOUND and puts `isAdmin` on the context. There is no admin-only procedure: admin checks live in services (`links.ts` throws FORBIDDEN). The account menu (`components/layout/user-menu.tsx`) links staff to `/mod/reports`.
- **Colour overrides.** `overrideCollection` (`packages/lib/src/server/objekt.ts`) reads the hardcoded `collectionOverrides` map by slug. It is called directly by `collection.ts` (`queryCollections`), `owned.ts`, `list/collections.ts`, `list/read.ts` and `list/entry-view.ts`, and through `mapOwnedObjekt` by `owned.ts`, `transfers.ts`, `activity-feed.ts`, `list/entry-view.ts` and `activity-batch.ts`. The worker's activity relay runs `activity-batch.ts`. Every read that selects colours (`getCollectionColumns`) goes through one of these. `profile-preview` caches counts only. `held-by:v2` (Spin's held list) did cache coloured objekts; it becomes `held-by:v3`, which caches the source rows and colours them after the read (found while applying).
- **Collection list freshness.** `fetchCollectionList` reads `collection:modified-at` from Redis on every request. Last-Modified is the later of that and the newest collection's `createdAt`, floored to the second. `getFullList` keeps one in-process copy of the unfiltered list and rebuilds it when Last-Modified rises or after 5 minutes. The browser holds the list with `staleTime: Infinity` and revalidates through the HTTP cache on page load. Only `process-collection-images` writes the key today.
- **Banners.** `user_address` holds `banner_img_url`, `banner_img_type` and `banner_updated_at`. `profile.edit` sets `banner_updated_at` on every banner change, and deletes the old object (`ownBannerKey`, `deleteFileFromBucket`) only after the row stops pointing at it. An unlink keeps the banner on the row. `anonymizeUser` clears banners and deletes their files. Neither the hover card nor the profile page caches the banner on the server.
- **Audit and notices.** `mod_audit.action` is `text` with a TypeScript union and no CHECK. `labels.ts` maps each of `AUDIT_ACTIONS` to a string and shows an action it doesn't know as stored. The account audit log reads by `target_user_id`. A sanction notice is a `notification` of type `sanction`. Its payload `action` is `warn | chat_mute | trade_block`. It is never grouped, listed under All, and has no preference. Activating it does not navigate (`notification-panel.tsx`).

## Goals / Non-Goals

**Goals:**
- No caller can forget the overrides. Leaving one out fails to type-check.
- A colour save shows in every process's collection list the moment the list's Last-Modified moves, with no stale rebuild cached under the new date.
- The worker stays clear of `env.ts`.
- A later change adds a staff tab by adding one entry and one route.

**Non-Goals:**
- No Redis copy of the override map. The table is tiny and the per-process copy covers it.
- No change to `apps/indexer`, the indexer database or `getTextColor`.

## Decisions

**1. `collection_override` in the app database.** The table has these columns:
- `slug` text primary key;
- `text_color` and `background_color`, each a nullable text with CHECK `~ '^#[0-9a-f]{6}$'`, stored lowercase;
- a CHECK that one of the two is not null;
- `updated_by`, a foreign key to `user` with `ON DELETE SET NULL`;
- `updated_at`.

A reset that leaves both colours null deletes the row. The indexer database was rejected for three reasons:
- AGENTS.md makes `packages/db/src/indexer/` read-only;
- `handleCollection` (`apps/indexer/src/main.ts`) loads and re-saves the whole entity, so an edit could be overwritten in a race;
- a resync from scratch would lose every edit.

`slug` is not a foreign key, since collections live in the other database. The save checks the slug against the indexer and refuses `admin_collection_not_found`.

**2. The seed goes in the same migration.** Run `db:generate` for the table. Append to its SQL an `INSERT … ON CONFLICT DO NOTHING` of the 16 map entries, lowercased, with `updated_by` null. Migrations run before the deploy. The old code keeps using its map, and the new code finds the same values in the table, so there is no gap and no separate production write. A separate script would need its own approval and leave a window with no overrides.

**3. The map becomes an argument.** The new signatures are `overrideCollection(collection, overrides)` and `mapOwnedObjekt(objekt, collection, overrides)`, where `overrides` is a `CollectionOverrides` (`ReadonlyMap<slug, { textColor?, backgroundColor? }>`). Both stay pure and get a test (`objekt.test.ts`). Each service awaits `loadCollectionOverrides()` once per request, beside its query, and passes the map down. `enrichTransfers` loads it too, so the worker needs no change. A required argument is the same guard the serial-anchor code uses. Two alternatives were rejected:
- a module-level map set by middleware is invisible to the worker and to SSR calls that skip the middleware;
- a query per call costs one query per collection row.

**4. One env-free loader with a freshness tag.** It lives in `packages/lib/src/server/collection-override.ts`, imports only `@repo/db`, and keeps one per-process copy:
- the copy holds `{ map, startedAt }`;
- a plain `loadCollectionOverrides()` never waits once the process has a copy. It returns the copy at once, and when the copy is 60 seconds old or more it also starts one read in the background (none when a read is already in flight). A failed refresh logs and keeps the old copy, and the next call starts another. Only the first call of a process, with no copy yet, waits. This keeps the indexer-only reads (owned, held, activity, transfers, `/api/v1`, the worker's live relay) off the app database's pool, whose 30-second connection timeout would otherwise stall them once a minute when that database is slow;
- `loadCollectionOverrides({ freshAfter })` returns the copy only while it is under 60 seconds old and `startedAt > freshAfter`, and otherwise waits for a read, sharing one in-flight read that started after `freshAfter`;
- the choice between serve, serve-and-refresh and wait is the pure `overrideReadPlan` in `collection-override-copy.ts`, beside its test;
- `startedAt` is taken before the query, so a read that began before a save's commit counts as older than that save's bump;
- it returns `{ map, fresh }`. A failed read logs and returns the last good map, or an empty one when there is none, with `fresh: false`, so a database blip costs colours rather than pages.

On the collection-list path a fallback map must not be pinned: `getFullList` would cache it under the current Last-Modified, and browsers would keep getting 304 on wrong colours after the database recovers. So when `fresh` is false, `fetchCollectionList` serves that response without Last-Modified and with `no-store`, and keeps it out of `fullListCache`. Owned, list and activity reads use the fallback as is, since no browser holds them.

`fetchCollectionList` passes the raw `collection:modified-at` milliseconds, not the floored value, as `freshAfter` into `queryCollections`. When a process sees a new bump, it rebuilds the full list and reloads the map in the same step. So a process can never cache old colours under the new Last-Modified. Every other read serves the copy it has and refreshes it once it is 60 seconds old, so in each process, the worker included, a read is behind by at most 60 seconds plus the time since that process's previous read; after a quiet spell the first read serves the old copy and the reads after its refresh lands get the new one. Redis pub/sub invalidation was rejected: the worker would need a subscriber, and the 60 seconds only touch reads the browser does not cache.

**5. The bump.** One function, `bumpCollectionList()` in `packages/api/src/services/collection.ts`. It reads the key and writes `max(now, previous + 1000 ms)` as ISO. Last-Modified is floored to the second, so a bump in the same second as the previous one would otherwise give the same date, and a browser holding that date would get a 304. Colour save, reset and Refresh all call it after the database commit and return `refreshed: boolean`. A Redis failure returns `false`, and the page offers Refresh. `process-collection-images` keeps its own plain write. Two concurrent bumps can both land in the same second, but each is later than every date already served, so the browser still refetches.

**6. Procedures.** A new `adminOnly` builder in `orpc.ts`, `moderator.use(...)`, throws FORBIDDEN unless `context.isAdmin`. A non-staff visitor still gets NOT_FOUND from `moderator`, which now builds on the optional session so a signed-out request is NOT_FOUND too, as the spec's not-found rule asks (it was UNAUTHORIZED; found while applying). A moderator is staff and already knows the area exists, so FORBIDDEN tells them nothing new; `moveAddress` already answers them that way. A new `admin` router (`routers/admin.ts`) is mounted on `/rpc` only, never on `/api/v1`. All its procedures are new, so no open tab sends a changed input.
- `moderator` procedures:
  - `admin.banners({ cursor? })` returns 30 rows and a cursor;
  - `admin.removeBanner({ address, bannerImgUrl, reason })`.
- `adminOnly` procedures:
  - `admin.collection({ slug })` returns the source colours, the override, and who changed it and when;
  - `admin.collectionOverrides()` returns every override row, the latest 50 collection audit entries and `modifiedAt`;
  - `admin.setCollectionColors({ slug, textColor?, backgroundColor? })`, where a value of `null` resets that colour and an absent key keeps it; it returns `{ refreshed }`;
  - `admin.refreshCollections()` returns `{ refreshed, modifiedAt }`.

Refusal codes go in a new `ADMIN_REFUSALS` tuple: `admin_collection_not_found`, `admin_banner_changed` and `admin_staff_target`. Each gets an `api_errors_*` string in en, ko and ja.

**7. Banner feed query.** It selects `user_address` rows with a banner, left-joined to `user` for the account's name, role and `deleted_at`. The order is `banner_updated_at DESC NULLS LAST, id DESC`, with a keyset cursor `{ at: string | null, id }` (a null `at` pages within the null tail by `id`). The migration adds the partial index `user_address_banner_feed_idx ON (banner_updated_at DESC NULLS LAST, id DESC) WHERE banner_img_url IS NOT NULL`. A row names the account by its default profile, the way the console does.

**8. Banner removal.** It runs in one transaction:
1. Lock the `user_address` row by address, `FOR UPDATE`.
2. Refuse `admin_banner_changed` unless `banner_img_url` equals the input URL. This compare-and-set is the same one the banner backfill uses.
3. Read the holder's role and `deleted_at`. Refuse `admin_staff_target` when `staffTargetRefused(role, isAdmin, "dismiss")` is true: a moderator never acts on a staff account, and an admin may act on anyone. The `"sanction"` branch, which also stops an admin acting on an admin, is not used, since a removal is not a sanction.
4. Clear `banner_img_url` and `banner_img_type`, and set `banner_updated_at = now`.
5. Insert `mod_audit`: `action = 'banner_remove'`, `target_user_id` = the holder or null, and `detail = { address, nickname, bannerImgUrl, bannerImgType, reason }`.
6. When a live account holds the row, insert the notice with `group_key = banner_remove:<mod_audit id>`. Sanction notices use `sanction:<user_sanction id>`. A key per event keeps two removals for one account (two profiles) clear of the unique index on unread `(user_id, group_key)`.

After the commit, delete `ownBannerKey(url, S3_PUBLIC_URL, address)` when it matches, logging a failure, in the same order as `profile.edit`. It does not take the user-row lock: no sanction or offer is involved, and the notification insert's foreign-key check takes only `KEY SHARE`.

**9. The notice reuses the `sanction` type.** The changes:
- `sanctionPayloadSchema.action` gains `banner_remove`;
- the payload gains an optional `profile: { address, nickname }`, with `endsAt: null`;
- `sanctionText` words it;
- `notification-panel.tsx` navigates to `/@<nickname or address>` when `profile` is present.

The type already has the shield tile, the All tab, no grouping and no preference, which is what the spec asks for. A new type would need each of those added in four places. `report-help-and-reporter-note` adds its own type and touches none of this.

**10. Audit.** `AUDIT_ACTIONS` gains `banner_remove`, `collection_override` and `collection_refresh`. The `mod_audit` type union gains the same values, with no migration. `labels.ts` gets a label for each, since its `Record` over `AUDIT_ACTIONS` will not compile without one. The two collection actions use `target_user_id` null and `detail = { slug, before, after }` or `{ modifiedAt }`. They never appear in an account log. `admin.collectionOverrides` reads them by `action IN (…) ORDER BY created_at DESC LIMIT 50`, which is small and needs no index.

**11. Web: one tab registry.** `features/moderation/staff-tabs.ts` is pure and tested. It holds `STAFF_TABS`, an ordered list of `{ id, to, label, roles }`, with `visibleTabs(role)` and `canOpenTab(id, role)`. These pieces read it:
- `routes/(container)/mod/route.tsx`, a new layout, runs the existing staff check in `beforeLoad` and returns `{ viewerRole }`, the context `reports.tsx` returns today. `reports/$userId.tsx` reads it for Move and Unlink, so its context is unchanged. The repeated checks in `reports.tsx` and `$address.tsx` go, since the layout covers them. It draws `StaffTabs` above the `Outlet`.
- `StaffTabs` copies `TradeTabs`: real `<Link>` tabs in the vendored `Tabs` with the `underline` variant.
- `mod/index.tsx` redirects to `visibleTabs(role)[0].to`.
- Each tab route checks `canOpenTab` in `beforeLoad` and throws `notFound()` before its loader runs.

The sibling change adds one entry and its routes. The user-menu item points at `/mod`.

**12. Web: pages, built from existing parts.**
- **Collections.** `/mod/collections` is one table over the list the browser already holds (`collectionOptions()`, filtered by member, number or slug), joined in the browser to `admin.collectionOverrides` for the override rows, so there is no search endpoint. That list already carries the overrides, so `admin.collectionOverrides` returns each override row's source colours from the indexer for the struck-through value, and a save, reset or refresh refetches both. The list is read client-side only: `collectionOptions` is a relative GET the server cannot make, so the loader prefetches only the overrides. Since virtua positions rows absolutely, the table is an ARIA table of grid rows sharing one column template rather than a `<table>`. The row's card is the objekt artwork with a corner chip in its background and text colours. It holds every collection, so it is a `virtua` list. Overrides only narrows it to the override rows, newest change first. Each row draws a small card from that list's entry, and while the row is in edit the colours under edit replace its own. Editing is in the row: two hex `Input`s, with no colour picker (chosen in the prototype, variant A). Validation lives in a tested pure `hexColor` in `packages/api/src/schemas/admin.ts`, shared with the input schema. Reset sits beside each overridden colour. There is no per-collection page.
- **Banners.** `/mod/banners` is an infinite grid of tiles (two to three columns by width, variant A in the prototype), each a `BannerThumb` (`features/profile/banner-thumb.tsx`) at full tile width, which already plays a video muted and looping, with a " · " metadata line under it. Remove opens a reason `Textarea` capped by `MOD_REASON_MAX_LENGTH` under its tile, with Remove banner and Cancel, so the banner stays in view while staff write the reason. On success the tile leaves the cache.
- **Addresses.** `/mod/addresses` is a small form whose check is `isAddress`.

All strings are new `m.*` keys in en, ko and ja. Korean uses 합니다체, and Japanese uses a full-width ？ and 。 where English has `?` and `.`.

## Risks / Trade-offs

- [An open tab from before the deploy gets a `banner_remove` sanction notice] → Its `sanctionText` switch has no case, so the row shows the shield and the "from moderators" label without the sentence. It reads correctly after a reload. This is rare and cosmetic.
- [A process keeps old colours for owned objekts, lists and the live feed for up to 60 seconds after a save, longer for the first read after a quiet spell, which serves the old copy while it refreshes] → Accepted. Those responses are not held by the browser, and the collection list, which the browser does hold, is fresh at once (Decision 4).
- [Redis is down at save time] → The override is stored, but the list keeps its old Last-Modified until the next bump, so browsers keep their copies. The page says so and offers Refresh (spec: Refresh fails after the save).
- [The banner file delete fails] → The row no longer points at it, so nothing shows it. The object leaks in the bucket, logged, as with `profile.edit` today.
- [A removed banner is uploaded again at once] → Out of scope (proposal: Non-goals). The second removal is quick, and a pattern goes through reports.
- [Old banners have no `banner_updated_at`] → They sort last. The tail is not ordered by time, which the spec states.
- [Rollback] → The old code ignores the table and still has its map, so colours stay as they were before this change. An account log holding `banner_remove` shows the raw action name (`auditActionLabel` falls back to it), and the old server drops a `banner_remove` notice from the bell's list (`listNotifications` skips a payload it can't parse). Overrides saved after the deploy are lost to the old code until it is deployed again.

## Migration Plan

1. `bun run --filter=@repo/db db:generate` for `collection_override` and `user_address_banner_feed_idx`. Append the seed `INSERT` to the generated SQL. It is expand-only. Apply it locally. It goes to production only with the user's explicit approval, before the deploy.
2. Deploy web, then the worker. A worker on the old code keeps the hardcoded map, which equals the seed, so the order is safe.
3. Remove the map in the same deploy as step 2's code. The seed covers it.
