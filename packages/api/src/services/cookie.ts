import { getCookie } from "@tanstack/react-start/server";

import { artistsArraySchema } from "../schemas/artist";

export async function parseSelectedArtists() {
  const value = getCookie("artists");

  if (value === undefined) return [];

  // the cookie is client-written, so JSON that parses may still not be a list of artists
  try {
    return artistsArraySchema.catch([]).parse(JSON.parse(value));
  } catch {
    return [];
  }
}
