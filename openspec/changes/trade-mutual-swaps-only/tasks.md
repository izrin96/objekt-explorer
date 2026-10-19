# Tasks

## 1. Score (packages/api)

- [x] 1.1 `mutualOf` in `schemas/trade.ts` returns `Math.min(tradeTheyHave, tradeYouHave)`; rewrite the `MatchCounts` and `mutualOf` doc comments (the `trade*` fields are the swap counts and are read again)
- [x] 1.2 Tests in `lib/trade-rank.test.ts` (and `trade-person.test.ts` where they assert Mutual): a sale-only person both ways is not in `mutualPeople` but is in `oneWayPeople`; have ⇄ want-open-to-swaps is mutual; a sale list on top of a swap does not raise the score; `mutualRankOf` orders by the swap score
- [x] 1.3 `candidates.ts`: add `a_t` and `b_t` to `grouped`, point `HAVING.mutual` at them, and `ORDER.mutual` at `least(a_t, b_t) DESC, a + b DESC`; leave `ORDER.all` and `sum` as they are
- [x] 1.4 Bump `trade:mutual-people:5` → `:6` (`mutual.ts`), `trade:mutual-count:5` → `:6` (`mutual.ts`), `trade:foryou:6` → `:7` (`trade-matches/index.ts`)
- [x] 1.5 `bun run lint`, `bun run typecheck` and `bun run test` pass for `@repo/api`

## 2. Header sentence and help (apps/web)

- [x] 2.1 `headerSentence` (`features/trade/person-row.ts`) takes `MatchCounts | undefined` and calls `mutualOf(counts)` without zeroing; update `person-row.test.ts`: swap counts drive "swap", a sale-only person reads "youHave" / "theyHave"
- [x] 2.2 `match-help.tsx`: the Mutual table keeps the two have-list rows, the three sale rows go, and a line under it reads that sale lists never count toward Mutual
- [x] 2.3 Strings in `messages/en.json`, `ko.json`, `ja.json`: the new sale line, `trade_help_mutual_score`, and `trade_help_both_ways` without its sale-list half; remove keys nothing uses any more
- [x] 2.4 `bun run lint`, `bun run typecheck`, `bun run test` and `bun run build` pass for `web`

## 3. Verify and document

- [ ] 3.1 Read-only check in the running app on For you: a sale-only match sits under One way, "You can swap N" rows sit under Mutual, and Mutual only N matches the Mutual only list (read-only verified, no writes)
- [x] 3.2 Update `packages/api/AGENTS.md` Trade matching: Mutual is the smaller of the swap counts (`tradeTheyHave`, `tradeYouHave`), sale lists never count toward it, the candidate prefilter uses `a_t`/`b_t`, and the new cache key versions; drop the line that says nothing reads the `trade*` counts. `apps/web/AGENTS.md` and the root `AGENTS.md` need no change
- [ ] 3.3 After archive, rename the scenario "A sale list and a buying want list make a person mutual" in `openspec/specs/web-trade-browse/spec.md` to "A sale list never makes a person mutual": a MODIFIED block can't drop or rename a scenario, so this change keeps the old title over the new behaviour
