## Why

Today a staff colour beats Cosmo's forever, so a staff guess keeps winning after Cosmo's exact colour is known. On 2026-11-20, 129 of the 183 staff text colours equal Cosmo's recorded colour, and 33 differ by a shade (Cream02 372–374Z). Some staff colours deliberately fix Cosmo mistakes (the old hardcoded map), which Cosmo still shows wrong. Staff need to mark which is which and look only at real disagreements.

## What Changes

- A staff colour, text or background, is either **pinned** (a deliberate fix: it always wins) or a **fill** (stands in until Cosmo's colour is known).
- **Cosmo's colour** is the text colour recorded from connected accounts' reads, and the background the source gave (Cosmo's metadata; the indexer never rewrites it).
- When a fill equals Cosmo's colour (ignoring case and surrounding spaces), the worker drops the override: the collection shows Cosmo's colour in lowercase `#rrggbb` and the history records the change as Cosmo's.
- When a fill differs from Cosmo's colour, nothing changes on its own: the collection lands on **Differs from Cosmo**, a new filter on `/mod/collections`, where staff pin it or reset it.
- Rows show Cosmo's colour beside an overridden one and mark pins. Edit gains a **Pin** checkbox per colour. Reset goes to Cosmo's colour when known, else the source.
- Differs from Cosmo **groups** members of one collection number that share both the staff colour and Cosmo's colour, so one Pin or Reset decides it.
- **Unread members** get a suggestion, never a copy: when every read member of a number agrees on Cosmo's text colour, staff can apply it to unread members as a fill in one click. A later read drops the fill or lists the member. Nothing is copied unasked, since 25 numbers have per-member colours (Cream02 376Z mixes `#000000` and `#ffffff`).
- The history names Cosmo for a worker change, and records pin changes and the member a suggestion came from.

First run after deploy: the worker drops the ~129 text fills equal to Cosmo and the 30 Cream02 background fills equal to their trimmed source. The 11 old hardcoded backgrounds and the 33 Cream02 text shades land on Differs from Cosmo; the 5 old hardcoded text colours have no read yet, so staff pin them ahead.

## Non-goals

- The worker writing a background colour from session `accent_color`, which differs from the source on Event and Double designs.
- Changing colours on collections staff never touched, except through a suggestion staff apply.
- A bulk pin of existing colours by migration or script: staff pin from the review filter, which writes history.
- Restoring pins after an indexer rebuild.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-admin`: pinned or fill colours; Cosmo's colour on the row; Pin in Edit; Reset target; grouped Differs from Cosmo; suggestions for unread members; history by Cosmo.
- `worker-collection-media`: Cosmo's text colour replaces a staff fill that it equals, never a pinned one or one that differs; a background fill equal to its source is dropped. This capability lives in the unarchived `cosmo-qr-collection-media` change, which must be archived first.

## Impact

- Route: `/mod/collections`.
- Indexer: two Drizzle-owned columns `text_color_pinned`, `background_color_pinned` on `collection` (migration under `packages/db/indexer-migrations`, plus `schema.graphql` and the model), and a check that a pin needs its override.
- `@repo/lib` colour and media plans.
- `packages/api`: `setCollectionColors` input and `collectionOverrides` output (pins, Cosmo's colour from `collection_media`, group key); a batch save; a `collectionSuggestions` read.
- `apps/worker` collection-media apply phase writes `mod_audit` entries with no actor.
- `apps/web` moderation collections view and history; en/ko/ja strings.
