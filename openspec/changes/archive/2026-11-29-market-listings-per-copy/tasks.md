# Tasks

## 1. Counting rule

- [x] 1.1 Add `cheapestOfCopy` to `countedListings` in `packages/api/src/services/market/aggregate.ts`, pass the rate table from every caller (`listings.ts`, `fetchMarketSummary`, `fetchPriceSnapshot`); `bun run lint` and `bun run typecheck` pass in `packages/api`, and `bun test` passes.
- [x] 1.2 Leave hide-serial listings out of the merge and require a collection on the duplicate; read-only on production, counted visible listings equal distinct visible seller-and-copy pairs (76,814) and all 50,024 hide-serial listings still count.
- [x] 1.3 Convert to USD through one jsonb lookup in `usdPriceExpr`; read-only on production the summary rows equal the CASE version's (0 differences over 13,563 collections) and the summary takes 0.9–1.7 s; the worker typecheck and `import-boundary.test.ts` pass.

## 2. Docs

- [x] 2.1 `packages/api/AGENTS.md` (Market floor and price history) states the rule and its cost; no other package's conventions change.

## Workflow follow-up

- After deploy: Deploy web and worker, then open `/market` and the drawer's Market tab for Nakyoung d207 and `binary02-seoyeon-301a`: each copy shows once per seller, and the counts match `GET /api/v1/market/{collectionSlug}/stats`; `bun run build --filter=web` passes before the deploy.
- After the next hourly recording, `GET /api/v1/market/binary02-seoyeon-301a/history` shows today's listing count at the merged figure and earlier days unchanged.
