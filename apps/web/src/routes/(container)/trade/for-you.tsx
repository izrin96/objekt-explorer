import { createFileRoute, redirect } from "@tanstack/react-router";

import { loadBrowse, oldPersonTarget } from "@/features/trade/browse-loader";
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
  // all of it: the loader fills the key BrowseView reads
  loaderDeps: ({ search }) => search,
  beforeLoad: async ({ search, context, location }) => {
    // an older person link goes to the person page, which a signed-out visitor can read too, so
    // before the sign-in redirect
    const old = await oldPersonTarget(context.queryClient, search);
    if (old?.handle) {
      throw redirect({ to: "/trade/@{$handle}", params: { handle: old.handle }, replace: true });
    }
    if (old) throw redirect({ to: "/trade/for-you", search: old.rest, replace: true });
    // an older link's one-way view, mapped in place
    const normalised = forYouNormalise(search);
    if (normalised) throw redirect({ to: "/trade/for-you", search: normalised, replace: true });
    await requireSignedIn({ context, location });
    const user = await context.queryClient.query({ ...currentUserOptions, staleTime: "static" });
    if (!canMatchOf(user?.lists ?? [])) {
      throw redirect({ to: "/trade", search: forYouFallback(search), replace: true });
    }
  },
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
