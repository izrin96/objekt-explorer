import type { PostType } from "@repo/api/schemas/trade";
import type { ValidArtist } from "@repo/cosmo/types/common";
import * as z from "zod";

/** `all` is the absence of `type` */
export const browseSearchSchema = z.object({
  type: z.enum(["wtt", "wtb", "wts"]).optional().catch(undefined),
  slug: z.string().min(1).optional().catch(undefined),
  /** Only matches; the server ignores it for a viewer with no list on Trade */
  matches: z
    .preprocess((value) => (value === "1" ? 1 : value), z.literal(1))
    .optional()
    .catch(undefined),
});

export type BrowseSearch = z.infer<typeof browseSearchSchema>;

/** One function for the loader and the view, so both build the same query key. */
export function toBrowseInput(search: BrowseSearch, selectedArtistIds: readonly ValidArtist[]) {
  const type: PostType = search.type ?? "all";
  return {
    type,
    slug: search.slug,
    matches: search.matches === 1 ? true : undefined,
    // scoped to the selected artists as Activity is; the drawer counts a collection's posts
    // across every artist, so its link must too
    artist: search.slug ? [] : [...selectedArtistIds],
  };
}

export type BrowseInput = ReturnType<typeof toBrowseInput>;
