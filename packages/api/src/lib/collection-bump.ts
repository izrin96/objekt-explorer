/**
 * The next `collection:modified-at`, in ms: now, or a second past the stored one when that is
 * later. Last-Modified is floored to the second, so a bump in the same second as the date a
 * browser holds would otherwise read as unchanged and get a 304.
 */
export function nextModifiedAt(nowMs: number, previous: string | null) {
  const previousMs = previous ? Date.parse(previous) : Number.NaN;
  return Number.isNaN(previousMs) ? nowMs : Math.max(nowMs, previousMs + 1000);
}

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// a decoded time this far past now is a bad id, not a write: kept, it would pin Last-Modified in
// the future and answer every later change with a 304
const FUTURE_SLACK_MS = 24 * 60 * 60 * 1000;

/** When a UUIDv7 was made, in ms, from its first 48 bits; 0 for any other id. */
export function uuidV7Ms(id: string, nowMs: number) {
  if (!UUID_V7.test(id)) return 0;
  const ms = Number.parseInt(id.slice(0, 8) + id.slice(9, 13), 16);
  return ms > nowMs + FUTURE_SLACK_MS ? 0 : ms;
}

/**
 * When the collection list last changed, in ms: the latest of the stored bump, the newest row's
 * `created_at` and the time its id was made. `created_at` is the block time of the row's first
 * transfer, which a row written later (a lagging batch, a replayed held transfer) carries from
 * before the last bump; the id is made when the row is written, so a new row always moves this.
 */
export function listModifiedMs(
  stored: string | null,
  newest: { id: string; createdAt: string } | undefined,
  nowMs: number,
) {
  const storedMs = stored ? Date.parse(stored) || 0 : 0;
  if (!newest) return storedMs;
  return Math.max(storedMs, Date.parse(newest.createdAt) || 0, uuidV7Ms(newest.id, nowMs));
}
