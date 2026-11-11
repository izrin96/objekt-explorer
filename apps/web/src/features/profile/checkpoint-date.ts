import { endOfDay, format, isEqual } from "date-fns";

import { formatTimestamp } from "@/lib/time";

/** the `at` parameter is an instant; a checkpoint defaults to "the end of that day" */
export function checkpointDate(at: string | undefined): Date | undefined {
  if (at === undefined) return undefined;
  const parsed = new Date(at);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** the day alone for the default end-of-day instant, the time as well when one was picked */
export function formatCheckpoint(date: Date): string {
  return isEqual(date, endOfDay(date)) ? format(date, "yyyy/MM/dd") : formatTimestamp(date);
}
