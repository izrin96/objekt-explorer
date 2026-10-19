import type { SeenPeople } from "../../lib/trade-feed";
import { redis, redisFailOpen } from "../redis";

const SCOPE_TTL_SECONDS = 3600;

const keyOf = (viewerId: string, token: string) => `trade:feed-scope:1:${viewerId}:${token}`;

/** The token a set of people is stored under: the same people always give the same one. */
export function scopeToken(seen: SeenPeople) {
  const sorted = { mutual: seen.mutual.toSorted(), oneWay: seen.oneWay.toSorted() };
  return new Bun.CryptoHasher("sha1").update(JSON.stringify(sorted)).digest("hex").slice(0, 24);
}

/** A snapshot that has expired or can't be read reads as none: the current rankings stand alone. */
export async function loadScope(viewerId: string, token: string): Promise<SeenPeople | undefined> {
  const stored = await redisFailOpen("trade scope", () => redis.get(keyOf(viewerId, token)));
  try {
    return stored ? (JSON.parse(stored) as SeenPeople) : undefined;
  } catch {
    return undefined;
  }
}

/** the cursor still works without its snapshot, so a failed save is let go */
export async function saveScope(viewerId: string, token: string, seen: SeenPeople) {
  await redisFailOpen("trade scope", () =>
    redis.set(keyOf(viewerId, token), JSON.stringify(seen), "EX", SCOPE_TTL_SECONDS),
  );
}
