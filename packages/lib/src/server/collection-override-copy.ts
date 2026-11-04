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

/**
 * How a read of the overrides is answered. A plain read takes any copy at once and refreshes one
 * a minute old behind it, so a slow app database never holds up an indexer read. A read asking
 * for `freshAfter` waits for a copy that `copyServes`, as does the first read of a process.
 */
export function overrideReadPlan(
  copyStartedAt: number | undefined,
  now: number,
  freshAfter?: number,
): "serve" | "serve-and-refresh" | "wait" {
  if (copyStartedAt === undefined) return "wait";
  if (copyServes(copyStartedAt, now, freshAfter)) return "serve";
  return freshAfter === undefined ? "serve-and-refresh" : "wait";
}
