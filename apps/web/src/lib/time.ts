import { format, formatDistanceToNowStrict } from "date-fns";

const MONTH_MS = 30 * 86_400_000;

/** A distance while the event is recent, a plain date once "11 months ago" stops answering. */
export function relativeTime(date: Date): string {
  return Date.now() - date.getTime() < MONTH_MS
    ? `${formatDistanceToNowStrict(date)} ago`
    : format(date, "yyyy/MM/dd");
}

export function absoluteTime(date: Date): string {
  return format(date, "d MMM yyyy, HH:mm");
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
