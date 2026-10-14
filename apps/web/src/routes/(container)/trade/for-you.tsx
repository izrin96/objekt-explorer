import { createFileRoute, redirect } from "@tanstack/react-router";

import { loadBrowse } from "@/features/trade/browse-loader";
import {
  canMatchOf,
  forYouFallback,
  forYouNormalise,
  forYouSearchSchema,
} from "@/features/trade/browse-search";
import { BrowsePending, BrowseView } from "@/features/trade/browse-view";
import { currentUserOptions, requireSignedIn } from "@/features/user/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/trade/for-you")({
  validateSearch: forYouSearchSchema,
  beforeLoad: async ({ search, context, location }) => {
    // an older link's one-way view or `partner`, mapped in place before anything else
    const normalised = forYouNormalise(search);
    if (normalised) throw redirect({ to: "/trade/for-you", search: normalised, replace: true });
    await requireSignedIn({ context, location });
    const user = await context.queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!canMatchOf(user?.lists ?? [])) {
      throw redirect({ to: "/trade", search: forYouFallback(search), replace: true });
    }
  },
  // the sheet is not a load: opening it must not refetch the feed or scroll it to the top
  loaderDeps: ({ search }) => ({ ...search, person: undefined }),
  loader: ({ context: { queryClient }, deps, cause }) =>
    loadBrowse({ queryClient, search: deps, cause, surface: "forYou" }),
  head: () => generateMetadata({ title: m.page_titles_trade() }),
  component: ForYouPage,
  pendingComponent: BrowsePending,
});

function ForYouPage() {
  const search = Route.useSearch();
  return <BrowseView surface="forYou" search={search} />;
}
