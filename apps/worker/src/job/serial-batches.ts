import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt } from "@repo/lib";
import { and, between, eq, inArray, or, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import { type DropRegion, fitDropGrid, MAX_SLOT, mergeGridRanges } from "@/lib/drop-grid";
import { preBlockSeasons } from "@/lib/serial-constants";
import {
  type Batch,
  claimGapBlocks,
  gapSeparators,
  mayHoldReservedBlocks,
  probeWindow,
  snapBatchLengths,
  tokenIdSpans,
} from "@/lib/serial-math";

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
    const batch = probeWindow(startTokenId, direction, offset, maxOffset, BATCH_SIZE);

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
  const parts = tokenIdSpans(start, end).map(({ len, lo, hi }) =>
    and(sql`length(${objekts.id}) = ${len}`, between(objekts.id, String(lo), String(hi))),
  );
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
 *
 * `knownForeign` are tokens the Cosmo API attributes to another collection. A
 * token id can be assigned and never minted on chain, so the indexer misses it
 * and only this list keeps it out of a claimed block.
 */
async function fillReservedGaps(
  batches: Batch[],
  presentTokenIds: number[],
  knownForeign: number[],
): Promise<Batch[]> {
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
    const separators = gapSeparators(
      minted.map((o) => parseInt(o.id)),
      knownForeign,
      gap,
    );
    result.push(...claimGapBlocks(gap, separators, present));
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
  knownForeign: number[] = [],
): Promise<Batch[]> {
  if (preBlockSeasons.includes(season)) return batches;
  return snapBatchLengths(
    await fillReservedGaps(batches, presentTokenIds, knownForeign),
    presentTokenIds,
  );
}

export type DropKey = {
  season: string;
  collectionNo: string;
  artist: (typeof collections.$inferSelect)["artist"];
};

export type DropMember = { id: string; slug: string; batches: Batch[]; tokens: number[] };

/** an "A" drop of a block season, whose members may share a grid */
export function isGridDrop(c: { season: string; collectionNo: string; onOffline: string }) {
  return (
    c.onOffline === "offline" && c.collectionNo.endsWith("A") && !preBlockSeasons.includes(c.season)
  );
}

/**
 * A drop's minted members in member order and the region the grid is fitted
 * on, read from the indexer. `override` stands in for one member's stored
 * batches while they are being rewritten. Null when fewer than two members
 * have minted.
 */
export async function loadDrop(
  key: DropKey,
  override?: { collectionId: string; batches: Batch[] },
): Promise<{ members: DropMember[]; region: DropRegion } | null> {
  const rows = await indexer
    .select({ id: collections.id, slug: collections.slug, batches: collections.serialBatches })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.collectionNo, key.collectionNo),
        eq(collections.artist, key.artist),
        eq(collections.onOffline, "offline"),
      ),
    );
  if (rows.length < 2) return null;

  const minted = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(
      inArray(
        objekts.collectionId,
        rows.map((r) => r.id),
      ),
    );
  const tokensOf = new Map<string, number[]>();
  for (const o of minted) {
    if (o.collectionId === null) continue;
    const list = tokensOf.get(o.collectionId) ?? [];
    list.push(parseInt(o.id));
    tokensOf.set(o.collectionId, list);
  }

  const members = rows
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      batches: override?.collectionId === r.id ? override.batches : (r.batches ?? []),
      tokens: (tokensOf.get(r.id) ?? []).sort((a, b) => a - b),
    }))
    .filter((m) => m.tokens.length > 0)
    .sort((a, b) => a.tokens[0]! - b.tokens[0]!);
  if (members.length < 2) return null;

  const first = members[0]!;
  const start = Math.min(first.tokens[0]!, ...first.batches.map((b) => b.start));
  const highest = Math.max(...members.map((m) => m.tokens.at(-1)!));
  const readUntil = Math.min(highest, start + members.length * MAX_SLOT) + MAX_SLOT;

  const memberIds = new Set(members.map((m) => m.id));
  const region = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(tokenIdRange(start, readUntil));
  const foreign = region
    .filter((o) => o.collectionId === null || !memberIds.has(o.collectionId))
    .map((o) => parseInt(o.id))
    .sort((a, b) => a - b);

  return {
    members,
    region: { start, memberTokens: members.map((m) => m.tokens), foreign, readUntil },
  };
}

/**
 * The collection's batches with its drop-grid slot in place of everything
 * inside the drop, when its drop fits exactly one slot size; otherwise the
 * batches unchanged. Runs after refineBatches on every path that stores
 * ranges, so a rediscovery never undoes the grid.
 */
export async function applyDropGrid(collectionId: string, batches: Batch[]): Promise<Batch[]> {
  const [c] = await indexer
    .select({
      season: collections.season,
      collectionNo: collections.collectionNo,
      artist: collections.artist,
      onOffline: collections.onOffline,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!c || !isGridDrop(c)) return batches;

  const drop = await loadDrop(c, { collectionId, batches });
  if (!drop) return batches;
  const { grid } = fitDropGrid(drop.region);
  const i = drop.members.findIndex((m) => m.id === collectionId);
  if (!grid || i === -1) return batches;

  return mergeGridRanges(
    batches,
    grid.ranges[i]!,
    { start: drop.region.start, end: grid.end },
    drop.members[i]!.tokens,
  );
}

const DB_BATCH_SIZE = 500;

export type IndexerTransaction = Parameters<Parameters<typeof indexer.transaction>[0]>[0];

/**
 * Write serial updates in chunks inside one transaction, using a CASE-per-id
 * expression so each chunk is a single UPDATE statement.
 */
export async function writeSerialUpdates(
  updates: { id: string; newSerial: number }[],
  tx?: IndexerTransaction,
) {
  const run = async (db: IndexerTransaction) => {
    for (let i = 0; i < updates.length; i += DB_BATCH_SIZE) {
      const batch = updates.slice(i, i + DB_BATCH_SIZE);
      const ids = batch.map((u) => u.id);
      const caseExpr = batch
        .map((u) => sql`WHEN ${u.id} THEN ${u.newSerial}`)
        .reduce((acc, curr) => sql`${acc} ${curr}`, sql``);
      await db
        .update(objekts)
        .set({ serial: sql`(CASE id ${caseExpr} END)::int` })
        .where(inArray(objekts.id, ids));
    }
  };
  if (tx) await run(tx);
  else await indexer.transaction(run);
}
