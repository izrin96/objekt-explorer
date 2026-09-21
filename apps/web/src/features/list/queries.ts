import { queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import type { listBySlugInputSchema } from "@/lib/functions/list";
import { getListBySlug, getListProfile } from "@/lib/functions/list";
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

export const listProfileQuery = (nickname: string) =>
  queryOptions({
    queryKey: ["profile", nickname],
    queryFn: () => getListProfile({ data: { nickname } }),
    staleTime: 0,
  });

export const listEntriesOptions = (slug: string) =>
  orpc.list.listEntries.queryOptions({ input: { slug }, staleTime: 0 });

export const listFindOptions = (slug: string, enabled: boolean) =>
  orpc.list.find.queryOptions({ input: { slug }, staleTime: 0, enabled });

export const profileListsOptions = (profileAddress: string) =>
  orpc.list.profileLists.queryOptions({ input: { profileAddress } });
