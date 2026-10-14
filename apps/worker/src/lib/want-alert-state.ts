export const OVERLAP_MS = 10 * 60 * 1000;
export const MARK_SPACING_MS = 60 * 1000;

/**
 * `marks` are each run's time and highest visible entry id. An id is assigned when
 * its row is inserted but seen only at commit, so the run re-reads every id above
 * the floor, the mark from at least `OVERLAP_MS` before the previous run;
 * `want_alert_sent` absorbs the repeats.
 * `progress` holds, for a newly discoverable list not yet read to the end, the last
 * entry id read; such a list stays out of `discoverable` until it is done.
 */
export type State = {
  discoverable: number[];
  marks: [number, number][];
  progress?: [number, number][];
};

type Mark = [number, number];

/** The newest mark at least `OVERLAP_MS` older than the newest one, or -1. */
function anchorIndex(marks: Mark[]) {
  const newest = marks.at(-1);
  if (!newest) return -1;
  return marks.findLastIndex(([at]) => at <= newest[0] - OVERLAP_MS);
}

/** The id above which the next run re-reads, whatever the gap since the last one. */
export function overlapFloor(marks: Mark[], cursor: number) {
  const anchor = marks[anchorIndex(marks)] ?? marks[0];
  return Math.min(cursor, anchor?.[1] ?? cursor);
}

/**
 * Adds `mark` unless the newest kept one is under `MARK_SPACING_MS` older (the floor then
 * only gets lower), and drops what lies before the anchor. A count never cuts the anchor.
 */
export function keepMarks(marks: Mark[], mark: Mark) {
  const newest = marks.at(-1);
  const next = newest && mark[0] - newest[0] < MARK_SPACING_MS ? marks : [...marks, mark];
  return next.slice(Math.max(anchorIndex(next), 0));
}

function isMark(value: unknown): value is Mark {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((part) => typeof part === "number" && Number.isFinite(part))
  );
}

export function parseState(value: unknown): State | null {
  if (typeof value !== "object" || value === null) return null;
  const { discoverable, marks } = value as Partial<State>;
  if (!Array.isArray(discoverable) || !Array.isArray(marks) || !marks.every(isMark)) return null;
  return value as State;
}
