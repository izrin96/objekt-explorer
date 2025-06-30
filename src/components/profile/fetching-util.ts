import { ofetch } from "ofetch";
import type { OwnedObjekt } from "@/lib/universal/objekts";
import { getBaseURL } from "@/lib/utils";

type OwnedObjektsResult = {
  nextCursor?: {
    receivedAt: string;
    id: number;
  };
  objekts: OwnedObjekt[];
};

export async function fetchOwnedObjektsByCursor(
  address: string,
  cursor?: { receivedAt: string; id: number },
) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());
  const result = await ofetch<OwnedObjektsResult>(url.toString(), {
    query: cursor
      ? {
          cursor: JSON.stringify(cursor),
        }
      : undefined,
  });
  return result;
}

export async function fetchOwnedObjekts(address: string) {
  let allObjekts: OwnedObjekt[] = [];
  let cursor: { receivedAt: string; id: number } | undefined;

  // Loop until there are no more pages
  while (true) {
    const result = await fetchOwnedObjektsByCursor(address, cursor);

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
