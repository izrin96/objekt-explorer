/** How long a process reuses its copy of the overrides. */
export const OVERRIDE_COPY_MS = 60_000;

/**
 * Whether a copy whose read started at `startedAt` may serve a read at `now`. With `freshAfter`
 * (a `collection:modified-at` in ms) the read must have started after it: one that began before a
 * save's commit may miss the save, so it counts as older than the bump that followed.
 */
export function copyServes(startedAt: number, now: number, freshAfter?: number) {
  if (now - startedAt >= OVERRIDE_COPY_MS) return false;
  return freshAfter === undefined || startedAt > freshAfter;
}
