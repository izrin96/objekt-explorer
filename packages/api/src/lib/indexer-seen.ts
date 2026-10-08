import { type IndexerSeen, indexerSeenSchema } from "../schemas/offer";

export const INDEXER_BEHIND_MS = 5 * 60 * 1000;

/** The stored reading, or null when it is missing or malformed. */
export function parseIndexerSeen(raw: string | null): IndexerSeen | null {
  if (raw === null) return null;
  try {
    const parsed = indexerSeenSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Fails safe: an unknown or stale reading counts as behind. */
export function isBehind(seen: IndexerSeen | null, now: number) {
  if (seen === null) return true;
  const seenUntil = new Date(seen.seenUntil).getTime();
  const readAt = new Date(seen.readAt).getTime();
  if (Number.isNaN(seenUntil) || Number.isNaN(readAt)) return true;
  return now - seenUntil > INDEXER_BEHIND_MS || now - readAt > INDEXER_BEHIND_MS;
}
