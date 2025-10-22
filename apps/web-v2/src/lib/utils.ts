export const GRID_COLUMNS = 7;
export const GRID_COLUMNS_TABLET = 5;
export const GRID_COLUMNS_MOBILE = 3;

export const OBJEKT_SIZE = {
  height: 1673,
  width: 1083,
};

export const AGW_APP_ID = "cm04asygd041fmry9zmcyn5o5";
export const validColumns = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

export const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
export const SPIN_ADDRESS = "0xd3d5f29881ad87bb10c1100e2c709c9596de345f";

export const OBJEKT_CONTRACT = "0x99bb83ae9bb0c0a6be865cacf67760947f91cb70";

export function getEdition(collectionNo: string) {
  const collection = parseInt(collectionNo);

  if (collection >= 101 && collection <= 108) {
    return "1st";
  }
  if (collection >= 109 && collection <= 116) {
    return "2nd";
  }
  if (collection >= 117 && collection <= 120) {
    return "3rd";
  }
  return null;
}

export function parseNickname(address: string, nickname?: string | null) {
  return nickname ?? `${address.substring(0, 8)}...`;
}

export function getBaseURL() {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL ?? "http://localhost:3001";
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

export function cacheHeaders(cdn = 10) {
  return {
    "Cache-Control": `public, max-age=0`,
    "CDN-Cache-Control": `public, s-maxage=${cdn}, stale-while-revalidate=30`,
  };
}

export const simulateDelay = () => new Promise((resolve) => setTimeout(resolve, 5000));
