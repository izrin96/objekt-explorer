import { format, formatDistanceToNowStrict } from "date-fns";

/**
 * The two ways the app writes a moment, in one place.
 *
 * `relativeTime` is the rule the objekt drawer's timeline had privately: a
 * recent event reads as a distance ("4 days ago"), an old one as a plain date,
 * because "11 months ago" answers less than `2025/10/14` does. 30 days is the
 * boundary the drawer already used.
 *
 * `absoluteTime` is the same moment spelled out, in the viewer's own timezone
 * — never rendered on its own, only as what a relative string resolves to on
 * hover (`components/shared/time-ago.tsx`).
 *
 * `formatDuration` is the third: an elapsed span, not a moment — the live
 * stream clock.
 */

const MONTH_MS = 30 * 86_400_000;

export function relativeTime(date: Date): string {
  return Date.now() - date.getTime() < MONTH_MS
    ? `${formatDistanceToNowStrict(date)} ago`
    : format(date, "yyyy/MM/dd");
}

export function absoluteTime(date: Date): string {
  return format(date, "d MMM yyyy, HH:mm");
}

/**
 * `formatDuration` from `live/custom-player.tsx`: seconds as `mm:ss`, growing
 * to `h:mm:ss` and `d h:mm:ss` only once there is a whole hour or day to show.
 *
 * The app's copy divides the same seconds by 86400 *and* by 3600 without
 * taking the remainder, so an 80-minute stream reads `1:20:00` (right) but a
 * 25-hour one reads `1 25:00:00` — the hours are never reduced by the days it
 * just printed. Fixed here; worth fixing there.
 */
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
