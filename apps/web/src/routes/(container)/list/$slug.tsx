import { ArrowLeftIcon, FileDashedIcon } from "@phosphor-icons/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link, createFileRoute, notFound, redirect } from "@tanstack/react-router";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { compareSearchSchema } from "@/features/compare/search-schema";
import { filterSearchSchema } from "@/features/filters/search-schema";
import { ListHeader } from "@/features/list/list-header";
import { ListProvider } from "@/features/list/list-provider";
import { ListView } from "@/features/list/list-view";
import { listBySlugQuery } from "@/features/list/queries";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/$slug")({
  validateSearch: filterSearchSchema.extend(compareSearchSchema.shape),
  beforeLoad: async ({ params, context: { queryClient } }) => {
    const list = await queryClient.fetchQuery(listBySlugQuery({ slug: params.slug }));

    // a list filed under a Cosmo lives at the profile-scoped address
    if (list.profileAddress && list.profileSlug) {
      if (!list.profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: list.profile.nickname || list.profile.address.toLowerCase(),
          slug: list.profileSlug,
        },
      });
    }

    return { list };
  },
  loader: ({ context: { list } }) => ({ list }),
  head: ({ loaderData }) =>
    loaderData ? generateMetadata({ title: m.page_titles_list_detail(loaderData.list) }) : {},
  component: ListDetailPage,
  notFoundComponent: ListNotFound,
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

export function ListNotFound() {
  return (
    <EmptyState
      icon={FileDashedIcon}
      title={m.not_found_list()}
      action={
        <Button variant="outline" size="sm" render={<Link to="/list" />}>
          <ArrowLeftIcon />
          {m.list_back_to_lists()}
        </Button>
      }
    />
  );
}
