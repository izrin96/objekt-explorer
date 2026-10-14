import type { QueryClient } from "@tanstack/react-query";

import { currentUserOptions } from "@/features/user/queries";
import { orpc } from "@/lib/orpc";

import { type FeedSearch, type Surface, toBrowseInput } from "./browse-search";
import { browseOptions, myPostsOptions } from "./queries";

/**
 * The loader of both Trade surfaces, so the loader and `BrowseView` build the same query key.
 * Browse also loads Your posts, which sits above its feed; For you never lists them.
 */
export async function loadBrowse({
  queryClient,
  search,
  cause,
  surface,
}: {
  queryClient: QueryClient;
  search: FeedSearch;
  cause: string;
  surface: Surface;
}) {
  const [artists, selected, user] = await Promise.all([
    queryClient.query({ ...orpc.config.getArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
    queryClient.query({ ...currentUserOptions, staleTime: "static" }),
  ]);
  const options = browseOptions(toBrowseInput(search, artists, selected, surface));
  // a filter change keeps the current posts on screen while the next ones load
  if (cause === "stay") {
    void queryClient.infiniteQuery(options).catch(() => undefined);
    return;
  }
  // a failed read leaves the view to show its error and retry, not the page to fail
  const feed = queryClient
    .infiniteQuery({ ...options, staleTime: "static" })
    .catch(() => undefined);
  // Your posts sits above the feed, so it is in the first paint rather than pushing it down
  const mine =
    user && surface === "browse"
      ? queryClient.query({ ...myPostsOptions(), staleTime: "static" }).catch(() => undefined)
      : undefined;
  await Promise.all([feed, mine]);
}
