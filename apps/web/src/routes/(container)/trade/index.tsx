import { createFileRoute } from "@tanstack/react-router";

import { browseSearchSchema, canMatchOf, toBrowseInput } from "@/features/trade/browse-search";
import { BrowsePending, BrowseView } from "@/features/trade/browse-view";
import { browseOptions, myPostsOptions } from "@/features/trade/queries";
import { currentUserOptions } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/")({
  validateSearch: browseSearchSchema,
  // the sheet is not a load: opening it must not refetch the feed or scroll it to the top
  loaderDeps: ({ search }) => ({ ...search, person: undefined }),
  loader: async ({ context: { queryClient }, deps, cause }) => {
    const [artists, selected, user] = await Promise.all([
      queryClient.query({ ...orpc.config.getArtists.queryOptions(), staleTime: "static" }),
      queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
      queryClient.query({ ...currentUserOptions, staleTime: "static" }),
    ]);
    const canMatch = canMatchOf(user?.lists ?? []);
    const options = browseOptions(toBrowseInput(deps, artists, selected, canMatch));
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
    const mine = user
      ? queryClient.query({ ...myPostsOptions(), staleTime: "static" }).catch(() => undefined)
      : undefined;
    await Promise.all([feed, mine]);
  },
  head: () => generateMetadata({ title: m.page_titles_trade() }),
  component: BrowsePage,
  pendingComponent: BrowsePending,
});

function BrowsePage() {
  const search = Route.useSearch();
  return <BrowseView search={search} />;
}
