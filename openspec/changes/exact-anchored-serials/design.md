# Design

## Context

`isSerialEstimated(mintedAt)` in `packages/lib/src/serial.ts` is the whole rule today, called in three places in `packages/api`: `shownSerials` (`services/offer/verify.ts`), `toCandidate` (`services/offer/picker/shared.ts`, seven call sites in `picker/`) and the serial map in `services/chat/cards.ts`. Each already holds the objekt's id and mint time; none holds its collection's ranges.

What makes a range anchored lives in the indexer database: `collection.serial_batches` (`[{start, end}]`), `collection.serial_anchors` (`[{tokenId, serial, …}]`) and the collection's pre-cutoff objekts with `serial > 0`. The worker's `computeOfflineSerials` (`apps/worker/src/lib/serial-math.ts`) uses the same three inputs to pin a range, so the API's rule must read anchoring the same way.

## Goals / Non-Goals

**Goals:**
- One place answers "which of these objekt ids sit in an anchored range", and all three call sites use it.
- The answer is always current: a manual anchor added with `script/serial-anchor.ts`, or a range the worker rewrote, shows on the next read.

**Non-Goals:**
- Caching the answer, or storing it on the collection or the objekt.
- Any change in `apps/worker` or to stored ranges.

## Decisions

**Read anchoring at request time, in one indexer query.** A new module `packages/api/src/services/objekt/serial-anchored.ts` exports `anchoredSerialIds(ids)`, returning the set of ids that sit in an anchored range:

```sql
select o.id
from objekt o join collection c on c.id = o.collection_id
where o.id in (…) and o.minted_at >= :cutoff and c.serial_batches is not null
  and exists (
    select 1 from jsonb_array_elements(c.serial_batches) b
    where o.id::bigint between (b->>'start')::bigint and (b->>'end')::bigint
      and (exists (select 1 from objekt a
                   where a.collection_id = c.id and a.serial > 0 and a.minted_at < :cutoff
                     and a.id::bigint between (b->>'start')::bigint and (b->>'end')::bigint)
        or exists (select 1 from jsonb_array_elements(coalesce(c.serial_anchors, '[]')) m
                   where (m->>'tokenId')::bigint between (b->>'start')::bigint and (b->>'end')::bigint)))
```

The inner `objekt a` lookup is served by the covering index `(collection_id) INCLUDE (id, serial, minted_at)`. The filter on `serial_batches is not null` rather than `on_offline = 'offline'` keeps the pre-assigned Z collections (`preAssignedCollections`), which take the offline path while being online. Ids are sent in chunks of 500, as `readTransferable` does. Measured on production: 99–137 ms for 60 objekts from a laptop over Tailscale.

Alternative: the worker stores an `anchored` flag on each range. Rejected: every path that writes ranges (`storeRanges`, `applyGridWrites`, `serial-anchor.ts`) would have to keep it right, stored ranges would need a production backfill, and range equality checks in `storeRanges` would have to ignore it. The read costs one query and can never go stale.

**The rule stays pure in `@repo/lib/serial`.** `isSerialEstimated(mintedAt, anchored)` takes the anchoring as a required boolean, so a call site that forgets to look it up fails to type-check. Its test sits in `packages/lib/src/serial.test.ts`. The SQL is not unit-tested (tests cover pure modules only); it is checked read-only against production in the tasks.

**Call sites pass a set.** `shownSerials` and `cards.ts` already run their serial query inside an async function, so they await `anchoredSerialIds` beside it (`Promise.all`, no waterfall). `toCandidate` is synchronous and stays so: it takes the set as an argument, and each picker function loads it once for the page of objekts it is about to map.

## Risks / Trade-offs

- [A stored range hides an unminted separator, so a token past it is off by 1–3 while its range is anchored] → Measured on v1 data: 2 of 1,441,567 serials in multi-anchor ranges disagree with their range's lowest anchor, both in Binary01. The worker also numbers from the nearest anchor, so a range anchored on both sides is right on both.
- [A wrong manual anchor marks its whole range exact] → Anchors are added by hand through `serial-anchor.ts`, which refuses one that contradicts the range; one is stored today.
- [The extra query on a collection with no anchored range scans all its pre-cutoff-filtered rows through the index] → These are post-cutoff collections, mostly under a few thousand objekts; the timing above includes 60 Summer26 objekts, the worst case, at 137 ms.
- [The mark disappears from serials users were told to double-check] → That is the change. The note still shows whenever any estimated serial is on screen.

## Migration Plan

Deploy web only. No schema, worker or data change. Rollback is reverting the commit.
