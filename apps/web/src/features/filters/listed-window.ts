export const LISTED_WINDOWS = ["24h", "7d", "30d"] as const;

export type ListedWindow = (typeof LISTED_WINDOWS)[number];

export const LISTED_WINDOW_SECONDS: Record<ListedWindow, number> = {
  "24h": 86_400,
  "7d": 604_800,
  "30d": 2_592_000,
};

/** `listedAt` is the newest live listing's time in unix seconds; the window is inclusive at its start */
export function isListedWithin(listedAt: number, listed: ListedWindow, nowSec: number): boolean {
  return listedAt >= nowSec - LISTED_WINDOW_SECONDS[listed];
}
