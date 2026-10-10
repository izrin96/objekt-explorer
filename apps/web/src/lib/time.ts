import { format } from "date-fns";

import { getLocale } from "@/paraglide/runtime";

/** The one way the app writes an instant: `2026/09/23 06:36:12 PM`. */
const TIMESTAMP_FORMAT = "yyyy/MM/dd hh:mm:ss a";

export function formatTimestamp(date: Date): string {
  return format(date, TIMESTAMP_FORMAT);
}

/** Elapsed seconds as `mm:ss`, growing to `h:mm:ss` and `d h:mm:ss`. */
export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;

  return `${days ? `${days} ` : ""}${days || hours ? `${hours}:` : ""}${
    minutes < 10 ? "0" : ""
  }${minutes}:${rest < 10 ? "0" : ""}${rest}`;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** `largest` caps the unit, for a wait that should read "in 23 hours", not "tomorrow" */
export function relativeTime(
  at: number,
  now: number,
  largest: Intl.RelativeTimeFormatUnit = "year",
) {
  const seconds = Math.round((at - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });
  const units = UNITS.slice(UNITS.findIndex(([unit]) => unit === largest));
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, "second");
}
