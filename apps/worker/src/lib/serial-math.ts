// The pure serial arithmetic behind populate-serial: no database or Cosmo API
// access, so it can be tested on its own.

// v1 metadata (which carried the serial number) shut down at this instant.
// Objekts minted before it have authoritative v1 serials that this job must
// never overwrite; objekts minted at/after it have no serial from Cosmo and are
// this job's responsibility to compute.
export const V1_CUTOFF_MS = Date.parse("2026-06-04T08:07:02Z");

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

// From Atom02 on, Modhaus reserves offline batches in whole 100-token blocks,
// separated by a few foreign "separator" tokens. Discovery only sees minted
// tokens, so it misreads two shapes, both fixed by refineBatches:
//  - a reserved block with no mints yet sits between two minted separators and
//    is taken for a foreign gap, so every later serial comes out 100 too low;
//  - a batch absorbs unminted tokens at its start and gets a length that is not
//    a multiple of 100, so every later serial comes out too high.
const BLOCK_SIZE = 100;
// separators number 1-3 between two blocks and grow with the gap (13 in a
// 6,213-token gap); more minted tokens than this means a foreign block
const maxGapSeparators = (gapLength: number) => Math.max(6, Math.ceil(gapLength / 200));
// separators can still be unminted themselves, leaving runs a few tokens past a
// whole number of blocks
const MAX_UNMINTED_SEPARATORS = 15;
// gaps up to this size were validated against v1 and user-reported serials
const MAX_RESERVED_GAP = 20000;

export type Batch = { start: number; end: number };

/** a gap too short for one block, or too long to have been validated, is never claimed */
export function mayHoldReservedBlocks(gap: Batch): boolean {
  const length = gap.end - gap.start + 1;
  return length >= BLOCK_SIZE && length <= MAX_RESERVED_GAP;
}

/**
 * The reserved blocks a gap between two batches holds, given the tokens minted
 * inside it: none unless its minted tokens are only separators and its unminted
 * runs are whole blocks give or take a few unminted separators.
 */
export function claimGapBlocks(
  gap: Batch,
  mintedTokenIds: number[],
  presentTokenIds: ReadonlySet<number>,
): Batch[] {
  const gapLength = gap.end - gap.start + 1;
  if (mintedTokenIds.length > maxGapSeparators(gapLength)) return [];

  const mintedIds = mintedTokenIds.toSorted((a, b) => a - b);
  // our own token inside the gap means the stored ranges are stale
  if (mintedIds.some((t) => presentTokenIds.has(t))) return [];

  const runs: Batch[] = [];
  let runStart = gap.start;
  for (const t of [...mintedIds, gap.end + 1]) {
    if (t > runStart) runs.push({ start: runStart, end: t - 1 });
    runStart = t + 1;
  }
  const unmintedSeparators = runs.reduce((n, r) => n + ((r.end - r.start + 1) % BLOCK_SIZE), 0);
  if (unmintedSeparators > MAX_UNMINTED_SEPARATORS) return [];

  const claimed: Batch[] = [];
  for (const r of runs) {
    const length = r.end - r.start + 1;
    if (length >= BLOCK_SIZE) claimed.push({ start: r.start + (length % BLOCK_SIZE), end: r.end });
  }
  return claimed;
}

/**
 * Trim a closed batch whose length is not a whole number of blocks to the
 * smallest whole-block range that ends at its discovered end and still holds
 * all its tokens. Only ever shrinks: growing would swallow the foreign token
 * that ended discovery. The frontier batch is left alone, its end is
 * provisional.
 */
export function snapBatchLengths(batches: Batch[], presentTokenIds: number[]): Batch[] {
  return batches.map((b, i) => {
    if (i === batches.length - 1) return b;
    if ((b.end - b.start + 1) % BLOCK_SIZE === 0) return b;

    let lowest = Infinity;
    for (const t of presentTokenIds) {
      if (t >= b.start && t <= b.end && t < lowest) lowest = t;
    }
    if (lowest === Infinity) return b;

    const start = b.end - Math.ceil((b.end - lowest + 1) / BLOCK_SIZE) * BLOCK_SIZE + 1;
    return start > b.start ? { start, end: b.end } : b;
  });
}
