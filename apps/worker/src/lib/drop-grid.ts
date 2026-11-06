// The drop grid: the members of one "A" drop share its reserved tokens in equal
// slots laid out in member order, with foreign minted tokens (separators)
// skipped. Pure, so it can be tested without the database.

import type { Batch } from "./serial-math";

export const MAX_SLOT = 5000;

export type DropRegion = {
  start: number;
  // sorted token ids of each member, in member order
  memberTokens: number[][];
  // sorted foreign minted tokens from `start` up to `readUntil`
  foreign: number[];
  // the highest token whose owner was read; a drop ending past it cannot be judged
  readUntil: number;
};

export type DropGrid = {
  slot: number;
  end: number;
  separators: number;
  // each member's reserved ranges, split around separators inside its slot
  ranges: Batch[][];
};

/**
 * Every slot size that fits, and the grid when exactly one does. A size fits
 * when every member token inside the drop lands in its own member's slot,
 * every member has a token in its slot, and the token right after the drop's
 * end is foreign.
 */
export function fitDropGrid(region: DropRegion): { slots: number[]; grid: DropGrid | null } {
  const { start, memberTokens, foreign, readUntil } = region;
  const n = memberTokens.length;
  if (n < 2) return { slots: [], grid: null };

  // a token's compressed position: separators below it take no position
  const foreignBelow = (t: number) => {
    let lo = 0;
    let hi = foreign.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (foreign[mid]! < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const owned = memberTokens
    .flatMap((tokens, member) =>
      tokens.filter((t) => t >= start).map((t) => ({ pos: t - start - foreignBelow(t), member })),
    )
    .sort((a, b) => a.pos - b.pos);

  // member 0's slot reaches at least its last token below member 1's first
  const firstOfNext = memberTokens[1]![0]!;
  const lastOfFirst = memberTokens[0]!.filter((t) => t < firstOfNext).at(-1);
  const minSlot =
    lastOfFirst === undefined ? 1 : lastOfFirst - start - foreignBelow(lastOfFirst) + 1;

  const slots: number[] = [];
  for (let slot = Math.max(1, minSlot); slot <= MAX_SLOT; slot++) {
    if (fits(slot)) slots.push(slot);
  }
  if (slots.length !== 1) return { slots, grid: null };
  return { slots, grid: gridOf(slots[0]!) };

  function endOf(slot: number) {
    const last = n * slot - 1;
    let k = 0;
    while (k < foreign.length && foreign[k]! <= start + last + k) k++;
    return { end: start + last + k, separators: k };
  }

  function fits(slot: number) {
    const { end, separators } = endOf(slot);
    if (end + 1 > readUntil || foreign[separators] !== end + 1) return false;
    const total = n * slot;
    const seen = Array.from({ length: n }, () => false);
    for (const { pos, member } of owned) {
      if (pos >= total) break;
      if (Math.floor(pos / slot) !== member) return false;
      seen[member] = true;
    }
    return seen.every(Boolean);
  }

  function gridOf(slot: number): DropGrid {
    const { end, separators } = endOf(slot);
    // the real token at a compressed position
    const realOf = (pos: number) => {
      let k = 0;
      while (k < foreign.length && foreign[k]! <= start + pos + k) k++;
      return start + pos + k;
    };
    const ranges = memberTokens.map((_, m) => {
      const lo = realOf(m * slot);
      const hi = realOf((m + 1) * slot - 1);
      const pieces: Batch[] = [];
      let from = lo;
      for (const f of foreign) {
        if (f < lo || f > hi) continue;
        if (f > from) pieces.push({ start: from, end: f - 1 });
        from = f + 1;
      }
      if (from <= hi) pieces.push({ start: from, end: hi });
      return pieces;
    });
    return { slot, end, separators, ranges };
  }
}

/** a batch the drop grid set, which needs no edge probes */
export function insideDrop(batch: Batch, drop: { start: number; end: number }) {
  return batch.start >= drop.start && batch.end <= drop.end;
}

/**
 * A member's batches with its grid ranges in place of everything inside the
 * drop. Batches wholly outside the drop are kept; a batch crossing the drop's
 * end keeps its part from the member's first token past the end.
 */
export function mergeGridRanges(
  batches: Batch[],
  slotRanges: Batch[],
  drop: { start: number; end: number },
  tokens: number[],
): Batch[] {
  const kept: Batch[] = [];
  for (const b of batches) {
    if (b.end < drop.start || b.start > drop.end) {
      kept.push(b);
      continue;
    }
    if (b.end > drop.end) {
      const next = tokens.find((t) => t > drop.end && t <= b.end);
      if (next !== undefined) kept.push({ start: next, end: b.end });
    }
  }
  return [...kept, ...slotRanges].sort((a, b) => a.start - b.start);
}
