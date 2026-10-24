# Tasks

## 1. Schema

- [x] 1.1 Add `listRule` to `packages/db/src/schema.ts` (kind, artist, season, collection_no, class, editions, members, prio, skip_owned, timestamps; `list_id` cascade) and `listEntries.ruleId` (nullable, cascade, indexed), with relations; generate the migration and apply it to the LOCAL database only, after approval. Lint, typecheck and build pass for `@repo/db`.

## 2. Pure rule logic

- [x] 2.1 `packages/api/src/lib/list-rule.ts`: rule Zod schemas (two kinds, editions, members, prio, skip owned), `expandRule(rule, collections, heldSlugs)` returning wanted slugs and `covers` / `owned` / `canMatch`, `ruleLabel(rule)` for the strip, tiles and exports, and the limits (500 objekts, 20 rules per list). Editions through `getCollectionEdition`.
- [x] 2.2 Tests beside it: any member of a collection, class + season + edition, chosen members, skip owned on and off, too wide, nothing to match, labels ("CC366 · any member", "Cream02 · FCO · 3rd · any member", the Discord line with prio). Lint, typecheck, test and build pass for `@repo/api`.

## 3. Expansion and procedures

- [x] 3.1 Env-free `packages/api/src/services/list-rules/expand.ts`: read a rule's season collections from the indexer and the owner's held slugs from their linked addresses; `syncRuleEntries` diffs inserts and deletes in one transaction and reports whether anything changed.
- [x] 3.2 Procedures on the list router: `previewRule` (counts only), `addRule`, `updateRule`, `deleteRule`, `detachRule` (Turn into objekts), `ruleObjekts` (collections by number with held flags). Owner-only, want lists only, refusals `RULE_TOO_WIDE`, `RULE_NOTHING_TO_MATCH`, `RULE_LIMIT`, `NOT_A_WANT_LIST` with refusal text; `touchList` after a change.
- [x] 3.3 List reads (`fetchListWithEntries`, previews, profile lists counts) leave rule entries out of objekts and return `rules`; copy as new list carries rules to a want-list copy and drops them otherwise. Lint, typecheck and build pass for `@repo/api`.

## 4. Worker

- [x] 4.1 `apps/worker/src/job/refresh-list-rules.ts`, registered through `safeRun` every 10 minutes: batches of rules, `syncRuleEntries` each, `bumpTradeVersion` the changed owners (never `lists.updated_at`), one info line only when entries changed, a heartbeat count. Imports only env-free modules. Lint, typecheck and build pass for `worker`.

## 5. List page

- [x] 5.1 Add rule button in `list-header.tsx` (owner, want list) and the Add rule dialog: two kinds via `SegmentedChoice`, season / class selects, edition and member chips, Skip ones I own, the live `previewRule` line, too-wide and nothing-to-match messages with Add rule disabled.
- [x] 5.2 Rules strip between the header and the filter bar (`Collapsible`): header count, rows with label, skip line, "N can match", owner menu (See the objekts, Edit rule, Turn into objekts, Delete rule); See the objekts expands into collection tabs with faded held members; visitors see rows without the menu.
- [x] 5.3 Any member of {collection} in `add-to-list-dialog.tsx`: shown for one objekt and a want list; prio defaults to that member; the button reads Add rule.
- [x] 5.4 Exports: rule lines first in the export dialog, share text and the Discord format, via `ruleLabel`. en/ko/ja strings for 5.1–5.4. Lint, typecheck and build pass for `web`.

## 6. Trade

- [x] 6.1 `trade-feed/entries.ts` selects `rule_id`; the feed folds a list's rule entries into rule tiles with the viewer's matched count; the Trade card's Want strip draws them first (RULE, class colour, label, members, "N you have", ring), signed-out without count; activating a tile lists the viewer's matching objekts.
- [x] 6.2 For you: lines under a partner's strips for objekts matched only through the viewer's rules, and "· N through your rules" in the header sentence. en/ko/ja strings. Lint, typecheck and build pass for `@repo/api` and `web`.

## 7. Verify

- [x] 7.1 On the local database: add both kinds of rule to a want list, check the strip counts against a SQL count, Turn into objekts, delete; run the refresh job once after changing a holding by hand in a local fixture and confirm the diff, not a rebuild (entry ids kept). Read-only checks only against staging.
- [x] 7.2 Browser check at desktop and phone width in en/ko/ja: list page, both dialogs, Add to list option, a post's rule tile, a For you row with rule lines; no horizontal overflow.
- [x] 7.3 Update `packages/api/AGENTS.md` (rules are entries with `rule_id`; expansion is env-free; reads split rules from objekts), `apps/worker/AGENTS.md` (the refresh job) and `packages/db/AGENTS.md` if its conventions change, or state that none changed.
