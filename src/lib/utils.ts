import { env } from "@/env";
import type { Selection } from "react-aria-components";

export const GRID_COLUMNS = 7;
export const GRID_COLUMNS_TABLET = 5;
export const GRID_COLUMNS_MOBILE = 3;

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

export function getBaseURL() {
  if (env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}

export function replaceUrlSize(url: string, size: "2x" | "thumbnail" = "2x") {
  return url.replace(/(4x|3x|original)$/i, size);
}

export function parseSelected<T>(keys: Selection, multiple?: false): T | null;
export function parseSelected<T>(keys: Selection, multiple: true): T[] | null;
export function parseSelected<T>(keys: Selection, multiple = false) {
  const result = [...keys] as T[];
  if (result.length === 0) return null;
  return multiple ? result : result[0];
}
