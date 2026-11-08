import { fetchMetadataV3, normalizeV3 } from "@repo/cosmo/server/metadata";
import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { slugifyObjekt } from "@repo/lib";
import { isGridDrop } from "@repo/lib/serial";
import { and, between, eq, inArray, isNotNull, isNull, like, lte, ne, or, sql } from "drizzle-orm";
import { FetchError } from "ofetch";

import {
  type DropGrid,
  type DropRegion,
  fitDropGrid,
  fitMemberRun,
  MAX_SLOT,
  mergeGridRanges,
  rosterComplete,
} from "@/lib/drop-grid";
import type { Logger } from "@/lib/log";
import { preBlockSeasons } from "@/lib/serial-constants";
import {
  type Batch,
  claimGapBlocks,
  computeOfflineSerialUpdates,
  gapSeparators,
  type ManualAnchor,
  shiftedSerials,
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
async function refineBatches(
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

export { isGridDrop };

/**
 * A drop's minted members in member order and the region the grid is fitted
 * on, read from the indexer. `override` stands in for one member's stored
 * batches while they are being rewritten. Null when fewer than two members
 * have minted. `pinned`: the token right before the start is another
 * collection's minted token; a first member yet to mint leaves it unminted.
 * `complete`: as many members minted as the largest other A drop of the
 * season and artist (`rosterComplete`). A fit marks or settles a drop only
 * when both hold.
 */
async function loadDrop(
  key: DropKey,
  override?: { collectionId: string; batches: Batch[] },
): Promise<{
  members: DropMember[];
  region: DropRegion;
  pinned: boolean;
  complete: boolean;
} | null> {
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

  const members = await mintedMembers(rows, override);
  if (members.length < 2) return null;

  const first = members[0]!;
  const start = Math.min(first.tokens[0]!, ...first.batches.map((b) => b.start));
  const highest = Math.max(...members.map((m) => m.tokens.at(-1)!));
  const readUntil = Math.min(highest, start + members.length * MAX_SLOT) + MAX_SLOT;

  const memberIds = new Set(members.map((m) => m.id));
  const region = await indexer
    .select({ id: objekts.id, collectionId: objekts.collectionId })
    .from(objekts)
    .where(tokenIdRange(start - 1, readUntil));
  const isForeign = (o: (typeof region)[number]) =>
    o.collectionId === null || !memberIds.has(o.collectionId);
  const before = region.find((o) => parseInt(o.id) === start - 1);
  const foreign = region
    .filter((o) => parseInt(o.id) >= start && isForeign(o))
    .map((o) => parseInt(o.id))
    .sort((a, b) => a - b);

  // collection rows appear at a member's first mint, so a row count is a minted count
  const others = await indexer
    .select({ size: sql<number>`count(*)::int` })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.artist, key.artist),
        eq(collections.onOffline, "offline"),
        like(collections.collectionNo, "%A"),
        ne(collections.collectionNo, key.collectionNo),
      ),
    )
    .groupBy(collections.collectionNo);

  return {
    members,
    region: { start, memberTokens: members.map((m) => m.tokens), foreign, readUntil },
    pinned: before !== undefined && isForeign(before),
    complete: rosterComplete(
      members.length,
      others.map((o) => o.size),
    ),
  };
}

/**
 * The collections' minted tokens, sorted, with their stored batches (or
 * `override`'s), keeping only collections with a mint, in token order.
 */
async function mintedMembers<R extends { id: string; batches: Batch[] | null }>(
  rows: R[],
  override?: { collectionId: string; batches: Batch[] },
) {
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
  return rows
    .map((r) => ({
      ...r,
      batches: override?.collectionId === r.id ? override.batches : (r.batches ?? []),
      tokens: (tokensOf.get(r.id) ?? []).sort((a, b) => a - b),
    }))
    .filter((m) => m.tokens.length > 0)
    .sort((a, b) => a.tokens[0]! - b.tokens[0]!);
}

/** A drop loaded and fitted: every slot size that fits, and the grid when exactly one does. */
export async function fitDrop(key: DropKey, override?: { collectionId: string; batches: Batch[] }) {
  const drop = await loadDrop(key, override);
  if (!drop) return { drop: null, slots: [], grid: null };
  const { slots, grid } = fitDropGrid(drop.region);
  return { drop, slots, grid };
}

/** The token span of a grid-fitted drop, from the stored batches, else null. */
export type DropSpanOf = (key: DropKey) => Promise<{ start: number; end: number } | null>;

/** A DropSpanOf that loads and fits each drop once. */
export function dropSpanMemo(): DropSpanOf {
  const seen = new Map<string, ReturnType<DropSpanOf>>();
  return (key) => {
    const name = `${key.season}|${key.collectionNo}|${key.artist}`;
    let span = seen.get(name);
    if (!span) {
      span = fitDrop(key).then(({ drop, grid }) =>
        drop && grid ? { start: drop.region.start, end: grid.end } : null,
      );
      seen.set(name, span);
    }
    return span;
  };
}

/**
 * The collection's batches with its grid slot in place of everything inside
 * the grid: the drop grid's when its drop fits, else the member grid's when its
 * member run fits, else the batches unchanged. Runs after refineBatches on every
 * path that stores ranges, so a rediscovery never undoes a grid. `dropSpanOf`
 * lets a caller that checks many collections share drop fits. `fitted`: the
 * batches come from a run fit, or a drop fit that is start-pinned with its
 * whole roster minted, so the collection may carry a fit mark.
 */
async function applyGrids(
  collectionId: string,
  batches: Batch[],
  dropSpanOf: DropSpanOf = dropSpanMemo(),
): Promise<{ batches: Batch[]; fitted: boolean }> {
  const unfitted = { batches, fitted: false };
  const [c] = await indexer
    .select({
      season: collections.season,
      collectionNo: collections.collectionNo,
      artist: collections.artist,
      member: collections.member,
      onOffline: collections.onOffline,
    })
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);
  if (!c || !isGridDrop(c)) return unfitted;

  const override = { collectionId, batches };
  const { drop, grid: dropGrid } = await fitDrop(c, override);
  const i = drop?.members.findIndex((m) => m.id === collectionId) ?? -1;
  if (drop && dropGrid && i !== -1) {
    return {
      batches: mergeGridRanges(
        batches,
        dropGrid.ranges[i]!,
        { start: drop.region.start, end: dropGrid.end },
        drop.members[i]!.tokens,
      ),
      fitted: drop.pinned && drop.complete,
    };
  }

  // the collection's own drop was just fitted with its new batches, so only
  // the other collections' drops come from `dropSpanOf`
  const ownUnfitted = new Set([`${c.season}|${c.collectionNo}|${c.artist}`]);
  const run = await fittedMemberRun(c, collectionId, override, (key) =>
    ownUnfitted.has(`${key.season}|${key.collectionNo}|${key.artist}`)
      ? Promise.resolve(null)
      : dropSpanOf(key),
  );
  if (!run) return unfitted;
  const j = run.members.findIndex((m) => m.id === collectionId);
  return {
    batches: mergeGridRanges(
      batches,
      run.grid.ranges[j]!,
      { start: run.region.start, end: run.grid.end },
      run.members[j]!.tokens,
    ),
    fitted: true,
  };
}

export type GridPlan = {
  member: DropMember;
  own: { id: string; serial: number; mintedAt: string }[];
  anchors: ManualAnchor[];
  batches: Batch[];
  updates: { id: string; newSerial: number }[];
  rangesChange: boolean;
};

/**
 * Each member's ranges with its slot of a fitted drop or run merged in, and
 * the serial updates they give, anchors passed. `mintedBefore` leaves younger
 * mints to the populate job's own delay.
 */
export async function planGridWrites(
  members: DropMember[],
  start: number,
  grid: DropGrid,
  opts: { mintedBefore?: string } = {},
): Promise<GridPlan[]> {
  const span = { start, end: grid.end };
  const ids = members.map((m) => m.id);
  const rows = await indexer
    .select({
      id: objekts.id,
      serial: objekts.serial,
      mintedAt: objekts.mintedAt,
      collectionId: objekts.collectionId,
    })
    .from(objekts)
    .where(
      and(
        inArray(objekts.collectionId, ids),
        opts.mintedBefore ? lte(objekts.mintedAt, opts.mintedBefore) : undefined,
      ),
    );
  const anchorRows = await indexer
    .select({ id: collections.id, anchors: collections.serialAnchors })
    .from(collections)
    .where(inArray(collections.id, ids));
  const anchorsOf = new Map(anchorRows.map((r) => [r.id, r.anchors ?? []] as const));

  return members.map((member, i) => {
    const own = rows.filter((r) => r.collectionId === member.id);
    const anchors = anchorsOf.get(member.id) ?? [];
    const batches = mergeGridRanges(member.batches, grid.ranges[i]!, span, member.tokens);
    const rangesChange =
      batches.length !== member.batches.length ||
      batches.some(
        (b, j) => b.start !== member.batches[j]!.start || b.end !== member.batches[j]!.end,
      );
    const updates = computeOfflineSerialUpdates(own, batches, anchors);
    return { member, own, anchors, batches, updates, rangesChange };
  });
}

/**
 * Write a fitted drop's or run's planned ranges and serials, one transaction
 * per member, then mark `markIds`. A whole drop in one transaction would hold
 * thousands of objekt row locks the indexer's transfer writes wait on. Marks
 * go last, so a write that fails part way leaves the drop unmarked and
 * `settleOpenDrops` writes it again. Marks land even when nothing else changes.
 */
export async function applyGridWrites(plans: GridPlan[], markIds: string[]) {
  for (const p of plans) {
    if (!p.rangesChange && p.updates.length === 0) continue;
    await indexer.transaction(async (tx) => {
      await tx
        .update(collections)
        .set({ serialBatches: p.batches })
        .where(eq(collections.id, p.member.id));
      await writeSerialUpdates(p.updates, tx);
    });
  }
  if (markIds.length > 0) {
    await indexer
      .update(collections)
      .set({ gridFittedAt: sql`now()` })
      .where(and(inArray(collections.id, markIds), isNull(collections.gridFittedAt)));
  }
}

/**
 * Mark or clear the one collection a range write stored. Only that collection
 * holds its grid slot now, so the rest of its drop or run waits for its own
 * write (or `settleOpenDrops`) before it is marked; an existing mark keeps its time.
 */
async function writeFitMark(
  db: IndexerTransaction | typeof indexer,
  collectionId: string,
  fitted: boolean,
) {
  await db
    .update(collections)
    .set({ gridFittedAt: fitted ? sql`now()` : null })
    .where(
      and(
        eq(collections.id, collectionId),
        fitted ? isNull(collections.gridFittedAt) : isNotNull(collections.gridFittedAt),
      ),
    );
}

/**
 * Discovered batches as a rewrite stores them: refined to whole blocks, then
 * fitted to the collection's grid.
 */
export async function fitRanges(
  collectionId: string,
  season: string,
  discovered: Batch[],
  tokenIds: number[],
  opts: { knownForeign?: number[]; dropSpanOf?: DropSpanOf } = {},
) {
  const refined = await refineBatches(season, discovered, tokenIds, opts.knownForeign);
  return applyGrids(collectionId, refined, opts.dropSpanOf);
}

/**
 * Store `next` in place of `stored`, with its fit marks. Unchanged ranges are
 * not rewritten, but their marks still are. True when the ranges changed.
 */
export async function storeRanges(
  collectionId: string,
  stored: Batch[],
  next: { batches: Batch[]; fitted: boolean },
) {
  const same =
    next.batches.length === stored.length &&
    next.batches.every((b, i) => b.start === stored[i]!.start && b.end === stored[i]!.end);
  if (same) {
    await writeFitMark(indexer, collectionId, next.fitted);
    return false;
  }
  await indexer.transaction(async (tx) => {
    await tx
      .update(collections)
      .set({ serialBatches: next.batches })
      .where(eq(collections.id, collectionId));
    await writeFitMark(tx, collectionId, next.fitted);
  });
  return true;
}

/**
 * Recompute a collection's offline serials from its ranges, anchors passed,
 * write those that changed, and warn when serials already shown move.
 * Returns how many were written.
 */
export async function rewriteSerials(
  rows: { id: string; serial: number; mintedAt: string }[],
  batches: Batch[],
  anchors: ManualAnchor[],
  logger: Logger,
  label: string,
) {
  const updates = computeOfflineSerialUpdates(rows, batches, anchors);
  if (updates.length === 0) return 0;
  const shift = shiftedSerials(rows, updates);
  if (shift) {
    logger.warn(`${label}: ${shift.count} shown serial(s) moved by ${shift.min}..${shift.max}`);
  }
  await writeSerialUpdates(updates);
  return updates.length;
}

export type MemberKey = Omit<DropKey, "collectionNo"> & { member: string };

export type MemberRun = {
  members: DropMember[];
  region: DropRegion;
  // the token right before the start is a minted Z-collection token
  pinned: boolean;
  // a collection of the run sits in a grid-fitted drop, which keeps precedence
  heldByDrop: boolean;
};

/**
 * One member's runs in one block season: their A collections in token order,
 * split wherever another A collection's minted token sits between two of them
 * or more than MAX_SLOT tokens part them. Only runs of two or more come back.
 * `override` stands in for one collection's stored batches while they are
 * being rewritten.
 */
export async function loadMemberRuns(
  key: MemberKey,
  override?: { collectionId: string; batches: Batch[] },
  dropSpanOf: DropSpanOf = dropSpanMemo(),
): Promise<MemberRun[]> {
  if (preBlockSeasons.includes(key.season)) return [];
  const rows = await indexer
    .select({
      id: collections.id,
      slug: collections.slug,
      collectionNo: collections.collectionNo,
      batches: collections.serialBatches,
    })
    .from(collections)
    .where(
      and(
        eq(collections.season, key.season),
        eq(collections.artist, key.artist),
        eq(collections.member, key.member),
        eq(collections.onOffline, "offline"),
        like(collections.collectionNo, "%A"),
      ),
    );
  if (rows.length < 2) return [];

  const ordered = await mintedMembers(rows, override);

  const groups: (typeof ordered)[] = [];
  for (const m of ordered) {
    const run = groups.at(-1);
    const prev = run?.at(-1);
    if (run && prev && (await joinsRun(prev.tokens.at(-1)!, m.tokens[0]!))) run.push(m);
    else groups.push([m]);
  }

  const runs: MemberRun[] = [];
  for (const members of groups) {
    if (members.length < 2) continue;
    const first = members[0]!;
    const start = Math.min(first.tokens[0]!, ...first.batches.map((b) => b.start));
    const highest = Math.max(...members.map((m) => m.tokens.at(-1)!));
    const readUntil = Math.min(highest, start + members.length * MAX_SLOT) + MAX_SLOT;

    const ids = new Set(members.map((m) => m.id));
    const region = await indexer
      .select({
        id: objekts.id,
        collectionId: objekts.collectionId,
        collectionNo: collections.collectionNo,
      })
      .from(objekts)
      .leftJoin(collections, eq(collections.id, objekts.collectionId))
      .where(tokenIdRange(start - 1, readUntil));
    const before = region.find((o) => parseInt(o.id) === start - 1);
    const foreign = region
      .filter(
        (o) => parseInt(o.id) >= start && (o.collectionId === null || !ids.has(o.collectionId)),
      )
      .map((o) => parseInt(o.id))
      .sort((a, b) => a - b);

    let heldByDrop = false;
    for (const m of members) {
      if (
        await dropSpanOf({ season: key.season, collectionNo: m.collectionNo, artist: key.artist })
      ) {
        heldByDrop = true;
        break;
      }
    }

    runs.push({
      members: members.map(({ collectionNo: _, ...m }) => m),
      region: { start, memberTokens: members.map((m) => m.tokens), foreign, readUntil },
      pinned: before?.collectionNo != null && /z$/i.test(before.collectionNo),
      heldByDrop,
    });
  }
  return runs;
}

// two of a member's collections are neighbours in a run when no other A
// collection minted between them
async function joinsRun(prevHighest: number, nextLowest: number) {
  if (nextLowest - prevHighest > MAX_SLOT) return false;
  if (nextLowest - prevHighest <= 1) return true;
  const [between] = await indexer
    .select({ id: objekts.id })
    .from(objekts)
    .innerJoin(collections, eq(collections.id, objekts.collectionId))
    .where(and(tokenIdRange(prevHighest + 1, nextLowest - 1), like(collections.collectionNo, "%A")))
    .limit(1);
  return between === undefined;
}

/** The fitted run holding the collection, with its grid, or null. */
export async function fittedMemberRun(
  key: MemberKey,
  collectionId: string,
  override?: { collectionId: string; batches: Batch[] },
  dropSpanOf?: DropSpanOf,
) {
  const runs = await loadMemberRuns(key, override, dropSpanOf);
  const run = runs.find((r) => r.members.some((m) => m.id === collectionId));
  if (!run || !run.pinned || run.heldByDrop) return null;
  const { grid } = fitMemberRun(run.region);
  return grid ? { ...run, grid } : null;
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
