import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { generateMetadata } from "@/lib/meta";
import { listBySlugQuery } from "@/lib/queries/list";
import { profileQuery } from "@/lib/queries/profile";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/list/$slug")({
  beforeLoad: async ({ params, context: { queryClient } }) => {
    const list = await queryClient.ensureQueryData(listBySlugQuery({ slug: params.slug }));

    if (list.profileAddress && list.profileSlug) {
      const profile = await queryClient.ensureQueryData(
        profileQuery({ nickname: list.profileAddress }),
      );
      if (!profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: profile.nickname || profile.address.toLowerCase(),
          slug: list.profileSlug,
        },
      });
    }

    return { list };
  },
  loader: async ({ context: { list } }) => {
    return { list };
  },
  head: ({ loaderData }) => {
    return loaderData
      ? generateMetadata({ title: m.page_titles_list_detail({ name: loaderData.list.name }) })
      : {};
  },
  component: ListDetailPage,
});

function ListDetailPage() {
  const params = Route.useParams();
  const { data: list } = useSuspenseQuery(listBySlugQuery({ slug: params.slug }));

  return (
    <ListProvider list={list}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ListProvider>
  );
}
