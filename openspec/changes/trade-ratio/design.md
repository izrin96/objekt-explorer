## Context

`list_entries` carries `price`, `is_qyop` and `note`, and only sale lists may write them: `addToList` and `updateEntryPrices` refuse other lists with `list_prices_sale_only` (`routers/list-entries.ts`, `routers/list-utils.ts`). The web's Set price dialog and the add dialog's price fields show only on sale lists. Have and want entries have no per-entry edit path today.

A rule is a `list_rule` definition plus expanded `list_entries` with `rule_id`. Its definition (`listRuleInputSchema`, `ListRuleDef`, `ruleDef`) feeds `expandRule`, `ruleProblem`, `previewRule` and the worker's `refresh-list-rules`.

Trade tiles come from `FeedEntry` (`lib/trade-feed.ts`: `id`, `slug`, `objektId`, `ruleId`), cached per list under `trade:post:3:<id>:<updatedAt>` (`services/trade-feed/entries.ts`), folded into `previewItemSchema` items (`entryId`, `slug`, `qty`, `ringed`, `near`) and `rules` tiles. Offer candidates (`candidateItemSchema`) carry `listSlug` only. The picker's get side reads the partner's entries in `services/offer/picker/index.ts`.

`touchList` sets `lists.updated_at` and bumps the owner's trade version. It does not move `bumped_at`, so it does not count as a bump.

## Goals / Non-Goals

**Goals:**

- One display-only number on have entries, want entries and rules, visible on the list page, Trade tiles and the builder's get side.
- Old tabs, `/api/v1` and the worker keep working through the deploy.

**Non-Goals:** see proposal (sale lists, the give-side hint, the Discord format, the chat card, the add dialog).

## Decisions

**1. Storage: `ratio smallint` on `lists`, `list_entries` and `list_rule`.** Nullable, with `CHECK (ratio BETWEEN 2 AND 5)`. Null is 1:1, or "follow the list" on an entry or rule.
- The ratio that applies is `COALESCE(entry.ratio, list.ratio)` for an entry and `COALESCE(rule.ratio, list.ratio)` for a rule. The server works it out for the feed and the builder; the list page and the Rules strip get both values, so the owner can see which one is followed.
- A list's ratio is accepted only on have and want lists. The direction comes from the list type, so it isn't stored: a have entry reads 1:N, a want entry or rule N:1. Rule entries leave the column null, since the tile and the strip read the rule's own.
- *Alternative:* two columns (give, get). Rejected: the user chose 1:N and N:1 only, and one number keeps the chip, the input and the export simple.

**2. The ratio sits outside the rule definition.** It is not added to `listRuleInputSchema`, `ListRuleDef` or `ruleDef`. It goes beside `rule` on the `addRule` and `updateRule` inputs, and beside the definition on the `rules` output. So `expandRule`, `ruleProblem`, `ruleEntryDiff`, `previewRule` and the worker never see it, and "never matched" holds by construction. (`prio` is display-only too but lives in the definition. Ratio stays out so that nothing on the expansion path can start reading it.)

**3. Old tabs keep a rule's ratio.** On `updateRule`, `ratio` is optional with no default. Omitted keeps the stored value, `null` clears it, and 2–5 sets it, the way an omitted `note` works in `updateEntryPrices`. A tab from before the deploy sends no `ratio`, which still validates and keeps the ratio. On `addRule`, omitted means none.

**3b. The list's ratio goes through `list.edit`.** It is optional with no default: omitted keeps the stored value and `null` clears it. A tab built before the deploy sends no `ratio`, and its saves keep the list's ratio. `list.create` doesn't take one; the list starts at 1:1.

**4. `list.setRatio({ slug, entryIds, ratio: 2..5 | null })`, a new owner-only write.**
- It refuses a list that is not have or want (`list_ratio_list_type`), and an entry id kept by a rule or not on the list (`list_ratio_entry`).
- It updates in one statement, then calls `touchList`, so the post cache key changes but `bumped_at` stays. That keeps it from counting as a bump.
- The price path is left alone: widening `updateEntryPrices` would mix a sale-only rule with a have/want one.

**5. Feed tiles.**
- `FeedEntry` gains `ratio?: number`, the ratio that applies (entry, else list), and the post cache key moves to `trade:post:4`, so no stored entry from the old shape is read as having none.
- `previewItemSchema` and the rule tile gain an optional `ratio`. Old tabs ignore the extra field.
- A tile folding several copies shows the highest ratio, through a pure, tested helper in `lib/trade-feed.ts` beside the fold.
- The feed leaves `ratio` off a want side that is Buying only, so the web needs no rule of its own for that. The list page, the Rules strip and the Edit form still show and set a Buying-only want list's ratios on purpose: only Trade leaves them off.
- `trade:person:8` and the rankings caches hold counts, not tiles, so their versions stay.

**6. Builder get side.** The picker's get-side entry read selects `ratio`, and `candidateItemSchema` gains an optional `ratio`, set for a have-list entry only. `candidate-tile.tsx` draws the chip in the picker and on a picked item. The give side is out of scope: the viewer's items are matched to the partner's want entries in `pickerTagsFor`, and widening that is a separate change.

**7. One chip component:** `features/list/ratio-chip.tsx`, taking `ratio`, `side` (`have` | `want`) and `owner` (whether the reader owns the list). It draws "1:N" or "N:1" with the worded accessible name and tooltip. The list page, Rules strip, Trade tiles and builder all use it. The words are pure, in `ratio-text.ts` beside a test. It uses the neutral Badge look, since this is information, not a list type or a state.

**8. Set ratio UI.** A Set ratio item beside the list page's other entry actions on have and want lists, opening a small dialog with a 1:1 / 2 / 3 / 4 / 5 choice for the selected entries. It is modelled on `SetPriceDialog` and `use-entry-dialogs.ts`, but kept separate, since that dialog is sale-only. The rule dialog gets the same choice as a row under Skip ones I own.

**9. Copy, Turn into objekts and export.**
- `lib/list-copy.ts` carries the entries' `ratio`, and the copy carries the list's, only when the target type equals the source type. Rules always carry theirs.
- Turn into objekts (the rule's detach) writes the rule's ratio onto the entries it creates.
- The CSV export adds a trailing `ratio` column, so readers that use column positions still work.

## Risks / Trade-offs

- [Code reads the new columns before the migration has run] → Drizzle selects whole rows, so web and worker break against a database without the columns. Apply the migration to production before deploying either.
- [A ratio is read as a promise the offer must keep] → The builder shows the hint and checks nothing. The chip's words say "ask" and "would give", not "requires".
- [Folded tiles hide lower ratios] → The highest one shows, and the full side list shows each copy.
- [The rule dialog grows another row] → It's one choice row, with 1:1 preselected.
