/**
 * The next `collection:modified-at`, in ms: now, or a second past the stored one when that is
 * later. Last-Modified is floored to the second, so a bump in the same second as the date a
 * browser holds would otherwise read as unchanged and get a 304.
 */
export function nextModifiedAt(nowMs: number, previous: string | null) {
  const previousMs = previous ? Date.parse(previous) : Number.NaN;
  return Number.isNaN(previousMs) ? nowMs : Math.max(nowMs, previousMs + 1000);
}
