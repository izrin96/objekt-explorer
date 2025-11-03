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

export async function setSelectedArtists(artists: ValidArtist[]) {
  const cookie = await cookies();
  await cookie.set("artists", JSON.stringify(artists), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
}
