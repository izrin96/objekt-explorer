import type { ValidArtist } from "@repo/cosmo/types/common";
import { getCookie } from "@tanstack/react-start/server";

export function parseSelectedArtists() {
  const value = getCookie("artists");
  if (!value) return [];

  try {
    return JSON.parse(decodeURIComponent(value)) as ValidArtist[];
  } catch {
    return [];
  }
}
