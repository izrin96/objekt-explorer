import { env } from "@/env";

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
  return nickname ?? `${address.substring(0, 8)}...`;
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

export function msToCountdown(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const mimeTypes = {
  // Images
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  bmp: "image/bmp",
  svg: "image/svg+xml",

  // Videos
  mp4: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  mov: "video/quicktime",
  avi: "video/x-msvideo",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
} as const;

export function getEditionStr(edition: number) {
  return edition === 1 ? "1st" : edition === 2 ? "2nd" : edition === 3 ? "3rd" : "";
}
