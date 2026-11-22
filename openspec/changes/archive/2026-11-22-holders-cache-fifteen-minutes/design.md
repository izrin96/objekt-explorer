# Design

## Context

`fetchHolders` (`packages/api/src/services/objekt/holders.ts`) builds one viewer-independent ranking per collection: a `GROUP BY owner` over the indexer's `objekt` rows, cached in Valkey under `holders:<slug>` for 4 minutes (`RANKING_TTL`), with a 15-second, 16-entry memo per process in front of it. Nicknames were read from the main database's `user_address` on every page, for the 10 to 50 addresses on it. The web query adds a 60-second `staleTime`, which is why the server TTL sits a minute under the spec's limit.

Measured on production (2026-11-22, 82k scraper requests over 44 minutes): each page is re-read about every 297 s (p10 228 s, p90 350 s), one collection's pages are walked in about 10 s, and only about 200 of the 481 rankings were in Valkey at once.

## Goals / Non-Goals

**Goals:**
- A ranking outlives the scraper's re-crawl, so rebuilds drop from about one per crawl to one per 15 minutes per collection.
- A page reads nothing from the main database except the signed-in viewer's own profile.

**Non-Goals:**
- Changing the memo (`MEMO_TTL_MS`, `MEMO_MAX`). Production swap is full, and a larger memo holds more parsed rankings in each web process. The Valkey entry, not the memo, carries the longer life.

## Decisions

- **TTL 14 minutes (`RANKING_TTL = 14 * 60`).** With the web's 60-second `staleTime` a figure is at most 15 minutes old, the same split the 4-minute TTL kept against the old five-minute limit.
- **Nicknames read once per ranking build and stored in it.** `rankHolders` (`lib/holder-ranking.ts`, pure and tested) takes the indexer rows and an address-to-nickname map and returns the ranked tuples with the nickname as a fifth field. The build reads `user_address` in `chunkMap` batches of `TOKEN_CHUNK_SIZE`, one `= ANY($1::citext[])` parameter per batch: the largest collections have about 25k holders, past what one bound parameter per address allows, and `citext[]` keeps `user_address_address_idx` usable (EXPLAINed on production: Index Cond on the array). A cache per page was rejected: each page comes back once per crawl, about five minutes later, so it would rarely hit.
- **Key version bump to `holders:2:<slug>`.** The stored tuple changed shape; an old entry read by new code would show every nickname as missing.
- **Valkey over a worker-filled table.** A table refreshed by the worker would recompute every collection (about 16,900) when the scraper reads 481, rewrite millions of `(collection, holder)` rows per refresh on a host already short of memory, and still cost a database read per page. The cache computes only collections someone opens.

## Risks / Trade-offs

- [A just-received copy or a rename takes up to 15 minutes to show in the Holders tab] → accepted by the owner; the spec states the limit.
- [More rankings held in Valkey at once: up to 14 minutes each, the largest about 1 MB of JSON] → bounded by collections actually opened. Watch Valkey memory after deploy.
- [A ranking build now makes two sequential reads, the indexer then the main database] → once per 14 minutes per collection instead of a main-database read on every page.

## Migration Plan

Deploy web. Old `holders:<slug>` keys are no longer read and expire within 4 minutes. Rollback is a redeploy of the previous image; the `holders:2:` keys it leaves expire within 14 minutes.
