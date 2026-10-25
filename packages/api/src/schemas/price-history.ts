export const SNAPSHOT_CRON = "5 * * * *";

export const PRICE_HISTORY_RANGES = ["7d", "30d", "90d", "all"] as const;
export type PriceHistoryRange = (typeof PRICE_HISTORY_RANGES)[number];

const RANGE_DAYS = { "7d": 7, "30d": 30, "90d": 90 } as const;

// not from lib/time: the web client imports this file, and the build denies the rest of src/
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const CACHE_MINUTE = 10;

export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** Seconds until the next minute 10: five minutes after the snapshot job starts at minute 5. */
export function historyCacheSeconds(now: Date): number {
  const intoHour = now.getTime() % HOUR_MS;
  const target = CACHE_MINUTE * MINUTE_MS;
  const wait = intoHour < target ? target - intoHour : HOUR_MS + target - intoHour;
  return Math.ceil(wait / 1000);
}

export function rangeStart(range: PriceHistoryRange, now: Date): string | null {
  if (range === "all") return null;
  return utcDate(new Date(now.getTime() - (RANGE_DAYS[range] - 1) * DAY_MS));
}

export function floorChange(first: number | null, current: number | null): number | null {
  if (first === null || current === null || first === 0) return null;
  return (current - first) / first;
}

/** True while the history spans 7 days or fewer, counting both ends. */
export function rangesLocked(since: string, now: Date): boolean {
  const days = Math.round((Date.parse(utcDate(now)) - Date.parse(since)) / DAY_MS) + 1;
  return days <= RANGE_DAYS["7d"];
}
