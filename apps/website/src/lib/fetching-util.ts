import type { OwnedObjektsResult } from "@repo/api/schemas/objekt";
import type { OwnedBySchema } from "@repo/api/schemas/owned-by";
import { ofetch } from "ofetch";

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
