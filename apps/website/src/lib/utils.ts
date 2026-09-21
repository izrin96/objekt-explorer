import { NumberFormatter } from "@internationalized/number";
import type { PublicList } from "@repo/api/schemas/list";
import type { ValidCustomSort } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";
import { linkOptions } from "@tanstack/react-router";
import { type ClassValue, clsx } from "clsx";

import { twMerge } from "@/lib/tw-merge";
import { getLocale } from "@/paraglide/runtime";

import { clientEnv } from "./env/client";
import { unobtainableSlugs } from "./unobtainables";

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(...inputs));

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 60 * 60 * 24 * 365],
  ["month", 60 * 60 * 24 * 30],
  ["day", 60 * 60 * 24],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "$2.50" in the client locale; falls back to "2.5 XYZ" for unknown currency codes */
export function formatPrice(price: number, currency: string): string {
  try {
    return new NumberFormatter(getClientLocale(), { style: "currency", currency }).format(price);
  } catch {
    return `${price.toLocaleString()} ${currency}`;
  }
}

/** "3 days ago" in the active locale */
export function formatRelativeTime(value: string | number | Date) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const formatter = new Intl.RelativeTimeFormat(getLocale(), { numeric: "auto" });

  for (const [unit, secondsPerUnit] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= secondsPerUnit) {
      return formatter.format(Math.round(seconds / secondsPerUnit), unit);
    }
  }

  return formatter.format(Math.round(seconds), "second");
}

export const defaultSort: ValidCustomSort[] = ["date", "season", "collectionNo", "member", "rare"];
export const marketSort: ValidCustomSort[] = [
  "listedAt",
  "floor",
  "supply",
  "date",
  "season",
  "collectionNo",
  "member",
  "rare",
];
export const defaultSortDuplicate: ValidCustomSort[] = [
  "date",
  "season",
  "collectionNo",
  "member",
  "duplicate",
  "rare",
];
export const defaultSortDuplicateSerial: ValidCustomSort[] = [
  "date",
  "season",
  "collectionNo",
  "member",
  "serial",
  "duplicate",
  "rare",
];

export const THEME_COLORS = {
  light: "#FBFBFB",
  dark: "#09090B",
};

export { SITE_NAME } from "@repo/api/constants";

export const GRID_COLUMNS = 7;
export const GRID_COLUMNS_TABLET = 5;
export const GRID_COLUMNS_MOBILE = 3;

export const OBJEKT_SIZE = {
  height: 1673,
  width: 1083,
};

export const validColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export function parseNickname(address: string, nickname?: string | null) {
  if (nickname?.toLowerCase() === address.toLowerCase()) return `${address.substring(0, 8)}...`;
  return nickname || `${address.substring(0, 8)}...`;
}

export function getListLinkOption(list: PublicList) {
  if (list.profile && list.profileSlug) {
    const identifier = list.profile.nickname || list.profile.address.toLowerCase();
    return linkOptions({
      to: "/@{$nickname}/list/$slug",
      params: {
        nickname: identifier,
        slug: list.profileSlug,
      },
    });
  }

  return linkOptions({
    to: "/list/$slug",
    params: {
      slug: list.slug,
    },
  });
}

export function getBaseURL() {
  return clientEnv.VITE_SITE_URL;
}

export function getClientLocale() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "en";
  }
}

export function tradeableFilter(obj: ValidObjekt) {
  return !unobtainableSlugs.has(obj.slug) && !["Welcome", "Zero"].includes(obj.class);
}

export function msToCountdown(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getEditionStr(edition: number) {
  return edition === 1 ? "1st" : edition === 2 ? "2nd" : edition === 3 ? "3rd" : "";
}
