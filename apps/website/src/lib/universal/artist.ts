import { validArtists } from "@repo/cosmo/types/common";
import * as z from "zod";

export function toCanonicalArtist(value: string) {
  const lower = value.toLowerCase();
  return Object.values(validArtists).find((v) => v.toLowerCase() === lower) ?? lower;
}

/** Case-insensitive single artist enum. */
export const artistSchema = z.string().transform(toCanonicalArtist).pipe(z.enum(validArtists));

/** Case-insensitive artist array enum. */
export const artistsArraySchema = z
  .array(z.string())
  .transform((arr) => arr.map(toCanonicalArtist))
  .pipe(z.array(z.enum(validArtists)));
