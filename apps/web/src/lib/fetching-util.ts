import type { OwnedObjektsResult } from "@repo/lib/types/objekt";
import { ofetch } from "ofetch";

import type { ServerFilters } from "@/lib/query-options";
import { getBaseURL } from "@/lib/utils";

export async function fetchOwnedObjektsByCursor(
  address: string,
  cursor?: OwnedObjektsResult["nextCursor"],
  filters?: ServerFilters,
) {
  const url = new URL(`/api/objekts/owned-by/${address}`, getBaseURL());
  const result = await ofetch<OwnedObjektsResult>(url.toString(), {
    query: {
      cursor: cursor ? JSON.stringify(cursor) : undefined,
      ...filters,
    },
  });
  return result;
}
