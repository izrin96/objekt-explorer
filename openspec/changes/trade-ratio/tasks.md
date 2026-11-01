## 1. Data

- [x] 1.1 Add a nullable `ratio smallint` with `CHECK (ratio BETWEEN 2 AND 5)` to `lists`, `list_entries` and `list_rule` in `packages/db/src/schema.ts` (design decision 1), and generate the migration with `bun run --filter=@repo/db db:generate`. Do not apply it; ask the user before applying it anywhere. Verify the generated SQL only adds the three columns and their checks, and that typecheck passes for `@repo/db`.

## 2. Server

- [x] 2.1 Add `ratio` outside the rule definition (design decisions 2 and 3): optional on `addRuleInputSchema` (omitted means none) and on `updateRuleInputSchema` (omitted keeps the stored value, `null` clears it). Write it in `services/list-rules/index.ts`, and return it on the `list.rules` output. Leave `listRuleInputSchema`, `ListRuleDef`, `ruleDef` and `expand.ts` untouched. Verify an update input without `ratio` parses to `undefined` (a test in `schemas/list-rule.test.ts` or beside it), and that lint and typecheck pass for `@repo/api`.
- [x] 2.2 Add an optional `ratio` to `list.edit` (have and want lists only; omitted keeps it, design decision 3b) and to the list outputs. Add `list.setRatio` (design decision 4), with `list_ratio_list_type` and `list_ratio_entry` in the list refusals, their `api_errors_*` strings in `en`, `ko` and `ja`, and `touchList` after commit. Add `ratio` to `listEntryFields` and `buildListEntries`. Verify that lint and typecheck pass for `@repo/api` and `web`.
- [x] 2.3 Copy, Turn into objekts and export (design decision 9): `lib/list-copy.ts` carries `ratio` when the type is unchanged (extend its tests), rule copies keep theirs, the detach writes the rule's ratio onto its entries, and the CSV export adds a trailing `ratio` column for entries and rule rows. Verify `bun test packages/api/src/lib/list-copy.test.ts` passes, and that lint and typecheck pass for `@repo/api`.
- [x] 2.4 Feed (design decision 5): add the applying `ratio` (entry or rule, else the list's) to `FeedEntry` and its query, bump the post cache key to `trade:post:4`, add the highest-ratio fold as a pure helper in `lib/trade-feed.ts` with a test, put `ratio` on preview items and rule tiles, and leave it off a Buying-only want side. Verify `bun test packages/api/src/lib/trade-feed.test.ts` passes, and that lint and typecheck pass for `@repo/api`.
- [x] 2.5 Builder get side (design decision 6): select the applying ratio (`COALESCE(entry, list)`) in the picker's get-side entry read and add an optional `ratio` to `candidateItemSchema`, set for have-list entries only. Verify that lint and typecheck pass for `@repo/api`.

## 3. Web

- [x] 3.1 Load `vercel-react-best-practices` first. Add `features/list/ratio-text.ts` (chip text and worded names for owner and visitor, have and want, and which ratio applies) with `ratio-text.test.ts`, and `ratio-chip.tsx` with an `inherited` style (design decision 7). `trade-post-page` reuses both. Add the strings in `en`, `ko` and `ja`. Verify `bun test apps/web/src/features/list/ratio-text.test.ts` passes, and that lint, typecheck and build pass for `web`.
- [x] 3.2 List page: "Ratio for all" in the have and want lists' Edit form (sent only when changed); the chip on cards of have and want lists, in the inherited style for the owner when it comes from the list; and Set ratio for selected entries with its dialog (design decision 8), never offered for rule entries or on sale and general lists. Verify that lint, typecheck and build pass for `web`.
- [x] 3.3 Rules: a Ratio choice in the rule dialog (add and edit, sending `ratio` only when it changed on edit), and the chip on Rules strip rows. Verify that lint, typecheck and build pass for `web`.
- [x] 3.4 Trade: the chip on objekt tiles and rule tiles in `post-side.tsx`, `rule-tile.tsx` and `side-items-dialog.tsx`, and on the builder's `candidate-tile.tsx` for get-side items. Verify that lint, typecheck and build pass for `web`.

## 4. Verify

- [x] 4.1 Run `bun run check` and `bun run build --filter=web`. Both pass.
- [x] 4.2 Browser check with `browser-use`, following the rules in the user's global CLAUDE.md (your own tab; wait for hydration before submitting any login). Use the dev server with `.env.local` pointing `DATABASE_URL` at the local database, and the migration applied locally only after the user approves it. Ask the user before setting any ratio or creating any rule, even locally. Without that approval, verify those writes read-only, up to the request boundary. Check, at 1280 px and 390 px, the owner's and a visitor's chip words on the list page, the Rules strip, a Trade post's tiles on Browse and For you (and none on a Buying-only post), and the builder's get side. Record what was checked, on which database, and what stayed read-only verified.

## 5. Docs

- [x] 5.1 Update `packages/api/AGENTS.md`, adding the ratio to the Want-list rules and Lists sections: outside the definition, never matched, the `setRatio` path, and the cache key. Update `apps/web/AGENTS.md` only if the chip component sets a convention. Verify `openspec validate trade-ratio --strict` passes.

## Workflow follow-up

- Apply the migration to production before deploying web or worker, with the user's approval.
- ko and ja strings are agent-written and need native review.
