/**
 * `marks` are each run's time and highest visible entry id. An id is assigned when
 * its row is inserted but seen only at commit, so the run re-reads every id above
 * the mark from at least `OVERLAP_MS` ago; `want_alert_sent` absorbs the repeats.
 * `progress` holds, for a newly discoverable list not yet read to the end, the last
 * entry id read; such a list stays out of `discoverable` until it is done.
 */
export type State = {
  discoverable: number[];
  marks: [number, number][];
  progress?: [number, number][];
};

export function parseState(stored: string): State | null {
  try {
    const value = JSON.parse(stored) as Partial<State>;
    const valid = Array.isArray(value.discoverable) && Array.isArray(value.marks);
    return valid ? (value as State) : null;
  } catch {
    return null;
  }
}
