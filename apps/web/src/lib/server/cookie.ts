import { cookies } from "next/headers";
import type { ValidArtist } from "../universal/cosmo/common";

export async function parseSelectedArtists() {
  const cookie = await cookies();
  const value = cookie.get("artists")?.value;

  if (value === undefined) return [];

  try {
    return JSON.parse(value) as ValidArtist[];
  } catch {
    return [];
  }
}
