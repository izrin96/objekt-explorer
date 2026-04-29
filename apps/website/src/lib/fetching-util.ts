import type { OwnedObjektsResult } from "@repo/lib/types/objekt";
import { ofetch } from "ofetch";

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
