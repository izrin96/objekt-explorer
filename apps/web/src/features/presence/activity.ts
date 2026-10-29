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
