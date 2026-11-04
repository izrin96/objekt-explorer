import { DAY_MS } from "./time";

const dayOf = (at: Date) => at.toISOString().slice(0, 10);

const midnightUtc = (at: Date) => Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());

/** The UTC dates (`YYYY-MM-DD`) of the last `days` days, oldest first, today included. */
export function rangeDays(days: number, now: Date): string[] {
  const today = midnightUtc(now);
  return Array.from({ length: days }, (_, i) => dayOf(new Date(today - (days - 1 - i) * DAY_MS)));
}

/** Midnight UTC of the range's first day: the lower bound every count reads from. */
export function rangeStart(days: number, now: Date): Date {
  return new Date(midnightUtc(now) - (days - 1) * DAY_MS);
}

export type DayCount = { day: string; key: string; count: number };

/** Per-day counts for every key, a quiet day reading 0, and the range's sum per key. */
export function fillDays<K extends string>(rows: DayCount[], days: string[], keys: readonly K[]) {
  const zero = () => Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  const byDay = new Map(days.map((day) => [day, zero()]));
  const sum = zero();
  for (const row of rows) {
    const counts = byDay.get(row.day);
    if (!counts || !(keys as readonly string[]).includes(row.key)) continue;
    counts[row.key as K] += row.count;
    sum[row.key as K] += row.count;
  }
  return { days: days.map((day) => ({ day, counts: byDay.get(day)! })), sum };
}

/** Linear interpolation over ascending values, as Postgres `percentile_cont`; null when empty. */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const at = (sorted.length - 1) * p;
  const low = Math.floor(at);
  const high = Math.ceil(at);
  return sorted[low]! + (sorted[high]! - sorted[low]!) * (at - low);
}

/**
 * A wrong copy's state for staff. One still pending on a closed leg was never decided: the right
 * objekt verified the leg, another copy was accepted, or the trade ended, and nothing declines
 * the rest, so it reads as `lapsed`, as a request to cancel left open by an ended trade does.
 */
export function staffCopyStatus(status: "pending" | "accepted" | "declined", legOpen: boolean) {
  return status === "pending" && !legOpen ? "lapsed" : status;
}
