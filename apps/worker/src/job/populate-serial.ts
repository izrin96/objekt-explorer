import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt, chunk } from "@repo/lib";
import { and, eq, gte, between, ne, notInArray, inArray, or, lte, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import {
  preAssignedCollections as excludeCollections,
  preBlockSeasons,
} from "@/lib/serial-constants";
import {
  type Batch,
  claimGapBlocks,
  computeOfflineSerialUpdates,
  computeOnlineSerials,
  mayHoldReservedBlocks,
  snapBatchLengths,
  V1_CUTOFF_MS,
} from "@/lib/serial-math";

const COLLECTION_CONCURRENCY = 5;
const DB_BATCH_SIZE = 500;

// objekts minted within this window are left for a later run
const MINT_DELAY_MS = 120 * 1000;

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
        // pre-cutoff serials are never changed, and processCollection skips fresh mints
        gte(objekts.mintedAt, new Date(V1_CUTOFF_MS).toISOString()),
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
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
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
      ),
    );

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

const BATCH_SIZE = 20;

async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: -1,
  maxOffset?: number,
): Promise<number | null>;
async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
): Promise<number>;
async function findBoundaryTokenId(
  targetCollectionId: string,
  startTokenId: number,
  direction: 1,
  maxOffset: number,
): Promise<number | null>;
async function findBoundaryTokenId(
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
 * Match tokenIds in [start, end]. Ids are varchar, so the range is compared per
 * digit length, where string order equals numeric order and the primary key
 * index still applies.
 */
export function tokenIdRange(start: number, end: number) {
  const parts = [];
  for (let len = String(start).length; len <= String(end).length; len++) {
    const lo = Math.max(start, 10 ** (len - 1));
    const hi = Math.min(end, 10 ** len - 1);
    parts.push(
      and(sql`length(${objekts.id}) = ${len}`, between(objekts.id, String(lo), String(hi))),
    );
  }
  return or(...parts);
}

/**
 * Claim the reserved blocks hiding in the gaps between a collection's batches:
 * when a gap's minted tokens are only separators and its unminted runs are
 * whole blocks give or take a few unminted separators, the whole blocks are
 * this collection's own unminted reservations and become batches.
 *
 * Checked on anchored collections: in 29 of 36 such gaps the v1 serials count
 * the block as the collection's own, and never as foreign. User-reported
 * Summer26 serials agree, including one 6,213-token gap. If a foreign token
 * mints inside a claimed block later, verifyBatchBoundaries rediscovers.
 */
async function fillReservedGaps(batches: Batch[], presentTokenIds: number[]): Promise<Batch[]> {
  const present = new Set(presentTokenIds);
  const result: Batch[] = [];

  for (let i = 0; i < batches.length; i++) {
    const cur = batches[i]!;
    result.push(cur);
    const next = batches[i + 1];
    if (next === undefined) break;

    const gap = { start: cur.end + 1, end: next.start - 1 };
    if (!mayHoldReservedBlocks(gap)) continue;

    const minted = await indexer
      .select({ id: objekts.id })
      .from(objekts)
      .where(tokenIdRange(gap.start, gap.end));
    result.push(
      ...claimGapBlocks(
        gap,
        minted.map((o) => parseInt(o.id)),
        present,
      ),
    );
  }

  return result;
}

/**
 * Apply the 100-token block rules to discovered batches. Idempotent, so it can
 * run on a mix of stored and freshly discovered ranges.
 */
export async function refineBatches(
  season: string,
  batches: Batch[],
  presentTokenIds: number[],
): Promise<Batch[]> {
  if (preBlockSeasons.includes(season)) return batches;
  return snapBatchLengths(await fillReservedGaps(batches, presentTokenIds), presentTokenIds);
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
        lte(objekts.mintedAt, new Date(Date.now() - MINT_DELAY_MS).toISOString()),
      ),
    );

  const zeroObjekts = allObjekts.filter((o) => o.serial === 0);

  if (zeroObjekts.length === 0) {
    return;
  }

  const [collection] = await indexer
    .select({
      collectionId: collections.collectionId,
      season: collections.season,
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

    batches = await refineBatches(collection.season, batches, presentTokenIds);

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
