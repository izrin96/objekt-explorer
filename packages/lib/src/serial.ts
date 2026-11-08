// Cosmo's v1 metadata, which carried the serial, shut down at this instant. Serials of objekts
// minted at or after it are populate-serial's estimate.
export const V1_CUTOFF_MS = Date.parse("2026-06-04T08:07:02Z");

export function isSerialEstimated(mintedAt: Date | string) {
  return new Date(mintedAt).getTime() >= V1_CUTOFF_MS;
}

/** Serial 0 means not numbered yet. */
export function shownSerial(serial: number) {
  return serial > 0 ? serial : null;
}

// Seasons from before Modhaus reserved offline batches in whole 100-token
// blocks. The block rules do not hold for them; Atom01 is scattered, outside
// the batch model altogether.
export const preBlockSeasons = ["Atom01", "Binary01", "Cream01", "Divine01", "Ever01"];

/** an "A" drop of a block season, whose members may share a grid */
export function isGridDrop(c: { season: string; collectionNo: string; onOffline: string }) {
  return (
    c.onOffline === "offline" && c.collectionNo.endsWith("A") && !preBlockSeasons.includes(c.season)
  );
}

// a drop whose last member mints later than this is left to the estimate's own rules
export const OPEN_DROP_DAYS = 7;

/**
 * A drop is still minting while some collection of it carries no grid fit
 * time and its earliest collection is younger than OPEN_DROP_DAYS: a member
 * yet to mint has no collection row, so its reserved slot is invisible.
 */
export function dropStillMinting(input: {
  fitted: boolean;
  firstCreatedAt: Date | string;
  now: number;
}) {
  const age = input.now - new Date(input.firstCreatedAt).getTime();
  return !input.fitted && age < OPEN_DROP_DAYS * 24 * 60 * 60 * 1000;
}

// a range wider than this reads as no answer, so only its low end is shown
const ESTIMATE_RANGE_MAX = 100;
// unseen tokens at a batch's end: unminted separators or the tail's own copies
const ESTIMATE_SLACK = 3;
// how far above a last range the ceiling is looked for; a ceiling further off
// could only round to a block that far past the newest mint, which is no answer
export const ESTIMATE_LOOKAHEAD = 1000;

/** `min === max` is the exact answer; `max` null reads "at least min". */
export type SerialEstimate = { min: number; max: number | null };

/**
 * How many serials an offline collection has, read from its reserved ranges.
 * Every range but the last is closed by another collection's token, so its
 * length counts as is. The last one ends at the newest mint; `ceiling` is the
 * first minted token of another collection above it, which bounds it (null
 * when none was found, or the next token is the collection's own: its ranges
 * are behind). In block seasons the last range takes the largest whole 100,
 * else 50, that fits under the ceiling, when that lands within the slack of it.
 *
 * A reserved range with no minted token yet is invisible, so the ranges can
 * come up short; `topSerial`, the highest serial on any copy, floors the result.
 */
export function estimateSerials(input: {
  season: string;
  batches: { start: number; end: number }[];
  ceiling: number | null;
  topSerial: number;
  // the collection's drop is still minting: the next foreign mint may sit past
  // slots of members yet to mint, so it bounds nothing
  open?: boolean;
}): SerialEstimate | null {
  const { season, batches, ceiling, topSerial, open = false } = input;
  if (season === "Atom01" || batches.length === 0) return null;
  const fromRanges = rangeEstimate(season, batches, open ? null : ceiling);
  if (topSerial > (fromRanges.max ?? fromRanges.min)) return { min: topSerial, max: null };
  return { min: Math.max(fromRanges.min, topSerial), max: fromRanges.max };
}

function rangeEstimate(
  season: string,
  batches: { start: number; end: number }[],
  ceiling: number | null,
): SerialEstimate {
  const last = batches.at(-1)!;
  const closed = batches.slice(0, -1).reduce((n, b) => n + b.end - b.start + 1, 0);
  const length = last.end - last.start + 1;
  const atLeast = { min: closed + length, max: null };
  if (ceiling === null || ceiling <= last.end) return atLeast;

  const room = ceiling - 1 - last.end;
  const longest = length + room;
  if (!preBlockSeasons.includes(season)) {
    const block = [100, 50]
      .map((unit) => Math.floor(longest / unit) * unit)
      .find((size) => size >= length && longest - size <= ESTIMATE_SLACK);
    if (block !== undefined) return { min: closed + block, max: closed + block };
  }
  if (room <= ESTIMATE_SLACK) return { min: closed + length, max: closed + length };
  if (room > ESTIMATE_RANGE_MAX) return atLeast;
  return { min: closed + length, max: closed + longest };
}
