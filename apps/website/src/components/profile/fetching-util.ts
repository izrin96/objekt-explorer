import type { ValidArtist } from "@repo/cosmo/types/common";
import type { OwnedObjekt, OwnedObjektsResult } from "@repo/lib/types/objekt";
import { ofetch } from "ofetch";

import { getBaseURL } from "@/lib/utils";

export async function fetchOwnedObjektsByCursor(
  address: string,
  artistIds: ValidArtist[],
  cursor?: OwnedObjektsResult["nextCursor"],
  at?: string,
) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());
  const result = await ofetch<OwnedObjektsResult>(url.toString(), {
    query: {
      artist: artistIds,
      cursor: cursor ? JSON.stringify(cursor) : undefined,
      at,
    },
  });
  return result;
}

export async function fetchOwnedObjekts(address: string, artistIds: ValidArtist[]) {
  const allObjekts: OwnedObjekt[] = [];
  let cursor: OwnedObjektsResult["nextCursor"];

  // Loop until there are no more pages
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    const result = await fetchOwnedObjektsByCursor(address, artistIds, cursor);

    allObjekts.push(...result.objekts);

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
