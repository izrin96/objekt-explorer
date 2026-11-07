/**
 * Member avatars and artist logos, mirrored from Cosmo into our bucket as small WebPs. The worker
 * writes the Redis hash (Cosmo URL to bucket URL); the API swaps the URLs when it refreshes the
 * artist list, and an image the worker has not mirrored yet keeps its Cosmo URL.
 */
export const ARTIST_IMAGES_KEY = "artist-images";

/** The API's `getStaleCache` key for the artist list, which the worker reads its images from. */
export const ARTISTS_CACHE_KEY = "artists";

type ArtistImages = {
  logoImageUrl: string;
  artistMembers: { profileImageUrl: string }[];
};

/**
 * Every Cosmo image the list shows, once each. The stored list may already show a copy, so a URL
 * found in `mirrored`'s values is read back as its source; one under `bucketPrefix` with no source
 * there (the hash was lost) is left out, so the bucket is never mirrored into itself.
 */
export function artistImageSources(
  artists: ArtistImages[],
  mirrored: Record<string, string>,
  bucketPrefix: string,
) {
  const sourceOf = new Map(Object.entries(mirrored).map(([source, copy]) => [copy, source]));
  const sources = new Set<string>();
  const add = (url: string) => sources.add(sourceOf.get(url) ?? url);
  for (const artist of artists) {
    add(artist.logoImageUrl);
    for (const member of artist.artistMembers) add(member.profileImageUrl);
  }
  return [...sources].filter((url) => url !== "" && !url.startsWith(bucketPrefix));
}

/** The list with every mirrored image pointing at its copy. */
export function withMirroredImages<T extends ArtistImages>(
  artists: T[],
  mirrored: Record<string, string>,
): T[] {
  return artists.map((artist) => ({
    ...artist,
    logoImageUrl: mirrored[artist.logoImageUrl] ?? artist.logoImageUrl,
    artistMembers: artist.artistMembers.map((member) => ({
      ...member,
      profileImageUrl: mirrored[member.profileImageUrl] ?? member.profileImageUrl,
    })),
  }));
}
