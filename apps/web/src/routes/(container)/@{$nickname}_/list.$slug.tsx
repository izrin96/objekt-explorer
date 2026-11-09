import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { compareSearchSchema, isComparing } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { listDetailHead } from "@/features/list/list-head";
import { ListHeader, ListPageSkeleton } from "@/features/list/list-header";
import { ListNotFound } from "@/features/list/list-not-found";
import { ListProvider } from "@/features/list/list-provider";
import { startListReads } from "@/features/list/list-route";
import { ListView } from "@/features/list/list-view";
import { listBySlugQuery } from "@/features/list/queries";
import { ProfileProvider } from "@/features/profile/profile-provider";
import { profileQuery } from "@/features/profile/queries";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  loaderDeps: ({ search }) => ({ comparing: isComparing(search) }),
  loader: async ({ params, deps, cause, context: { queryClient } }) => {
    const read = queryClient
      .query({ ...profileQuery({ nickname: params.nickname }), staleTime: "static" })
      .then((profile) =>
        queryClient.query({
          ...listBySlugQuery({ slug: params.slug, address: profile.address }),
          staleTime: "static",
        }),
      );
    // the URL names the list by its profile slug, so the entries wait for the list
    startListReads(queryClient, { list: read, cause, comparing: deps.comparing });
    return { list: await read };
  },
  head: listDetailHead,
  component: ProfileListDetailPage,
  notFoundComponent: ListNotFound,
  pendingComponent: ListPageSkeleton,
});

function ProfileListDetailPage() {
  const { nickname, slug } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname }));
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug, address: profile.address }));

  return (
    <ProfileProvider profile={profile}>
      <ListProvider list={list}>
        <ListHeader />
        <ListView key={list.slug} />
      </ListProvider>
    </ProfileProvider>
  );
}
