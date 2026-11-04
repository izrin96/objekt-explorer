# Proposal

**Default roles, yours to change:** collection colours and Refresh collection list are admin only; the banner feed and banner removal are open to moderators and admins.

## Why

Staff have one page, the report console. Three jobs have none:
- Cosmo's v3 metadata has no text colour, so the indexer guesses it from the class. Each fix is a code edit and a deploy.
- Making browsers refetch the collection list means setting `collection:modified-at` in Redis by hand.
- Nobody sees the banners people upload, or can take one down.

## What Changes

- **Staff area.** `/mod` becomes one area with a tab strip: Reports (the existing console), Addresses (a lookup field in front of the existing address page), Banners and Collections. Each tab names the roles that see it. A hidden tab's route shows not-found and requests no data. `/mod` opens the viewer's first tab, and the account menu opens `/mod`. Later changes add tabs the same way (`admin-trade-tracking` adds its own).
- **Collection colours.** An admin finds a collection in one table of every collection, and in its row sets the text or background colour as a hex value, or resets either to the source colour. Overrides move from the code map into a new app-database table, `collection_override`, seeded by its own migration with today's 16 entries. The map is deleted.
- **Refresh collection list.** An admin action bumps `collection:modified-at`, so every browser's next load gets the list again instead of a 304. A colour save or reset bumps it too.
- **Banner feed.** Current profile banners, newest first, images and videos, paged. Each links to its profile and, when an account holds the profile, to that account's console page. No history: replacing a banner deletes the old file.
- **Banner removal.** Staff remove a banner with a reason: the banner is cleared, its file deleted, an audit entry written, and the account notified with the reason. It is not a sanction. A profile no account holds gets no notice.
- **Audit.** New actions `banner_remove` (in the owner's account audit log), `collection_override` and `collection_refresh`. The last two have no target account, so the Collections tab shows their recent history.

## Capabilities

### New Capabilities

- `web-admin`: the staff area under `/mod` (tabs, roles, not-found rule, account-menu entry), collection colour overrides, Refresh collection list, the banner feed and banner removal, their audit entries and the removal notice.

### Modified Capabilities

None. `web-moderation`'s console and `web-notifications`' sanction notice keep their rules; the removal notice is added beside them.

## Non-goals

- Band-image overrides (`getBandImageUrl`) stay in code.
- Editing other collection fields, or writing to the indexer database.
- Banner history, or restoring a removed banner.
- Blocking banner uploads. A repeat goes through reports and the sanction ladder.
- Recolouring open tabs: a save shows on the next page load.

## Routes

- `/mod` (opens the viewer's first tab)
- `/mod/reports`, `/mod/reports/$userId` (existing, now under the tabs)
- `/mod/addresses` (new lookup), `/mod/addresses/$address` (existing)
- `/mod/banners`, `/mod/collections` (new)
- The account menu, and the bell for the removal notice

## Impact

- `packages/db`: `collection_override` with its seed; a partial index on `user_address` for the feed. `mod_audit.action` has no CHECK; new values are type-only.
- `packages/lib`: `overrideCollection` and `mapOwnedObjekt` take the override map; a new env-free loader with a per-process cache.
- `packages/api`: a new `admin` router and `adminOnly` procedure, every `overrideCollection` caller, `fetchCollectionList`, the audit and notice schemas.
- `apps/worker`: no code change (`enrichTransfers` loads the map).
- `apps/web`: the `/mod` layout and tabs, new pages, the bell row, the audit label, and en, ko and ja strings.
