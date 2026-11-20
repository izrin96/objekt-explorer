import { indexer } from "@repo/db/indexer";
import { collections, objekts } from "@repo/db/indexer/schema";
import { isGridDrop, preBlockSeasons } from "@repo/lib/serial";
import { and, eq, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";

import type { ConfirmedSerial } from "@/lib/cosmo-anchors";
import { type DropGrid, mergeGridRanges } from "@/lib/drop-grid";
import type { Logger } from "@/lib/log";
import { type MergeTally, withConfirmed } from "@/lib/merge-tally";
import {
  anchorGapHoles,
  anchorGaps,
  type Batch,
  claimGapBlocks,
  closeAnchorGaps,
  computeOfflineSerialUpdates,
  gapSeparators,
  type ManualAnchor,
  mayHoldReservedBlocks,
  shiftedSerials,
  snapBatchLengths,
} from "@/lib/serial-math";

import {
  type DropMember,
  dropSpanMemo,
  type DropSpanOf,
  fitDrop,
  fittedMemberRun,
  tokenIdRange,
} from "./serial-grids";

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

export type SerialRow = { id: string; serial: number; mintedAt: string };

/**
 * Close the anchor gaps one place explains (`closeAnchorGaps`), reading the
 * minted tokens of the holes it may claim blocks in.
 */
async function closeGaps(
  batches: Batch[],
  rows: SerialRow[],
  presentTokenIds: number[],
  anchors: ManualAnchor[],
  knownForeign: number[],
): Promise<Batch[]> {
  const gaps = anchorGaps(rows, batches, anchors);
  if (gaps.length === 0) return batches;
  const minted: number[] = [];
  for (const hole of anchorGapHoles(batches, gaps)) {
    const inside = await indexer
      .select({ id: objekts.id })
      .from(objekts)
      .where(tokenIdRange(hole.start, hole.end));
    minted.push(
      ...gapSeparators(
        inside.map((o) => parseInt(o.id)),
        knownForeign,
        hole,
      ),
    );
  }
  return closeAnchorGaps(batches, presentTokenIds, gaps, minted);
}

/**
 * Apply the 100-token block rules to discovered batches, then close the gaps
 * the collection's anchors prove. Idempotent, so it can run on a mix of stored
 * and freshly discovered ranges.
 */
async function refineBatches(
  season: string,
  batches: Batch[],
  rows: SerialRow[],
  anchors: ManualAnchor[],
  knownForeign: number[] = [],
): Promise<Batch[]> {
  if (preBlockSeasons.includes(season)) return batches;
  const presentTokenIds = rows.map((o) => parseInt(o.id));
  const blocks = snapBatchLengths(
    await fillReservedGaps(batches, presentTokenIds, knownForeign),
    presentTokenIds,
  );
  return closeGaps(blocks, rows, presentTokenIds, anchors, knownForeign);
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
 * mints to the populate job's own delay. `confirmed` (by slug) joins each
 * member's manual anchors through `withConfirmed`, and `anchors` holds the
 * result, merged against the member's new ranges.
 */
export async function planGridWrites(
  members: DropMember[],
  start: number,
  grid: DropGrid,
  opts: {
    mintedBefore?: string;
    confirmed?: Map<string, ConfirmedSerial[]>;
    tally?: MergeTally;
  } = {},
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
    const batches = mergeGridRanges(member.batches, grid.ranges[i]!, span, member.tokens);
    const merge = withConfirmed(
      anchorsOf.get(member.id) ?? [],
      opts.confirmed?.get(member.slug),
      own,
      batches,
    );
    opts.tally?.record(member.id, merge);
    const { anchors } = merge;
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
 * Discovered batches as a rewrite stores them: refined to whole blocks and to
 * the collection's anchors, then fitted to its grid. `rows` are every objekt
 * of the collection.
 */
export async function fitRanges(
  collectionId: string,
  season: string,
  discovered: Batch[],
  rows: SerialRow[],
  anchors: ManualAnchor[],
  opts: { knownForeign?: number[]; dropSpanOf?: DropSpanOf } = {},
) {
  const refined = await refineBatches(season, discovered, rows, anchors, opts.knownForeign);
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
 * Returns how many were written. `tx` writes inside the caller's transaction.
 */
export async function rewriteSerials(
  rows: { id: string; serial: number; mintedAt: string }[],
  batches: Batch[],
  anchors: ManualAnchor[],
  logger: Logger,
  label: string,
  tx?: IndexerTransaction,
) {
  const updates = computeOfflineSerialUpdates(rows, batches, anchors);
  if (updates.length === 0) return 0;
  const shift = shiftedSerials(rows, updates);
  if (shift) {
    logger.warn(`${label}: ${shift.count} shown serial(s) moved by ${shift.min}..${shift.max}`);
  }
  await writeSerialUpdates(updates, tx);
  return updates.length;
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
