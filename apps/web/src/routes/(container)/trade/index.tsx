import { createFileRoute, redirect } from "@tanstack/react-router";

import { loadBrowse } from "@/features/trade/browse-loader";
import { browseRedirect, browseSearchSchema } from "@/features/trade/browse-search";
import { BrowsePending, BrowseView } from "@/features/trade/browse-view";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/")({
  validateSearch: browseSearchSchema,
  // all of it, `person` too: the loader fills the key BrowseView reads
  loaderDeps: ({ search }) => search,
  // Matches and Compare with live on For you now; an old link follows them there
  beforeLoad: ({ search }) => {
    const target = browseRedirect(search);
    if (target) throw redirect({ ...target, replace: true });
  },
  loader: ({ context: { queryClient }, deps, cause }) =>
    loadBrowse({ queryClient, search: deps, cause, surface: "browse" }),
  head: () => generateMetadata({ title: m.page_titles_trade() }),
  component: BrowsePage,
  pendingComponent: BrowsePending,
});

function BrowsePage() {
  const search = Route.useSearch();
  return <BrowseView surface="browse" search={search} />;
}
