# Proposal

## Why

A fan-made ranking tool re-reads every page of every cream02 collection's holders about every five minutes through `GET /api/v1/collections/{collectionSlug}/holders` (481 collections, about 9,000 pages per crawl, all answered 200). The holder ranking is cached for four minutes, so nearly every crawl rebuilds it from the indexer database, and every page also read nicknames from the main database. On 2026-11-21 and 22 this kept the 2-core production host near 100% CPU.

## What Changes

- Holder figures may be up to 15 minutes old, down from five, so a ranking survives the scraper's five-minute re-crawl and is rebuilt about once per 15 minutes per collection instead of on almost every visit.
- Holder nicknames follow the same refresh as the ranking: a renamed holder shows under the new nickname within 15 minutes, no longer on the next request. Each page then makes no main-database read except the signed-in viewer's own profile.
- No change to the holders request, response shape, paging, ranking order or the viewer's pinned row.

## Non-goals

- Rate limiting or blocking the scraper (Cloudflare WAF rule, `/api/v1` rate limit): separate work.
- A precomputed holders table filled by the worker: rejected in design.md.
- The `objekt (collection_id, owner) INCLUDE (serial)` index that makes each rebuild cheaper: a separate indexer change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `web-collection-holders`: "Holder data freshness" (five minutes) is replaced by "Holder data refresh": figures and nicknames up to 15 minutes old.

## Impact

- Routes: the objekt drawer's Holders tab and `GET /api/v1/collections/{collectionSlug}/holders` (one shared procedure).
- Code: `packages/api/src/services/objekt/holders.ts` (cache lifetime, cache key version, nicknames read once per ranking) and a new pure `packages/api/src/lib/holder-ranking.ts` with its test.
- Data: the Valkey key moves from `holders:<slug>` to `holders:2:<slug>`; old keys expire within four minutes of deploy. Entries live up to 14 minutes instead of four, so more collections are held at once.
- No migration, no input or output change, no web change.
