import { createFileRoute } from "@tanstack/react-router";

import { browseSearchSchema, toBrowseInput } from "@/features/trade/browse-search";
import { BrowseView } from "@/features/trade/browse-view";
import { browseOptions } from "@/features/trade/queries";
import { generateMetadata } from "@/lib/meta";
import { orpc } from "@/lib/orpc";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/")({
  validateSearch: browseSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context: { queryClient }, deps, cause }) => {
    const [artists, selected] = await Promise.all([
      queryClient.query({ ...orpc.config.getArtists.queryOptions(), staleTime: "static" }),
      queryClient.query({ ...orpc.config.getSelectedArtists.queryOptions(), staleTime: "static" }),
    ]);
    const options = browseOptions(toBrowseInput(deps, artists, selected));
    // a filter change keeps the current posts on screen while the next ones load
    if (cause === "stay") {
      void queryClient.infiniteQuery(options).catch(() => undefined);
      return;
    }
    // a failed read leaves the view to show its error and retry, not the page to fail
    await queryClient.infiniteQuery({ ...options, staleTime: "static" }).catch(() => undefined);
  },
  head: () => generateMetadata({ title: m.page_titles_trade() }),
  component: BrowsePage,
});

function BrowsePage() {
  const search = Route.useSearch();
  return <BrowseView search={search} />;
}
