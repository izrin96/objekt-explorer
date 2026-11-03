/**
 * The time the indexer has read to: the head block's, stopping one second before the oldest
 * transfer held for its metadata (`heldFromMs`, epoch ms) when that second falls before the head.
 */
export function seenUntilOf(headIso: string, heldFromMs: number | null) {
  return heldFromMs != null && heldFromMs - 1000 < Date.parse(headIso)
    ? new Date(heldFromMs - 1000).toISOString()
    : headIso;
}

/** A block's ISO time from its hex `timestamp` (seconds). */
export function blockTimeOf(hexTimestamp: string) {
  return new Date(Number.parseInt(hexTimestamp, 16) * 1000).toISOString();
}
