import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { compareSearchSchema } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { ListHeader } from "@/features/list/list-header";
import { ListProvider } from "@/features/list/list-provider";
import { ListView } from "@/features/list/list-view";
import { listBySlugQuery, listProfileQuery } from "@/features/list/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

import { ListNotFound } from "../list/$slug";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(listProfileQuery(params.nickname));
    const list = await queryClient.ensureQueryData(
      listBySlugQuery({ slug: params.slug, address: profile.address }),
    );
    return { list };
  },
  head: ({ loaderData }) =>
    loaderData ? generateMetadata({ title: m.page_titles_list_detail(loaderData.list) }) : {},
  component: ProfileListDetailPage,
  notFoundComponent: ListNotFound,
});

function ProfileListDetailPage() {
  const { nickname, slug } = Route.useParams();
  const { data: profile } = useSuspenseQuery(listProfileQuery(nickname));
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug, address: profile.address }));

  return (
    <ListProvider list={list}>
      <ListHeader />
      <ListView key={list.slug} />
    </ListProvider>
  );
}
