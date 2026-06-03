import { ofetch } from "ofetch";

import type { OwnedObjektsResult } from "@/lib/universal/objekt";

import type { OwnedBySchema } from "./universal/owned-by";

export async function fetchOwnedObjektsByCursor(
  address: string,
  cursor?: OwnedObjektsResult["nextCursor"],
  filters?: OwnedBySchema,
) {
  const result = await ofetch<OwnedObjektsResult>(`/api/objekts/owned-by/${address}`, {
    query: {
      cursor: cursor ? JSON.stringify(cursor) : undefined,
      ...filters,
    },
  });
  return result;
}
