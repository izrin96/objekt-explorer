import { getCookie, setCookie } from "@tanstack/react-start/server";
import type { ValidArtist } from "../universal/cosmo/common";

export async function parseSelectedArtists() {
  const value = getCookie("artists");

  if (value === undefined) return [];

  try {
    return JSON.parse(value) as ValidArtist[];
  } catch {
    return [];
  }
}

export async function setSelectedArtists(artists: ValidArtist[]) {
  setCookie("artists", JSON.stringify(artists), {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
    httpOnly: true,
    secure: true,
  });
}
