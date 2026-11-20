# Tasks

## How every task is checked

- **Package checks.** A task ends with `bun run lint`, `bun run typecheck` and `bun run build` passing for each package it touches. Use `--filter=web` for web and `--filter=worker` for worker. `@repo/lib`, `@repo/db` and `@repo/api` have no `build` script, so a task touching them also builds `web` and `worker`.
- **Tests.** They cover pure modules only, run with `bun test` beside the code, and never touch the database, Redis or Cosmo.
- **Local indexer.** `.env.local` points `INDEXER_DATABASE_URL` at production, read-only. A task that writes the indexer (1.1, 3.1, 3.3, 4.1, 5.5) uses the local compose indexer Postgres, loaded from a dump with the owner's approval. Point the variable at it in that shell only, never by editing `.env.local`.
- **Production.** No task writes to production. The worker step and the staff saves are verified up to the request boundary, against the local database or with the write stubbed, and recorded as "read-only verified". Tasks marked **(owner)** need the owner: migrations, deploys, and reads of production.
- **Wording.** "Decision: X" means the design.md Decisions paragraph that starts with X.

## 1. Data model

- [x] 1.1 Add `text_color_pinned` and `background_color_pinned` as nullable booleans to the indexer `collection` table (Decision: Pins as two nullable booleans).
  - Drizzle schema in `packages/db/src/indexer/schema.ts`, with the check that a pin needs its source.
  - A new guarded migration in `packages/db/indexer-migrations`, in the style of `20261104150000_collection_colour_source`.
  - The fields in `apps/indexer/schema.graphql` and `collection.model.ts`.
  - Indexer migrations are written by hand: `db:generate` covers only the app's `migrations`.
  - With the owner's approval, apply the migration twice to the local indexer copy. Done when both runs succeed with no error.

## 2. Pure planner (`packages/lib/src/collection-colours.ts`)

- [x] 2.1 Add `normaliseColour`, the pin fields on `ColourRow`, `OverrideColours` and `ColourInput`, and the `cosmo` argument to `planColourWrite` (Decisions: Cosmo's colour, One planner).
  - Reset goes to Cosmo's colour when known, otherwise to the kept source.
  - A pin on a colour left with no override is dropped.
  - An audit `before` or `after` from an older entry without pins reads as unpinned.
  - Extend `collection-colours.test.ts` with:
    - a reset to Cosmo's colour and a reset with Cosmo unknown;
    - pin set, pin kept and pin cleared by a reset;
    - a pin given for a colour with no override.
  - `bun test packages/lib` passes.
- [x] 2.2 Add `planCosmoResolve(row, cosmo)` and `differsFromCosmo(row, cosmo)`. Tests cover:
  - a text fill equal ignoring case;
  - a background fill equal to the source `"#E07B36 "`, written as `#e07b36`;
  - a pinned colour equal to Cosmo's, left alone;
  - a differing fill, left alone and listed;
  - Cosmo unknown, giving neither a change nor a listing.

  `bun test packages/lib` passes.
- [x] 2.3 Add `groupKey` and `suggestSiblings` (Decision: One planner). Tests cover:
  - two members of one number with the same staff and Cosmo colour share a key; a different Cosmo colour splits them;
  - one read member and three unread members showing another colour: a suggestion naming the three;
  - an unread member that already shows the colour, or has a staff text colour, left out;
  - read members that disagree, or none read: no suggestion.

  `bun test packages/lib` passes.

## 3. API (`packages/api`)

- [x] 3.1 Update `setCollectionColors` and its input schema (Decision: API).
  - The input schema takes the optional pins.
  - Read the slug's `collection_media.text_color` before the lock and pass it to `planColourWrite`.
  - Write the pins through `writeColourSet` and `lockColourRow`, both of which read and write the pin columns.
  - Read-only verify against the local stack: a save, a pin-only save and a reset give the expected `set` and audit detail.
- [x] 3.2 Make `collectionOverrides` return, per overridden row, the pins, Cosmo's text and background colour and `differs`, with one `inArray` read of `collection_media`. Make `lastChanges` also return whether the latest entry is Cosmo's (`detail.by`), so a row whose last change was Cosmo's names Cosmo. Read-only verify that the procedure's output parses, using the local database.
- [x] 3.3 Add `setCollectionColorsMany` with `expected` per entry and `from` in the audit detail, sharing the per-row path with `setCollectionColors` (Decision: API). Read-only verify against the local stack: a group reset of three rows writes three entries, and a row changed after loading is skipped and returned.
- [x] 3.4 Add `collectionSuggestions`. Read-only verify its output parses against the local database. The production count (22 numbers, 167 members on 2026-11-20) is in design.md; no production read is needed.

## 4. Worker resolve step

- [x] 4.1 Add the resolve step to `apps/worker/src/job/collection-media/apply.ts`, or a sibling file it calls, after the media apply (Decision: Worker resolve step).
  - Read the overridden, unpinned rows and plan read-only.
  - For each row with a plan: lock, re-plan, insert and commit the `collection_override` entry with `actorId` null and `by: "cosmo"`, then write.
  - Bump the caches once after any write.
  - Count drops in the run summary log, as counts only.
  - Read-only verify against the local indexer copy with the write stubbed: the planned drops and audit details are logged and nothing is written.
- [x] 4.2 **(owner)** Read production read-only: count the overridden, unpinned rows that `planCosmoResolve` would drop, using the same rule over exported rows. Expect about 129 text and 30 background. Done when the number is recorded in this task.
  - 2026-11-20, agent, read-only: the real `planCosmoResolve`, `differsFromCosmo` and `differsGroups` over the 194 overridden production rows and that day's `collection_media` give 129 text and 30 background drops, then 33 text and 11 background colours on Differs from Cosmo in 14 groups (Cream02 372–374Z ×10 each, 338–340Z, Atom01 302Z ×4, Binary01 201Z/202Z, Divine01 117–120Z and 317Z). Rerun read-only on 2026-11-20 after the indexer migration went live, on fresh `collection_media`: the same numbers (194 overridden; 129 text and 30 background drops; 33 text and 11 background on Differs from Cosmo, 14 groups). Ticked on the owner's word.

Verified 2026-11-20 on a local copy (`indexer_local` in the compose Postgres: production's `collection` table, 18 MB, plus production's `collection_media` in the local app database, local Redis): the migration ran twice; a pin-only save, a reset to Cosmo's `#2d1f17`, a save with a pin; a group reset of three Cream02 372Z rows saved two and skipped the one made stale; Suggestions gave 22 numbers and 167 members, and Apply wrote `from`; the resolve step's first run dropped 159 (129 text, 30 background) with Cosmo entries and no actor, its second run none. 4.1 wrote to the local copy rather than stubbing the write.

## 5. Web (`apps/web/src/features/moderation/collections`)

- [x] 5.1 Load `vercel-react-best-practices`, then add to Edit a Pin checkbox per colour, using the kit's `Checkbox`.
  - It defaults to the stored pin, else checked when Cosmo's colour is known.
  - Save sends the pins.
  - Done when the checkbox is in the edit row and Save sends it. The browser check is task 5.5.
- [x] 5.2 Show Cosmo's colour and the pin mark on each overridden colour in the row.
  - Add the Differs from Cosmo toggle with its count beside Overrides only.
  - In that filter, show Pin (a save of the pin only) next to Reset.
  - Keep the empty state text for when none differ.
  - When the row's last change was Cosmo's, the row names Cosmo instead of an admin.
  - In `collections-view.tsx`, the reset patch in `save.onSuccess` uses Cosmo's colour when it is known, falling back to the source.
  - Differs from Cosmo shows one entry per group with its members; Pin and Reset call `setCollectionColorsMany`; skipped members show in a toast.
- [x] 5.3 Add the Suggestions toggle with its count: per number the swatch, read members, unread members and Apply, through `setCollectionColorsMany`.
- [x] 5.4 Name Cosmo in `history.tsx` when `detail.by === "cosmo"`, show pins in an entry, and name the member a suggestion came from (`detail.from`). Add the new strings in en, ko and ja, following `project_ko_ja_register`.
- [x] 5.5 Browser check on the local dev server, with the `browser-testing-with-devtools` skill or browser-use under its rules: your own tab, wait for hydration.
  - Check each of these:
    - the row shows Cosmo's colour;
    - the filter count;
    - Pin and Reset on a group of several members, and on a group of one;
    - the Suggestions count, and a suggestion applied, then shown as a fill on each member;
    - the Edit default;
    - the history naming Cosmo.
  - Writes go to the local indexer only. `.env.local` keeps the production indexer read-only, so point it at a local copy for this check or stop at the request.
  - Record the result as read-only verified where a write could not land.

Browser check 2026-11-20 on the local copy, signed in as the owner's local admin: Differs from Cosmo listed 14 groups (Cream02 372–374Z as one group each); Pin on Atom01 302Z saved 4 and left the list (41 to 37) with "Background pinned" in the history; Reset on Cream02 374Z saved 10 (37 to 27); rows showed Cosmo's colour, the pin mark and Cosmo as last changer; Edit on binary02-seoah-363z (no override, Cosmo text known) started with both pins checked, and the label toggles its checkbox; Apply on Atom02 335A saved 3 with "Suggested from" in the history; 33 history entries named Cosmo. "1 collections" on single-member groups fixed after.

An independent review then found, and this change fixes: Apply skipped every unread member with a staff background (a suggestion now compares only the text override); history showed "→ source" where a reset or drop shows Cosmo's colour (entries now carry `shown`, the colours after the write); a malformed recorded text made a suggestion skip forever; a slow Edit lookup could replace a later row's draft; a failed resolve stopped the rest of the worker run; a failed batch chunk hid what earlier chunks saved. Re-verified on the local copy: Apply saved atom02-kimlip-336a over its staff background, and a reset's history reads "Text #000000 → #2d1f17".

## 6. Rollout (owner)

- [x] 6.1 **(owner)** Archive `cosmo-qr-collection-media`. Done when `openspec validate staff-colour-pins --strict` no longer reports that archive would refuse the `worker-collection-media` delta.
  - *Done 2026-11-20: `cosmo-qr-collection-media` archived. Strict validate then asked to keep the main spec's `Staff override` scenario, which this delta had rewritten as `Pinned override` (the same example, now pinned); the rewritten scenario keeps the old name.*
- [x] 6.2 **(owner)** Redeploy the indexer first: it applies `indexer-migrations` on start. Only then deploy web and worker, since their Drizzle schema names the pin columns (the worker's held-transfer replay inserts into `collection`, and `/mod/collections` reads them).
  - The first worker run drops about 159 overrides on production by itself (task 4.2's count); deploying approves that.
  - After the run, check that the history lists the Cosmo drops, and that Differs from Cosmo holds:
    - the 11 old hardcoded backgrounds;
    - the 30 Cream02 372–374Z text shades;
    - the 3 Cream02 338–340Z pinks.
  - *Done 2026-11-20: indexer, web and worker deployed; the worker's first run logged `Cosmo resolved 159 staff colours (text 129, background 30)`, task 4.2's count. The history and Differs from Cosmo were checked by the owner.*
- [x] 6.3 **(owner)** Pin the 16 colours from the old hardcoded map. This change does not pin them itself. Done when each shows its pin mark in `/mod/collections`.
  - Text, pinned from Edit, since no read lists them: atom01-heejin-322z, 323z, 324z and 325z, and ever01-seoyeon-338z.
  - Background, pinned from Differs from Cosmo:
    - divine01-seoyeon-117z, 118z, 119z, 120z and 317z;
    - binary01-choerry-201z and 202z;
    - atom01-yubin-302z, atom01-nakyoung-302z, atom01-yooyeon-302z and atom01-hyerin-302z.
  - *Done 2026-11-20, read-only on production: all 16 carry their pin (5 text, 11 background); those are the only pins (5 text, 11 background).*
- [x] 6.4 **(owner)** Decide each Cream02 shade on Differs from Cosmo, one group per number: pin it or reset it to Cosmo's colour. Done when the filter no longer lists Cream02.
  - *Done 2026-11-20, read-only on production: no Cream02 row is pinned, the 372–374Z and 338–340Z overrides are gone, and the 44 Cream02 text overrides left (347Z, 348A, 351A, 352A, 504Z) have no Cosmo read, so none differs from Cosmo.*
- [x] 6.5 **(owner)** Go through Suggestions: apply or leave each. Done when every entry was looked at once.
  - *Done 2026-11-20 on the owner's word: applied some, left the rest on purpose.*

## 7. Docs

- [x] 7.1 Update the docs that describe staff colours.
  - `packages/db/AGENTS.md`, Collection colours: the pin columns and their check.
  - `apps/indexer/AGENTS.md`, Staff colours on `collection`: the pin columns join `source_*` as columns the indexer never sets.
  - `apps/worker/AGENTS.md`, Collection media: the resolve step, and that it writes `mod_audit`.
  - `packages/api/AGENTS.md`, Objekt shapes: the planner's `cosmo` argument, and `setCollectionColorsMany` as the one batch write path.
  - `apps/web/AGENTS.md`: none of its conventions change; checked, no edit.
  - Done when each named section describes the new behaviour.

## Workflow follow-up

- Archive this change after 6.5.
