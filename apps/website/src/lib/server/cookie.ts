import type { ValidArtist } from "@repo/cosmo/types/common";
import { getCookie } from "@tanstack/react-start/server";

export async function parseSelectedArtists() {
  const value = getCookie("artists");

  if (value === undefined) return [];

  try {
    return JSON.parse(value) as ValidArtist[];
  } catch {
    return [];
  }
}
