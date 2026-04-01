import type { ValidArtist } from "@repo/cosmo/types/common";
import type { ValidObjekt } from "@repo/lib/types/objekt";

import { env } from "@/env";

import { unobtainables } from "./unobtainables";

export const classOrder: Record<ValidArtist, string[]> = {
  tripleS: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  artms: ["First", "Double", "Motion", "Unit", "Special", "Premier", "Welcome", "Zero"],
  idntt: ["Basic", "Event", "Motion", "Special", "Unit", "Welcome"],
};

const baseSeasonColors: Record<string, string> = {
  Atom: "#FFDD00",
  Binary: "#75FB4C",
  Cream: "#FF7477",
  Divine: "#B400FF",
  Ever: "#33ECFD",
  Spring: "#FFE527",
  Summer: "#619AFF",
  Autumn: "#B5315A",
  Winter: "#C6C6C6",
};

export function getSeasonColor(season: string): string {
  const base = season.replace(/\d+$/, "");
  return baseSeasonColors[base] ?? "#C6C6C6";
}

export const SITE_NAME = "Objekt Tracker";

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

export function getListHref(list: {
  listType?: "normal" | "profile";
  slug: string;
  profileSlug?: string | null;
  nickname?: string | null;
  profileAddress?: string | null;
}) {
  const isProfileContext = list.listType === "profile" || !!list.profileAddress;
  if (isProfileContext && (list.nickname || list.profileAddress)) {
    return `/@${list.nickname || list.profileAddress}/list/${list.profileSlug || list.slug}`;
  }
  return `/list/${list.slug}`;
}

export function getBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return env.NEXT_PUBLIC_SITE_URL;
}

export function replaceUrlSize(url: string, size: "4x" | "2x" | "thumbnail" | "original" = "2x") {
  return url.replace(/(4x|3x|2x|thumbnail|original)$/i, size);
}

export function tradeableFilter(obj: ValidObjekt) {
  return !unobtainables.includes(obj.slug) && !["Welcome", "Zero"].includes(obj.class);
}

export function msToCountdown(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const acceptedFileMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/x-m4v",
] as const;

export function getEditionStr(edition: number) {
  return edition === 1 ? "1st" : edition === 2 ? "2nd" : edition === 3 ? "3rd" : "";
}
