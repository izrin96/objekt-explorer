import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import type { listBySlugInputSchema } from "@/lib/functions/list";
import { getListBySlug } from "@/lib/functions/list";
import { orpc } from "@/lib/orpc";

/** the prefix every list read shares, so one edit invalidates both of a list's addresses */
export const LIST_QUERY_KEY = ["list"] as const;

export const listBySlugQuery = (data: z.infer<typeof listBySlugInputSchema>) =>
  queryOptions({
    queryKey: [...LIST_QUERY_KEY, data],
    queryFn: () => getListBySlug({ data }),
    // the header renders straight off this, so a rename shows on the next visit
    staleTime: 0,
  });

export const listEntriesOptions = (slug: string) =>
  orpc.list.listEntries.queryOptions({
    input: { slug },
    // search and the edition facet read fields the endpoint does not carry
    select: (data) => data.map(mapObjektWithTag),
    staleTime: 0,
  });

export const listFindOptions = (slug: string, enabled: boolean) =>
  orpc.list.find.queryOptions({ input: { slug }, staleTime: 0, enabled });

export const profileListsOptions = (profileAddress: string) =>
  orpc.list.profileLists.queryOptions({ input: { profileAddress } });
