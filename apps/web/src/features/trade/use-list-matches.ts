import type { PublicList } from "@repo/api/schemas/list";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { SideNear } from "@/features/trade/near";
import { listMatchesOptions } from "@/features/trade/queries";

/** The collections the grid keeps while the toggle is on; the request waits for it. */
export function useListMatches(list: PublicList, on: boolean) {
  const { data, isPending, error } = useQuery(listMatchesOptions(list.id, on));
  const slugs = useMemo(() => (on && data ? new Set(data.slugs) : null), [on, data]);
  const near = useMemo(
    () =>
      on && data?.near
        ? {
            slugs: new Set(data.near.slugs),
            listIdsOf: data.near.listIdsOf,
            side: {
              verb: data.near.verb,
              count: data.near.slugs.length,
              listIds: data.near.listIds,
            } satisfies SideNear,
          }
        : null,
    [on, data],
  );
  return {
    slugs,
    near,
    listIds: on ? (data?.listIds ?? []) : [],
    pending: on && isPending,
    error: on ? error : null,
  };
}
