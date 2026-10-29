import type { MarketSummaryEntry } from "../schemas/market";
import { getUsdRates } from "./currency-rates";
import { fetchMarketSummary } from "./market-aggregate";
import { redis, redisFailOpen } from "./redis";
import { marketVersion } from "./safety-cache";

const SUMMARY_KEY = "market:summary:2";
const SUMMARY_FRESH_SECONDS = 60;
/** how long a copy stays stored after its last refresh, to be served stale */
const SUMMARY_KEEP_SECONDS = 900;
const SUMMARY_REFRESH_CLAIM_SECONDS = 60;

type StoredSummary = { at: number; version: string; entries: MarketSummaryEntry[] };

/**
 * The last copy this process built or read. While fresh it is served without Redis, which skips
 * parsing about 1 MB per request and, with Redis down, keeps the rebuild to once a minute.
 */
let local: StoredSummary | undefined;

const isFresh = (stored: StoredSummary) => Date.now() - stored.at <= SUMMARY_FRESH_SECONDS * 1000;

function parseStored(json: string | null): StoredSummary | undefined {
  if (!json) return undefined;
  try {
    const stored = JSON.parse(json) as Partial<StoredSummary> | null;
    return typeof stored?.at === "number" &&
      typeof stored.version === "string" &&
      Array.isArray(stored.entries)
      ? (stored as StoredSummary)
      : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Every collection on sale with its count and floor. Rebuilding it reads every sale listing and
 * takes over a second, so a copy past `SUMMARY_FRESH_SECONDS` is returned as it is and refreshed
 * in the background, one process at a time through a Redis claim. A copy stored under an older
 * market version (a ban or trade block since) is never served.
 */
export async function getMarketSummary(): Promise<MarketSummaryEntry[]> {
  const version = await marketVersion();
  if (local?.version === version && isFresh(local)) return local.entries;

  const stored = parseStored(await redisFailOpen("market summary", () => redis.get(SUMMARY_KEY)));
  if (!stored || stored.version !== version) return buildSummary(version);
  local = stored;

  if (!isFresh(stored)) {
    // a failed refresh leaves the stale copy; its claim holds the next try off for a minute
    void refreshSummary(version).catch((error: unknown) => {
      console.warn("[market] summary refresh failed", error);
    });
  }
  return stored.entries;
}

async function refreshSummary(version: string) {
  const claim = await redisFailOpen("market summary", () =>
    redis.send("SET", [
      `${SUMMARY_KEY}:refresh`,
      "1",
      "NX",
      "EX",
      String(SUMMARY_REFRESH_CLAIM_SECONDS),
    ]),
  );
  if (claim !== null) await buildSummary(version);
}

const building = new Map<string, Promise<MarketSummaryEntry[]>>();

/** Concurrent misses in this process share one build. */
function buildSummary(version: string): Promise<MarketSummaryEntry[]> {
  const running = building.get(version);
  if (running) return running;
  const pending = (async () => {
    const entries = await fetchMarketSummary(await getUsdRates());
    const stored: StoredSummary = { at: Date.now(), version, entries };
    local = stored;
    await redisFailOpen("market summary", () =>
      redis.set(SUMMARY_KEY, JSON.stringify(stored), "EX", SUMMARY_KEEP_SECONDS),
    );
    return entries;
  })().finally(() => building.delete(version));
  building.set(version, pending);
  return pending;
}
