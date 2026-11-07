import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { CreateListDialog } from "@/features/list/create-list-dialog";
import { EMPTY_DRAFT } from "@/features/list/list-draft";
import { loadBrowse, oldPersonTarget } from "@/features/trade/browse-loader";
import { canMatchOf, forYouNormalise, forYouSearchSchema } from "@/features/trade/browse-search";
import { BrowsePending, BrowseView } from "@/features/trade/browse-view";
import { CantMatch } from "@/features/trade/cant-match";
import { useUserLists } from "@/features/user/hooks";
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
  },
  loader: async ({ context: { queryClient }, deps, cause }) => {
    const user = await queryClient.query({ ...currentUserOptions, staleTime: "static" });
    // a viewer who can't match sees why, not a feed that is sure to be empty and spends its budget
    if (!canMatchOf(user?.lists ?? [])) return;
    await loadBrowse({ queryClient, search: deps, cause, surface: "forYou" });
  },
  head: () => generateMetadata({ title: m.page_titles_trade_for_you() }),
  component: ForYouPage,
  pendingComponent: BrowsePending,
});

function ForYouPage() {
  const search = Route.useSearch();
  // read live, so a list made or deleted here flips the page
  const canMatch = canMatchOf(useUserLists());
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <>
      {canMatch ? (
        <BrowseView surface="forYou" search={search} />
      ) : (
        <CantMatch onNewWant={() => setCreateOpen(true)} />
      )}
      <CreateListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initial={WANT_DRAFT}
        lockType
      />
    </>
  );
}

const WANT_DRAFT = { ...EMPTY_DRAFT, listType: "want" as const, isProfileBind: false };
