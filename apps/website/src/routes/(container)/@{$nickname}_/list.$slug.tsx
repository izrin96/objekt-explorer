import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import ListNotFoundComponent from "@/components/router/list-notfound";
import { ListProvider } from "@/hooks/use-list-target";
import { generateMetadata } from "@/lib/meta";
import { listBySlugQuery } from "@/lib/queries/list";
import { profileQuery } from "@/lib/queries/profile";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    const list = await queryClient.ensureQueryData(
      listBySlugQuery({ slug: params.slug, profileAddress: profile.address }),
    );
    return { list };
  },
  head: async ({ loaderData }) => {
    return loaderData
      ? generateMetadata({
          title: m.page_titles_list_detail({ name: loaderData.list.name }),
        })
      : {};
  },
  component: ProfileListDetailPage,
  notFoundComponent: ListNotFoundComponent,
});

function ProfileListDetailPage() {
  const params = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname: params.nickname }));
  const { data: list } = useSuspenseQuery(
    listBySlugQuery({ slug: params.slug, profileAddress: profile.address }),
  );

  return (
    <ListProvider list={list}>
      <div className="flex flex-col gap-4 pt-4 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ListProvider>
  );
}
