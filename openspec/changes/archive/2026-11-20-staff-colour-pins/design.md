## Context

See proposal.md for why. The current state this design builds on:

- Staff colours live on the indexer's `collection` row: `text_color` / `background_color` hold the colour shown, `source_text_color` / `source_background_color` (Drizzle-owned, in `schema.graphql` and the model) hold the value a staff colour replaced, null where the source applies. The `collection_staff_colors` check requires `#rrggbb` lowercase in a colour whose source is set. The indexer's upsert writes back every model column with the values it loaded, and survives a concurrent staff write only because each batch runs SERIALIZABLE (`apps/indexer/AGENTS.md`).
- Staff writes go through `setCollectionColors` (`packages/api/src/services/admin/collections.ts`): `lockColourRow`, the pure `planColourWrite` (`@repo/lib/collection-colours`), `writeColourSet`, and a `collection_override` `mod_audit` entry committed before the indexer commits.
- The worker's `collection-media` apply phase (`apps/worker/src/job/collection-media/apply.ts`) reads `collection_media` and runs `planMediaWrite`, which writes Cosmo's text colour only where `source_text_color` is null. It never writes `background_color` or `source_*`, and writes no audit entries.
- Background comes from Cosmo's v3 metadata at first index and is never rewritten on an existing row, so the source background is Cosmo's metadata colour. Session `accent_color` agrees with it on 9,728 of 9,735 recorded collections.
- The `worker-collection-media` capability exists only in the unarchived `cosmo-qr-collection-media` change.

## Goals / Non-Goals

**Goals:**

- One pure module decides every colour outcome (staff save, reset, pin, Cosmo resolving a fill, grouping, suggestions), shared by the API and the worker and covered by `bun test`.
- The worker changes a staff colour only when Cosmo's colour equals it. That drop restores nothing a person chose, and the history records it.

**Non-Goals:**

- Using session `accent_color` for backgrounds.
- A replay of pins after an indexer rebuild. The audit entries carry the pins, so a later replay can read them.
- Suggesting a background: Cosmo's background is the source, known for every member.
- Applying a suggestion without a person.

## Decisions

**Pins as two nullable booleans on the indexer row.** Add `text_color_pinned` and `background_color_pinned` (`boolean`, nullable, null and false both unpinned) to `collection` through a new guarded migration in `packages/db/indexer-migrations`, styled after `20261104150000_collection_colour_source` (existence checks, `lock_timeout` 5 s). Add them to `schema.graphql` and the model, so a generated Subsquid migration never drops them. Extend `collection_staff_colors`, or add a second check, so that `text_color_pinned IS NOT TRUE OR source_text_color IS NOT NULL`, and the same for background.
- Nullable rather than `NOT NULL DEFAULT false`: the indexer creates collections through the model, with the field undefined, and an upsert that writes NULL into a NOT NULL column would fail every batch.
- A pin column rather than an app-database table: the colour and its source already sit on this row under one lock, and reads never touch the app database for colours.

**Cosmo's colour.** Text: `collection_media.text_color`, lowercased; null is unknown. Background: the row's `source_background_color` when set, else `background_color`, trimmed and lowercased. `@repo/lib/collection-colours` gets `normaliseColour` (trim, lowercase, `#rrggbb` or null) for both sides of every comparison.

**One planner.** In `@repo/lib/collection-colours`:
- `ColourRow` gains `textColorPinned` / `backgroundColorPinned`.
- `OverrideColours`, the audit shape, gains `textPinned` / `backgroundPinned`. Older entries without them read as unpinned.
- `ColourInput` gains optional `textPinned` / `backgroundPinned`.
- `planColourWrite(row, input, cosmo)`: a reset of a colour whose Cosmo colour is known writes that colour with the source and pin cleared; otherwise it puts back the kept source as now. A pin on a colour with no override after the plan is dropped.
- New `planCosmoResolve(row, cosmo)`: for each unpinned override whose normalised value equals Cosmo's, set the colour to Cosmo's normalised value and clear its source; otherwise nothing.
- `differsFromCosmo(row, cosmo)`: the listing test.
- `groupKey(row, kind)`: artist, season, collection number, the colour kind, the staff colour and Cosmo's colour, all normalised. Differs from Cosmo groups by it.
- `suggestSiblings(members)`: given one collection number's members (slug, shown text colour, whether a staff text colour exists, Cosmo's text colour), returns the agreed Cosmo colour, the read slugs and the unread slugs whose shown colour differs, or nothing when read members disagree or none is read.
- `planMediaWrite` keeps its rule (text only where `source_text_color` is null). The resolve is a separate step, not a widening of `planMediaWrite`, so the media apply never touches an overridden row.

**Worker resolve step.** A new step in the apply phase, after the media apply and without a Cosmo call:
1. Read overridden, unpinned rows (about 200), and their `collection_media.text_color`.
2. Plan read-only.
3. For each row with a plan: `lockColourRow`, plan again under the lock, insert the `collection_override` entry (`actorId` null, `detail.by = "cosmo"`) in the app database and commit it, then `writeColourSet`. This is the order `setCollectionColors` uses, so no colour changes without history.
4. One `bumpCaches` after any write, as the media apply does.

The worker inserts into `mod_audit` through `@repo/db` directly. `audit()` lives in `packages/api`, which the worker does not import. The detail shape comes from the shared `OverrideColours`, so the two writers cannot drift.

**API.**
- `setCollectionColors` reads the slug's `collection_media.text_color` before locking and passes it to the planner.
- The input schema gains the two optional pins.
- `setCollectionColorsMany` takes up to 50 entries `{ slug, input, expected }` and runs each through the same lock, plan, audit and write as `setCollectionColors`, one row at a time. `expected` is the row's colour, source and pin as the list showed them; a row that no longer matches is skipped and returned by slug. Group Pin, group Reset and Apply all use it, so there is one write path. Each entry's audit detail may carry `from`, the read slugs a suggestion came from (all of them, since they agree).
- `collectionSuggestions` reads every `collection_media` slug with a text colour, joins the indexer rows of the same artist, season and number, and runs `suggestSiblings` per number. `collection_media` (app database, about 9.8k slugs with a text colour) and `collection` (indexer, about 16.9k rows) live in different databases, so this is two reads joined in memory: the indexer read takes artist, season, number, slug, text colour and source for every row. On 2026-11-20 it gives 22 numbers and 167 members, 153 of them Event or Double; 17 numbers have read members that disagree, and 3 unread members are left out because they have a staff text colour.
- `collectionOverrides` returns, per overridden row, the pins and Cosmo's text and background colour. One `inArray` read of `collection_media` for the overridden slugs.
- `differs` is computed on the server with `differsFromCosmo`, so the filter and the count use the planner's own rule.

**Web.**
- Edit gains a Pin checkbox per colour (the kit's `Checkbox`). Its default is the stored pin, else checked when Cosmo's colour is known.
- The row shows Cosmo's colour as a third swatch line and a pin mark.
- Differs from Cosmo is a second `Toggle` beside Overrides only, carrying its count. It shows one entry per `groupKey`, listing its members, with Pin and Reset for the group; a group of one is the single-row case.
- Suggestions is a third `Toggle` with its count. Each entry shows the number, the colour as a swatch, the read members and the unread members, and Apply.
- A group or Apply result that names skipped members shows them in a toast, and the list refetches.
- `history.tsx` names Cosmo when `detail.by === "cosmo"`, shows the pin, and names the slugs in `detail.from` for an applied suggestion.
- New strings in en, ko and ja (ko 합니다체, ja full-width ？).

**Spec order.** The `worker-collection-media` delta is MODIFIED against a capability that reaches `openspec/specs/` only when `cosmo-qr-collection-media` is archived. Archive that change first. The alternative, an ADDED copy here, would collide at that archive.

## Risks / Trade-offs

- [The first run drops about 159 overrides at once] → Each drop writes its own history entry. The planner only drops an override equal to Cosmo's colour, so no colour a person sees changes except Cream02's background, from "#E07B36 " to `#e07b36`. Read-only verify the expected count on production before deploy.
- [A Cosmo read that is wrong for one member and confirms a staff fill by chance] → The result equals what staff set, so nothing visible changes.
- [The worker and a staff save race on one row] → Both plan under `lockColourRow`, and the second re-plans from the first's result.
- [Accent and source background differ on Event designs] → Session accent is not used for backgrounds.
- [Pins are lost on an indexer rebuild, as staff colours already are] → The audit entries carry them.
- [A suggestion is wrong for a member, since 25 numbers have per-member colours and 153 of the 167 suggested members are Event or Double designs, where colours vary more] → It is a fill: that member's first read drops it if it matches or lists it on Differs from Cosmo, and a person applied it.
- [A group action races another admin] → `expected` makes each member skip rather than overwrite a newer choice.

- [A background reset restores the kept source exactly, padding and case included, not Cosmo's normalised colour] → It shows the same colour; the next resolve never touches it, since the row has no override left.
- [The first worker run writes about 159 Cosmo entries, pushing every staff entry out of the 50-entry history] → The entries stay in `mod_audit`; the list is a recent view.
- [Search filters the table only, not Differs from Cosmo or Suggestions] → Both lists are short (14 groups and 22 numbers on 2026-11-20).
- [A row with no override carries no Cosmo text colour in the list] → Edit reads it through `admin.collection` before opening, so its Pin default follows the spec.

## Migration Plan

1. Archive `cosmo-qr-collection-media` (owner checks first).
2. Redeploy the indexer, which applies the migration on start: two nullable columns and a check; existing rows read as unpinned. Needs approval. Web and worker name the columns, so they deploy after it.
3. Deploy the web (with the API) and the worker, after the indexer, in either order: the worker changes no colour that differs from Cosmo's, so nothing waits on a pin.
4. After the first worker run, staff work through Differs from Cosmo, pinning the old hardcoded backgrounds and choosing for the Cream02 text shades. Staff may pin atom01-heejin-322z–325z and ever01-seoyeon-338z text ahead of a read.

Rollback: redeploy the previous worker to stop the resolve step. The columns can stay, since nothing old reads them. Dropped overrides are in the history, and staff can save them again.
