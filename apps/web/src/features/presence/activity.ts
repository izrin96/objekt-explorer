import { ACTIVE_REPORT_SECONDS } from "@repo/api/schemas/presence";

/** How often a tab tells the server the viewer is active, at most. */
export const ACTIVE_REPORT_MS = ACTIVE_REPORT_SECONDS * 1000;
/** How soon activity tries again after a failed or refused report. */
export const REPORT_RETRY_MS = 10_000;

/** Whether activity now should be reported: never reported, or the last report a minute old. */
export function shouldReport(lastReport: number | undefined, now: number) {
  return lastReport === undefined || now - lastReport >= ACTIVE_REPORT_MS;
}

/** The `lastReport` to keep after a report failed at `now`, so the next try comes after a short wait. */
export function failedReportAt(now: number) {
  return now - ACTIVE_REPORT_MS + REPORT_RETRY_MS;
}

/** The localStorage key holding when some tab of this person last reported, shared by every tab. */
export const lastReportKey = (userId: string) => `presence:last-report:${userId}`;

/**
 * The shared last report from its stored value. Garbage or a time ahead of `now` (a clock moved
 * back) reads as none, so a bad value can never hold reports back.
 */
export function storedLastReport(raw: string | null, now: number) {
  if (!raw) return undefined;
  const at = Number(raw);
  return Number.isFinite(at) && at <= now ? at : undefined;
}
