import { ofetch } from "ofetch";
import type { ValidArtist } from "@/lib/universal/cosmo/common";
import type { OwnedObjekt, OwnedObjektsCursor, OwnedObjektsResult } from "@/lib/universal/objekts";
import { getBaseURL } from "@/lib/utils";

export async function fetchOwnedObjektsByCursor(
  address: string,
  artistIds: ValidArtist[],
  cursor?: OwnedObjektsCursor,
) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());
  const result = await ofetch<OwnedObjektsResult>(url.toString(), {
    query: {
      artist: artistIds,
      cursor: cursor ? JSON.stringify(cursor) : undefined,
    },
  });
  return result;
}

export async function fetchOwnedObjekts(address: string, artistIds: ValidArtist[]) {
  let allObjekts: OwnedObjekt[] = [];
  let cursor: OwnedObjektsCursor | undefined;

  // Loop until there are no more pages
  while (true) {
    const result = await fetchOwnedObjektsByCursor(address, artistIds, cursor);

    allObjekts = [...allObjekts, ...result.objekts];

    if (result.nextCursor) {
      cursor = result.nextCursor;
    } else {
      break;
    }
  }

  return {
    objekts: allObjekts,
  };
}
