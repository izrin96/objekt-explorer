import type { OwnedObjektsResult } from "@repo/lib/types/objekt";
import { ofetch } from "ofetch";

import type { ServerFilters } from "@/lib/query-options";

export async function fetchOwnedObjektsByCursor(
  address: string,
  cursor?: OwnedObjektsResult["nextCursor"],
  filters?: ServerFilters,
) {
  const result = await ofetch<OwnedObjektsResult>(`/api/objekts/owned-by/${address}`, {
    query: {
      cursor: cursor ? JSON.stringify(cursor) : undefined,
      ...filters,
    },
  });
  return result;
}
