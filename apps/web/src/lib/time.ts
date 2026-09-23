import { format } from "date-fns";

/** The one way the app writes an instant: `26/09/23 06:36:12 PM`. */
const TIMESTAMP_FORMAT = "yy/MM/dd hh:mm:ss a";

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
