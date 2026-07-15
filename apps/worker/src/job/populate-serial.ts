import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt, chunk } from "@repo/lib";
import { and, eq, asc, ne, notInArray, inArray, or, lte, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import { preAssignedCollections as excludeCollections } from "@/lib/serial-constants";

const COLLECTION_CONCURRENCY = 5;
const DB_BATCH_SIZE = 500;

// v1 metadata (which carried the serial number) shut down at this instant.
// Objekts minted before it have authoritative v1 serials that this job must
// never overwrite; objekts minted at/after it have no serial from Cosmo and are
// this job's responsibility to compute.
export const V1_CUTOFF_MS = Date.parse("2026-06-04T08:07:02Z");

// ===========================================================================
// Online objekt serial numbering
// ===========================================================================
//
// Online objekts are far simpler than offline ones: a collection's tokenIds are
// contiguous and minted in order, so the serial is just the objekt's mint
// position within the collection (1, 2, 3, ...) — no reserved batches, no
// foreign gaps. New objekts (serial = 0) are appended after the current maximum
// serial, in tokenId order.
//
// Exception — "pre-assigned" collections: a few collections marked online were
// actually given reserved tokenIds up front (like offline objekts), so their
// serial can't be derived from mint order. processCollection detects these and
// skips them; they are routed through the offline path instead (see
// excludeCollections and populateSerialOffline).

export async function populateSerial() {
  const collectionDiscover = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        eq(collections.onOffline, "online"),
        ne(collections.slug, "empty-collection"),
        // skip collection that already pre-assigned tokenId
        notInArray(collections.slug, excludeCollections),
      ),
    );

  if (collectionDiscover.length === 0) {
    console.log("[populateSerial] No collections with zero serials found");
    return;
  }

  console.log(`[populateSerial] Found ${collectionDiscover.length} collections with zero serials`);

  await chunk(collectionDiscover, COLLECTION_CONCURRENCY, async (batch) => {
    await Promise.all(batch.map(({ id }) => processCollection(id)));
  });

  console.log("[populateSerial] Done");
}

/**
 * Assign serials to the POST-cutoff objekts of an ONLINE collection, continuing
 * the numbering above the highest trusted pre-cutoff serial, and return the ones
 * whose stored serial differs.
 *
 * `sortedByTokenId` MUST be ascending by tokenId. Rules:
 *  - PRE-cutoff objekts are ground truth — their stored serial is trusted and
 *    NEVER changed, even if it does not match tokenId order (Cosmo's own value).
 *  - POST-cutoff objekts have no authoritative serial, so we number them in
 *    tokenId order starting at `max(pre-cutoff serial) + 1`. Continuing from the
 *    max (rather than restarting at a fresh rank) keeps the numbering collision-
 *    free: a collection whose serials are sparse (e.g. reserved/unminted slots
 *    consume serials, so max serial > objekt count) still gets correct post-cutoff
 *    serials instead of low ranks that already belong to other objekts. For a
 *    dense collection this equals the tokenId rank. This is what heals late-index
 *    inversions: a low-tokenId objekt indexed late lands in tokenId order instead
 *    of being appended at the very end.
 *  - `headSkip`: when true, the lowest-tokenId objekt (idx 0) is an intentional
 *    permanent serial 0 — preserved and consuming no serial.
 */
export function computeOnlineSerials(
  sortedByTokenId: { id: string; serial: number; mintedAt: string }[],
  cutoffMs: number,
  headSkip: boolean,
): { updates: { id: string; newSerial: number }[] } {
  // highest serial among trusted pre-cutoff objekts; post-cutoff serials continue
  // above it so a reassignment can never collide with an existing serial.
  let maxPre = 0;
  sortedByTokenId.forEach((o, idx) => {
    if (headSkip && idx === 0) return;
    if (Date.parse(o.mintedAt) < cutoffMs && o.serial > maxPre) maxPre = o.serial;
  });

  const updates: { id: string; newSerial: number }[] = [];
  let next = maxPre + 1;
  sortedByTokenId.forEach((o, idx) => {
    // preserved head serial 0
    if (headSkip && idx === 0) return;
    // pre-cutoff: trust the stored serial, never change it
    if (Date.parse(o.mintedAt) < cutoffMs) return;

    const canonical = next++;
    if (canonical !== o.serial) {
      updates.push({ id: o.id, newSerial: canonical });
    }
  });

  return { updates };
}

/**
 * Populate + self-heal serials for one online collection:
 *  - load objekts sorted by tokenId (after a short mint delay);
 *  - if brand new, verify it isn't a pre-assigned collection (lowest tokenId must
 *    equal the collection's boundary base) and skip if it is;
 *  - assign post-cutoff serials from tokenId rank and write the diffs, healing
 *    inversions from out-of-order indexing. Pre-cutoff serials are trusted and
 *    never changed; an intentional head serial 0 is preserved.
 */
async function processCollection(collectionId: string) {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));

  if (allObjekts.length === 0) {
    return;
  }

  const sorted = allObjekts.toSorted((a, b) => parseInt(a.id) - parseInt(b.id));

  const isNew = sorted.every((a) => a.serial === 0);

  if (isNew) {
    // Detect pre-assigned collections: call findBoundaryTokenId
    // backwards. If the base token matches the first objekt's tokenId,
    // the collection boundary is properly positioned — proceed.
    // Otherwise it's a pre-assigned collection — skip.
    const [collection] = await indexer
      .select({ collectionId: collections.collectionId })
      .from(collections)
      .where(eq(collections.id, collectionId))
      .limit(1);

    if (!collection) return;

    const firstTokenId = parseInt(sorted[0]!.id);
    const baseTokenId = await findBoundaryTokenId(collection.collectionId, firstTokenId, -1);

    if (baseTokenId !== firstTokenId) {
      console.log(`[populateSerial] Collection ${collectionId}: Pre-assigned, skipping`);
      return;
    }
  }

  // Assign post-cutoff serials from tokenId rank and write the ones that differ;
  // pre-cutoff serials are trusted and never touched. This SELF-HEALS inversions
  // caused by out-of-order indexing: a low-tokenId objekt indexed late used to be
  // appended as maxSerial+1 (a too-high serial); now it lands at its tokenId rank
  // and the displaced objekts shift back, in the same run.
  //
  // An old collection may intentionally keep its lowest-tokenId objekt at serial
  // 0 (headSkip) — that objekt is preserved and the rest number from 1 after it.
  const headSkip = !isNew && sorted[0]!.serial === 0;
  const { updates } = computeOnlineSerials(sorted, V1_CUTOFF_MS, headSkip);

  if (updates.length === 0) {
    console.log(`[populateSerial] Collection ${collectionId}: No updates needed`);
    return;
  }

  await writeSerialUpdates(updates);

  console.log(`[populateSerial] Collection ${collectionId}: Updated ${updates.length} objekts`);
}

/**
 * Write serial updates in chunks inside one transaction, using a CASE-per-id
 * expression so each chunk is a single UPDATE statement.
 */
export async function writeSerialUpdates(updates: { id: string; newSerial: number }[]) {
  await indexer.transaction(async (tx) => {
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const batch = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = batch.map((u) => u.id);
      const caseExpr = batch
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await tx
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
    }
  });
}

/**
 * Recompute offline serials from batch ranges and diff against stored values.
 * Pre-cutoff v1 serials are authoritative and never produce an update.
 */
export function computeOfflineSerialUpdates(
  rows: { id: string; serial: number; mintedAt: string }[],
  batches: { start: number; end: number }[],
): { id: string; newSerial: number }[] {
  const computed = computeOfflineSerials(rows, batches, V1_CUTOFF_MS);
  const byId = new Map(rows.map((o) => [o.id, o] as const));
  const updates: { id: string; newSerial: number }[] = [];
  for (const { id, serial } of computed) {
    const obj = byId.get(id)!;
    // objekts minted before the v1 cutoff keep their authoritative v1 serial
    // and are never overwritten
    if (obj.serial > 0 && Date.parse(obj.mintedAt) < V1_CUTOFF_MS) {
      continue;
    }
    if (serial !== obj.serial) {
      updates.push({ id, newSerial: serial });
    }
  }
  return updates;
}

const BATCH_SIZE = 20;

export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1,
  maxOffset?: number,
): Promise<number | null>;
export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
): Promise<number>;
export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
  maxOffset: number,
): Promise<number | null>;
export async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1 | 1,
  maxOffset?: number,
): Promise<number | null> {
  const targetSlug = slugifyObjekt(targetCollectionId);

  for (let offset = 0; ; offset += BATCH_SIZE) {
    const batch: number[] = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const step = offset + i + 1;
      // stop at the cap: never scan more than maxOffset tokens away from the
      // start (bounds the scan to a known gap; null result = no boundary found)
      if (maxOffset !== undefined && step > maxOffset) break;
      const tokenId = startTokenId + direction * step;
      if (direction === -1 && tokenId < 1) break;
      batch.push(tokenId);
    }

    if (batch.length === 0) break;

    const results = await Promise.all(
      batch.map(async (tokenId) => {
        try {
          const raw = await fetchMetadataV3(String(tokenId));
          const metadata = normalizeV3(raw, String(tokenId));
          return { tokenId, slug: slugifyObjekt(metadata.objekt.collectionId) };
        } catch (error) {
          if (error instanceof FetchError && error.status === 404) {
            return { tokenId, slug: null };
          }
          throw error;
        }
      }),
    );

    for (const result of results) {
      if (result.slug === null) continue;
      if (result.slug !== targetSlug) {
        return result.tokenId - direction;
      }
    }
  }

  return null;
}

// ===========================================================================
// Offline objekt serial numbering
// ===========================================================================
//
// Cosmo's v1 metadata endpoint used to carry each objekt's serial number, but it
// was shut down (see V1_CUTOFF_MS). v3 replaced it and has no serial, so for
// objekts minted at/after the cutoff we must reconstruct the serial ourselves.
//
// How serials work for offline objekts:
//  - Modhaus reserves contiguous tokenId ranges ("batches") per collection, and
//    a collection can get several non-contiguous batches over time, e.g. 200-300
//    then 500-600, with 301-499 belonging to a DIFFERENT collection ("foreign").
//    binary02 301a members are heavily multi-batch (dozens of batches each,
//    separated by 1-2 foreign tokens).
//  - The serial is the objekt's 1-based position in the concatenation of its
//    reserved ranges: foreign tokens are skipped, but UNMINTED tokenIds inside a
//    reserved range still consume a serial (serial = tokenId - batchStart + 1
//    within a batch, continuing across batches).
//
// Two-step reconstruction:
//  1. discoverBatches() finds the reserved ranges by probing the Cosmo v3 API.
//     Ranges are persisted in collection.serial_batches and reused.
//  2. computeOfflineSerials() turns ranges + tokenIds into serials, ANCHORED on
//     pre-cutoff v1 serials (which are ground truth). This is essential: the API
//     cannot attribute unminted (404) tokens to a collection, so discovery alone
//     mis-sizes batches and drifts serials — anchoring on v1 corrects it.
//
// See the JSDoc on discoverBatches / computeOfflineSerials for the details.

// Safety cap for the initial backward scan to the first batch's base. Only
// relevant when the first batch has NO v1 anchor (a collection whose first batch
// was reserved entirely after the cutoff); anchored batches ignore batch0.start.
// Measured max reserved "head" (unminted tokens below the first mint) across all
// offline collections is ~6.3k, so 10k leaves margin for a future large drop.
const INITIAL_BACKWARD_CAP = 10000;

/**
 * Discover the reserved tokenId ranges (batches) that make up an offline
 * collection. Modhaus can reserve several non-contiguous ranges over time
 * (e.g. 200-300 then 500-600, with 301-499 belonging to another collection).
 *
 * Only the gaps *between present tokens* are probed, each scan bounded by that
 * gap's size, so unminted tails are never scanned unboundedly. A gap that turns
 * out to be all-unminted (no foreign token) keeps the surrounding tokens in the
 * same batch; a gap containing a foreign token splits the batch.
 *
 * Returns ordered ranges ascending by start. The trailing batch's `end` is
 * provisional (max present token) since no token follows it yet.
 *
 * `resumeFromStart` enables incremental rediscovery: pass the known start of the
 * (provisional) frontier batch to skip everything below it. Closed batches never
 * change, so only the frontier region is re-probed. Caller prepends the stable
 * closed batches to the result.
 */
export async function discoverBatches(
  targetCollectionId: string,
  presentTokenIds: number[],
  resumeFromStart?: number,
): Promise<{ start: number; end: number }[]> {
  const all = [...new Set(presentTokenIds)].sort((a, b) => a - b);
  const sorted = resumeFromStart === undefined ? all : all.filter((t) => t >= resumeFromStart);
  if (sorted.length === 0) return [];

  const batches: { start: number; end: number }[] = [];

  // start of the first batch: use the known frontier start when resuming,
  // otherwise walk back from the lowest present token to the foreign boundary
  // (null = treat the lowest present token as the base)
  let batchStart =
    resumeFromStart ??
    (await findBoundaryTokenId(targetCollectionId, sorted[0]!, -1, INITIAL_BACKWARD_CAP)) ??
    sorted[0]!;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const next = sorted[i + 1];

    if (next === undefined) {
      // frontier batch: nothing after it, end is provisional (max present)
      batches.push({ start: batchStart, end: cur });
      break;
    }

    const gap = next - cur;
    if (gap <= 1) continue; // contiguous, same batch

    // is there a foreign token inside the gap? bounded scan of the gap only
    const scannedEnd = await findBoundaryTokenId(targetCollectionId, cur, 1, gap - 1);

    if (scannedEnd === null) continue; // gap is all unminted, same batch

    // foreign token found: current batch ends here, next batch starts higher up
    // inside the same gap
    batches.push({ start: batchStart, end: scannedEnd });
    batchStart = (await findBoundaryTokenId(targetCollectionId, next, -1, gap - 1)) ?? next;
  }

  return batches;
}

/**
 * Compute the serial of every objekt from the discovered batch ranges, anchored
 * on pre-cutoff v1 serials.
 *
 * Within one reserved batch the serial increments by 1 per tokenId, so any
 * objekt with a known v1 serial (minted before the cutoff) pins that whole
 * batch's numbering: `serial(tid) = anchor.serial + (tid - anchor.tid)`. Using
 * the nearest anchor by tokenId makes this robust to batch-boundary errors
 * caused by unminted (404) tokens, which the Cosmo API cannot attribute to any
 * collection — those errors only shift where an unminted boundary sits, never a
 * minted objekt's position relative to an anchor in its own run.
 *
 * Batches with no v1 anchor (reserved entirely after the cutoff) fall back to a
 * serial start chained from the previous batch — approximate, since it trusts
 * the discovered range sizes, but it inherits the true (anchored) numbering of
 * earlier batches instead of accumulating error from the very first batch.
 */
export function computeOfflineSerials(
  objekts: { id: string; serial: number; mintedAt: string }[],
  batches: { start: number; end: number }[],
  cutoffMs: number,
): { id: string; serial: number }[] {
  const batchIndexOf = (tid: number) => batches.findIndex((b) => tid >= b.start && tid <= b.end);

  // collect v1 anchors (pre-cutoff objekts with a real serial) per batch,
  // tokenId ascending
  const anchors: { tid: number; serial: number }[][] = batches.map(() => []);
  for (const o of objekts) {
    if (o.serial > 0 && Date.parse(o.mintedAt) < cutoffMs) {
      const tid = parseInt(o.id);
      const bi = batchIndexOf(tid);
      if (bi !== -1) anchors[bi]!.push({ tid, serial: o.serial });
    }
  }
  for (const list of anchors) list.sort((a, b) => a.tid - b.tid);

  // serial at each batch's start: pinned by an anchor when the batch has one,
  // otherwise chained from the previous batch's end (used only for anchorless,
  // fully-post-cutoff batches)
  const serialStart: number[] = [];
  let prevEnd = 0;
  for (let bi = 0; bi < batches.length; bi++) {
    const b = batches[bi]!;
    const list = anchors[bi]!;
    const start = list.length > 0 ? list[0]!.serial - (list[0]!.tid - b.start) : prevEnd + 1;
    serialStart.push(start);
    prevEnd = start + (b.end - b.start);
  }

  // nearest anchor by tokenId within a batch (binary search on the sorted list)
  const nearestAnchor = (list: { tid: number; serial: number }[], tid: number) => {
    let lo = 0;
    let hi = list.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (list[mid]!.tid < tid) lo = mid + 1;
      else hi = mid;
    }
    const a = list[lo]!;
    const b = list[lo - 1];
    if (b && Math.abs(b.tid - tid) <= Math.abs(a.tid - tid)) return b;
    return a;
  };

  const result: { id: string; serial: number }[] = [];
  for (const o of objekts) {
    const tid = parseInt(o.id);
    const bi = batchIndexOf(tid);
    if (bi === -1) continue;

    const list = anchors[bi]!;
    const serial =
      list.length > 0
        ? (() => {
            const anchor = nearestAnchor(list, tid);
            return anchor.serial + (tid - anchor.tid);
          })()
        : serialStart[bi]! + (tid - batches[bi]!.start);

    if (serial > 0) result.push({ id: o.id, serial });
  }
  return result;
}

export async function populateSerialOffline() {
  const affectedCollections = await indexer
    .selectDistinctOn([collections.id], { id: collections.id })
    .from(collections)
    .innerJoin(objekts, eq(objekts.collectionId, collections.id))
    .where(
      and(
        eq(objekts.serial, 0),
        or(
          and(eq(collections.onOffline, "offline"), ne(collections.slug, "empty-collection")),
          // extra collection with pre-assigned tokenId
          inArray(collections.slug, excludeCollections),
        ),
      ),
    );

  if (affectedCollections.length === 0) {
    console.log("[populateSerialOffline] No collections with zero serials found");
    return;
  }

  console.log(
    `[populateSerialOffline] Found ${affectedCollections.length} collections with zero serials`,
  );

  await chunk(affectedCollections, COLLECTION_CONCURRENCY, async (batch) => {
    await Promise.all(batch.map(({ id }) => processCollectionOffline(id)));
  });

  console.log("[populateSerialOffline] Done");
}

/**
 * Populate serials for one offline collection:
 *  1. load its objekts (after a short mint delay) and the stored batch ranges;
 *  2. (re)discover ranges if a tokenId falls outside them — incrementally from
 *     the frontier when possible, else a full rescan — and persist;
 *  3. recompute every post-cutoff objekt's serial via computeOfflineSerials and
 *     write the ones that changed (heals serials shifted by a newly-discovered
 *     batch). Pre-cutoff v1 serials are never overwritten.
 */
async function processCollectionOffline(collectionId: string) {
  const allObjekts = await indexer
    .select({ id: objekts.id, serial: objekts.serial, mintedAt: objekts.mintedAt })
    .from(objekts)
    .where(
      and(
        eq(objekts.collectionId, collectionId),
        // give some delay
        lte(objekts.mintedAt, new Date(Date.now() - 120 * 1000).toISOString()),
      ),
    )
    .orderBy(asc(objekts.id));

  const zeroObjekts = allObjekts.filter((o) => o.serial === 0);

  if (zeroObjekts.length === 0) {
    return;
  }

  const [collection] = await indexer
    .select({
      collectionId: collections.collectionId,
      serialBatches: collections.serialBatches,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) {
    console.log(`[populateSerialOffline] Collection ${collectionId}: Not found`);
    return;
  }

  const presentTokenIds = allObjekts.map((o) => parseInt(o.id));

  const isCovered = (ranges: { start: number; end: number }[], tokenId: number) =>
    ranges.some((r) => tokenId >= r.start && tokenId <= r.end);

  let batches = collection.serialBatches ?? [];

  // (re)discover batches when unknown or a token falls outside known ranges
  // (a new or extended batch appeared); otherwise reuse stored ranges without
  // touching the Cosmo API
  const uncovered =
    batches.length === 0 ? presentTokenIds : presentTokenIds.filter((t) => !isCovered(batches, t));

  if (uncovered.length > 0) {
    // Incremental: closed batches (all but the last) ended at a real foreign
    // boundary and never change; only the provisional frontier batch can extend
    // or spawn new batches. Re-discover from the frontier start only. Fall back
    // to a full rescan if any uncovered token sits below the frontier (rare:
    // a late-indexed old mint).
    const frontier = batches[batches.length - 1];
    const canIncremental = frontier !== undefined && uncovered.every((t) => t >= frontier.start);

    try {
      if (canIncremental) {
        const rediscovered = await discoverBatches(
          collection.collectionId,
          presentTokenIds,
          frontier.start,
        );
        batches = [...batches.slice(0, -1), ...rediscovered];
      } else {
        batches = await discoverBatches(collection.collectionId, presentTokenIds);
      }
    } catch {
      console.log(`[populateSerialOffline] Collection ${collectionId}: API error, skipping`);
      return;
    }

    if (batches.length === 0) {
      console.log(`[populateSerialOffline] Collection ${collectionId}: No batches discovered`);
      return;
    }

    await indexer
      .update(collections)
      .set({ serialBatches: batches })
      .where(eq(collections.id, collectionId));
  }

  // Recompute the serial of every objekt from the batch ranges (anchored on
  // pre-cutoff v1 serials) and update any that differ. This heals objekts whose
  // serial was written before a new/intermediate batch was discovered (which
  // shifts every later serial), not just newly-minted serial=0 objekts.
  const updates = computeOfflineSerialUpdates(allObjekts, batches);

  if (updates.length === 0) {
    console.log(`[populateSerialOffline] Collection ${collectionId}: No valid updates`);
    return;
  }

  await writeSerialUpdates(updates);

  console.log(
    `[populateSerialOffline] Collection ${collectionId}: Updated ${updates.length} objekts`,
  );
}
