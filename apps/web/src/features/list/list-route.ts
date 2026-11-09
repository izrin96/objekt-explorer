import { noop, type QueryClient } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

import { listEntriesOptions } from "./queries";
import { listRulesOptions } from "./rules/queries";

type ListRead = Promise<{ slug: string; listType: string }>;

/**
 * Starts the reads a list page renders from inside its loader, so they download beside the list
 * instead of after the render. The browser only: on the server the entries would stream into the
 * HTML (11 MB for a 12k list), and a want list's rules would reach the browser before hydration
 * and draw a strip the server's HTML left out (#418). Never on a hover preload, which would
 * download them for a link only pointed at.
 *
 * `slug` is the list's own slug when the URL carries it; a profile-scoped address names the list
 * by its profile slug, so its entries wait for `list`.
 */
export function startListReads(
  queryClient: QueryClient,
  {
    list,
    slug,
    cause,
    comparing,
  }: {
    list: ListRead;
    slug?: string;
    cause: "preload" | "enter" | "stay";
    comparing: boolean;
  },
) {
  if (import.meta.env.SSR || cause === "preload") return;

  // Compare reads no entries
  if (!comparing) {
    void Promise.all([
      queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
      slug ?? list.then((read) => read.slug),
    ])
      .then(([artist, entriesSlug]) =>
        queryClient.query({ ...listEntriesOptions(entriesSlug, artist), staleTime: "static" }),
      )
      .catch(noop);
  }

  void list
    .then((read) =>
      read.listType === "want" ? queryClient.query(listRulesOptions(read.slug)) : null,
    )
    .catch(noop);
}
