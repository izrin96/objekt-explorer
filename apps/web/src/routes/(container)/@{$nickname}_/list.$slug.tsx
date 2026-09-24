import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { compareSearchSchema } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { ListHeader } from "@/features/list/list-header";
import { ListNotFound } from "@/features/list/list-not-found";
import { ListProvider } from "@/features/list/list-provider";
import { ListView } from "@/features/list/list-view";
import { listBySlugQuery } from "@/features/list/queries";
import { ProfileProvider } from "@/features/profile/profile-provider";
import { profileQuery } from "@/features/profile/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.query({
      ...profileQuery({ nickname: params.nickname }),
      staleTime: "static",
    });
    const list = await queryClient.query({
      ...listBySlugQuery({ slug: params.slug, address: profile.address }),
      staleTime: "static",
    });
    return { list };
  },
  head: ({ loaderData }) =>
    loaderData ? generateMetadata({ title: m.page_titles_list_detail(loaderData.list) }) : {},
  component: ProfileListDetailPage,
  notFoundComponent: ListNotFound,
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
