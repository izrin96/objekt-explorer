# Tasks

The worktree already holds an uncommitted draft of group 1 (`lib/holder-ranking.ts`, its test, and the nickname read in `holders.ts`). Apply reviews it against these tasks rather than rewriting it.

## 1. Nicknames in the cached ranking

- [x] 1.1 Add the pure `rankHolders(rows, nicknames)` in `packages/api/src/lib/holder-ranking.ts` (rank and bucket logic moved unchanged from `holders.ts`, nickname as the tuple's fifth field) with `holder-ranking.test.ts` covering tied ranks, the lowest-serial tie-break, nicknames by lowercased address, buckets and a missing serial; verify `bun test src/lib/holder-ranking.test.ts` passes in `packages/api`, and lint and typecheck pass for `@repo/api`
- [x] 1.2 In `holders.ts`, read nicknames once per ranking build through `chunkMap` with `TOKEN_CHUNK_SIZE` and `= ANY($1::citext[])`, store them in the ranking under `holders:2:<slug>`, drop the per-page nickname read, and update the comment that said a rename shows on the next request; verify the request input and output types are unchanged and `bun run check --filter=@repo/api` passes

## 2. Fifteen-minute freshness

- [x] 2.1 Set `RANKING_TTL` to `14 * 60` in `holders.ts` and update its comment (with the web's 60-second `staleTime`, figures stay within fifteen minutes); verify `bun run check --filter=@repo/api` passes
- [x] 2.2 Check against a local Valkey (never the production `REDIS_URL` in the root `.env`) that a holders request writes `holders:2:<slug>` with a TTL near 840 s and that a second page within that time makes no main-database query; verify by reading the key's `TTL` and the dev server's query log

## 3. Documentation

- [x] 3.1 Confirm no `AGENTS.md` (root, `packages/api`, `apps/web`) describes the holders cache lifetime or the per-page nickname read; none does today, so state in the apply summary that none changed, and verify with `grep -rn "holders" AGENTS.md packages/api/AGENTS.md apps/web/AGENTS.md`

## Workflow follow-up

- Archive the change once it is deployed and the Holders tab is checked on production.
