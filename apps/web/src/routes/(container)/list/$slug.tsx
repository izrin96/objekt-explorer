import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { compareSearchSchema, isComparing } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { listDetailHead } from "@/features/list/list-head";
import { ListHeader, ListPageSkeleton } from "@/features/list/list-header";
import { ListNotFound } from "@/features/list/list-not-found";
import { ListProvider } from "@/features/list/list-provider";
import { startListReads } from "@/features/list/list-route";
import { ListView } from "@/features/list/list-view";
import { listBySlugQuery } from "@/features/list/queries";
import { nicknameParam } from "@/lib/address";

export const Route = createFileRoute("/(container)/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  loaderDeps: ({ search }) => ({ comparing: isComparing(search) }),
  // a loader, not `beforeLoad`, which reruns on every filter change
  loader: async ({ params, deps, cause, context: { queryClient } }) => {
    const read = queryClient.query({
      ...listBySlugQuery({ slug: params.slug }),
      staleTime: "static",
    });
    // the URL carries the list's own slug, so the entries start beside the list
    startListReads(queryClient, {
      list: read,
      slug: params.slug,
      cause,
      comparing: deps.comparing,
    });
    const list = await read;

    // a list filed under a Cosmo lives at the profile-scoped address
    if (list.profileAddress && list.profileSlug) {
      if (!list.profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: nicknameParam(list.profile.address, list.profile.nickname),
          slug: list.profileSlug,
        },
      });
    }

    return { list };
  },
  head: listDetailHead,
  component: ListDetailPage,
  notFoundComponent: ListNotFound,
  pendingComponent: ListPageSkeleton,
});

function ListDetailPage() {
  const { slug } = Route.useParams();
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug }));

  return (
    <ListProvider list={list}>
      <ListHeader />
      {/* remounted per list, so the drawer and the selection never leak across slugs */}
      <ListView key={list.slug} />
    </ListProvider>
  );
}
