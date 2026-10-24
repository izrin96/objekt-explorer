# Design

## Context

Want entries live in the app database (`list_entries`, keyed by `collection_slug`); every match is SQL on that column: For you's recount (`trade-matches/recount.ts`, `candidates.ts`), the feed (`trade-feed/query.ts`, `entries.ts`) and the want-alerts pairs (`apps/worker/src/job/want-alerts/pairs.ts`). Collection metadata (season, class, collection number, member) and holdings live in the separate indexer database, so a rule cannot be matched by a join at read time. Editions already have one definition, `getCollectionEdition` in `packages/lib/src/collection-edition.ts`.

## Goals / Non-Goals

**Goals:** rules that match, count and alert exactly like objekts added by hand, without touching the matching SQL; a rule's objekts kept current with new collections and the owner's holdings.

**Non-Goals:** as in the proposal: no rules outside want lists, no ratio terms, prio is display only, no per-rule alert grouping.

## Decisions

1. **A rule is a definition plus ordinary entries.** New table `list_rule` (`id`, `list_id` → `lists` cascade, `kind` `'collection' | 'set'`, `artist`, `season`, `collection_no` for `collection`, `class` and `editions int[]` (empty = any) for `set`, `members text[]` (empty = any), `prio text[]`, `skip_owned` default true, `created_at`, `updated_at`). `list_entries` gains `rule_id` (nullable, → `list_rule` cascade, indexed). A rule's entries carry `collection_slug` and no `objekt_id`, so recount, feed and alerts match them unchanged. Alternative, expanding at read time in every matcher: rejected, it needs the indexer inside four SQL paths and breaks the worker's env-free imports.

2. **Expansion is one pure function plus two readers.** `expandRule(rule, collections, heldSlugs)` (pure, tested, in `packages/api/src/lib/list-rule.ts`) returns the slugs a rule wants and its counts (`covers`, `owned`, `canMatch`). Collections come from the indexer `collection` table filtered by artist and season (one season is at most a few hundred rows), editions through `getCollectionEdition`. Held slugs come from the owner's linked addresses' objekts, as `want-alerts` reads holdings. The readers live in an env-free `services/list-rules/expand.ts`, so the worker can import them (worker AGENTS.md: no `services/redis` chain).

3. **Writes diff, never rebuild.** `syncRuleEntries(ruleId, slugs)` inserts the missing slugs and deletes the extra ones in one transaction and touches the list only when something changed (`touchList` in the API; the worker calls only `bumpTradeVersion` from `@repo/lib/server/list-touch` with its own Valkey client, never `touchListWith`, because `updated_at` is the owner's edit and keeps a post out of idle). Rebuilding would give every entry a new id each run, and the alert cursor would read them all as new.

4. **Limits are checked on the definition.** `covers > 500` is refused (`RULE_TOO_WIDE`, with `covers`); `skip_owned && canMatch === 0` is refused (`RULE_NOTHING_TO_MATCH`). A `previewRule` procedure returns the counts for the dialog's live line without saving. At most 20 rules per list.

5. **Freshness: on save, and a worker job.** Add and edit expand at once in the request. `apps/worker/src/job/refresh-list-rules.ts` runs every 10 minutes through `safeRun`, reads every rule's season collections and owner holdings in batches, and calls `syncRuleEntries`; that meets the spec's 15 minutes. It logs one info line only when it changed entries.

6. **Reads split rules from objekts.** `fetchListWithEntries` and list previews leave out entries with a `rule_id` and return `rules` (definition, label parts, counts). The grid, its count, compare and market never see rule entries. `See the objekts` calls `ruleObjekts(ruleId)`, which returns the rule's collections grouped by collection number with each member's held flag.

7. **Feed tiles from the same entries.** `fetchPostEntries` selects `rule_id`; the feed folds a list's rule entries into one tile per rule (`{ ruleId, label, matched }`) after the per-entry match marks are computed, so "N you have" is the existing ring count over that rule's entries. Header counts already count collections, so a collection both in a rule and on the list counts once.

8. **For you names rules from match data it has.** The recount already knows which of the viewer's want entries matched; entries whose only matching viewer entry has a `rule_id` produce the "matches your rule" lines.

9. **UI reuses what exists.** The Add rule dialog is the existing `Dialog` with `SegmentedChoice` (`features/offers/segmented-choice.tsx`) for the two kinds, `Select` for season and class, toggle chips like `FilterToggle`. The Rules strip is a `Collapsible` (vendored). The Add to list option is one more field in `add-to-list-dialog.tsx`. Turn into objekts nulls `rule_id` on the rule's entries and deletes the rule in one transaction.

10. **Export** builds rule lines from the definition (`ruleLabel`, pure, in `lib/list-rule.ts`), so share text, export (`export-list-dialog.tsx`) and the Discord format (`features/discord/generate-discord-button.tsx`) agree; list reads return `rules` for them.

## Implementation notes

- The pure module is `packages/api/src/schemas/list-rule.ts`, not `lib/`: the web imports `ruleLabel`, `ruleLine` and the input schema, and the web build allows only `schemas/` and `constants.ts` from `packages/api/src`.
- `list_rule.season` is nullable: a `set` rule may take any season, which is how the dialog shows the too-wide case. A `collection` rule always has one.
- Refusal codes follow the API's domain prefix: `list_rule_not_want`, `list_rule_too_wide`, `list_rule_nothing_to_match`, `list_rule_limit`.
- The strip reads `list.rules` (a separate public procedure), so `listEntries` and its `/api/v1` output stay as they were; it returns `canMatch` from the stored entries and `covers`, `owned` and the collection range from the indexer.
- The CSV export puts each rule first as a row with only a new trailing `rule` column filled.
- The Discord format's server read returns `wantRules`; the list page's own Discord button writes them under a Want heading.

## Risks / Trade-offs

- A rule adds up to 500 entries: a list with 20 wide rules holds 10,000. Matching joins grow with it; the cap and the 20-rule limit bound it. Watch For you timings on staging.
- Expansion lags holdings by up to 10 minutes; an alert can come for a collection the owner just received. Alerts already skip a collection the wanter holds, so the lag shows only in counts.
- A new rule's entries are new want entries, so the reverse alert ("Someone wants what you have") fires for every matching have list at once, grouped per list per day. That is the intended behaviour, but the first run after deploy for heavy users may be large.

## Migration Plan

One migration: create `list_rule`, add `list_entries.rule_id` with its index. No backfill. Apply locally, then staging and prod with approval, before the code that reads `rule_id`. Rollback: delete rules (cascades their entries), then drop the column and table.

## Open Questions

- Does the 500 cap count before or after Skip ones I own? This design counts before, so a rule doesn't grow past the cap when the owner trades objekts away.
- Should the worker run more often for owners who trade a lot? It starts at 10 minutes.
