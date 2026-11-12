import { noop, type QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

import { listBySlugQuery, listEntriesOptions, profileListEntries } from "./queries";
import { listRulesOptions } from "./rules/queries";

type ListRead = Promise<{ slug: string; listType: string }>;

/**
 * Starts the reads a list page renders from inside its loader, so they download beside the list
 * instead of after the render. The browser only: on the server the entries would stream into the
 * HTML (11 MB for a 12k list), and a want list's rules would reach the browser before hydration
 * and draw a strip the server's HTML left out (#418). Never on a hover preload, which would
 * download them for a link only pointed at.
 *
 * `slug` is the list's own slug when the URL carries it. A profile-scoped address names the list
 * by its profile slug: `scoped` asks for the entries by that address beside the list, and they
 * are filed under the list's own slug once `list` gives it.
 */
export function startListReads(
  queryClient: QueryClient,
  {
    list,
    slug,
    scoped,
    cause,
    comparing,
  }: {
    list: ListRead;
    slug?: string;
    scoped?: Promise<{ slug: string; address: string }>;
    cause: "preload" | "enter" | "stay";
    comparing: boolean;
  },
) {
  if (import.meta.env.SSR || cause === "preload") return;

  // Compare reads no entries
  if (!comparing) {
    const artists = queryClient.query({
      ...orpc.config.getSelectedArtists.queryOptions(),
      staleTime: "static",
    });
    // a list already in the cache gives its slug at once, and its entries may be cached under it
    const early = scoped
      ? Promise.all([artists, scoped])
          .then(([artist, at]) =>
            queryClient.getQueryData(listBySlugQuery(at).queryKey)
              ? null
              : profileListEntries(at.slug, at.address, artist),
          )
          .catch(() => null)
      : null;
    void Promise.all([artists, slug ?? list.then((read) => read.slug)])
      .then(([artist, entriesSlug]) => {
        const options = listEntriesOptions(entriesSlug, artist);
        let first = early;
        return queryClient.query({
          ...options,
          // only this fetch takes the early read: a refetch asks again
          queryFn: async (context) => {
            const entries = await first;
            first = null;
            return entries ?? options.queryFn!(context);
          },
          staleTime: "static",
        });
      })
      .catch(noop);
  }

  void list
    .then((read) =>
      read.listType === "want" ? queryClient.query(listRulesOptions(read.slug)) : null,
    )
    .catch(noop);
}
