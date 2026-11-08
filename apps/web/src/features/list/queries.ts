import type { Outputs } from "@repo/api";
import type { ValidArtist } from "@repo/cosmo/types/common";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import type * as z from "zod";

import { type CompareSearch, isComparing } from "@/features/compare/search-schema";
import { mapObjektWithTag } from "@/features/objekt/objekt-utils";
import type { listBySlugInputSchema } from "@/lib/functions/list";
import { getListBySlug } from "@/lib/functions/list";
import { orpc } from "@/lib/orpc";
import { preloadedGet } from "@/lib/preloaded-get";

import { listEntriesUrl } from "./list-entries-url";

/** the prefix every list read shares, so one edit invalidates both of a list's addresses */
export const LIST_QUERY_KEY = ["list"] as const;

export const listBySlugQuery = (data: z.infer<typeof listBySlugInputSchema>) =>
  queryOptions({
    queryKey: [...LIST_QUERY_KEY, data],
    queryFn: () => getListBySlug({ data }),
    // long enough that hydration does not refetch what the server just rendered;
    // the viewer's own edits invalidate it, so only a change made elsewhere waits
    staleTime: 30_000,
  });

export const listEntriesOptions = (slug: string, artist: ValidArtist[]) =>
  orpc.list.listEntries.queryOptions({
    input: { slug, artist },
    // the list routes preload this URL
    queryFn: ({ signal }) =>
      preloadedGet<Outputs["list"]["listEntries"]>(listEntriesUrl(slug, artist), signal),
    // search and the edition facet read fields the endpoint does not carry
    select: (data) => data.map(mapObjektWithTag),
    staleTime: 0,
  });

/**
 * The list routes' `<link rel="preload">` for the entries `ListView` asks for, so they download
 * beside the scripts instead of after hydration. Only the first document carries it (a link added
 * on a client navigation is fetched again beside the query), and not in Compare, which reads no
 * entries.
 */
export function listEntriesPreload(queryClient: QueryClient, slug: string, search: CompareSearch) {
  if (!import.meta.env.SSR || isComparing(search)) return [];
  const artist = queryClient.getQueryData(orpc.config.getSelectedArtists.queryKey());
  if (!artist) return [];
  return [
    {
      rel: "preload",
      as: "fetch",
      href: listEntriesUrl(slug, artist),
      crossOrigin: "anonymous" as const,
    },
  ];
}

export const listFindOptions = (slug: string, enabled: boolean) =>
  orpc.list.find.queryOptions({ input: { slug }, staleTime: 0, enabled });

export const profileListsOptions = (address: string) =>
  orpc.list.profileLists.queryOptions({ input: { address } });

export const listPreviewsOptions = (slugs: string[]) =>
  orpc.list.listPreviews.queryOptions({
    input: { slugs },
    // as with `listBySlugQuery`: hydration keeps the server's read, and the viewer's edits invalidate it
    staleTime: 30_000,
    select: (data) => new Map(data.map((preview) => [preview.slug, preview])),
  });
