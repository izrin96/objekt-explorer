import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { generateMetadata } from "@/lib/meta";
import { listBySlugQuery } from "@/lib/queries/list";
import { profileQuery } from "@/lib/queries/profile";

export const Route = createFileRoute("/(container)/list/$slug")({
  loader: async ({ params, context: { queryClient } }) => {
    const list = await queryClient.ensureQueryData(listBySlugQuery({ slug: params.slug }));

    if (list.profileAddress && list.profileSlug) {
      const profile = await queryClient.ensureQueryData(
        profileQuery({ nickname: list.profileAddress }),
      );
      if (!profile) throw notFound();
      throw redirect({
        to: "/@{$nickname}/list/$slug",
        params: {
          nickname: profile.nickname || profile.address,
          slug: list.profileSlug,
        },
      });
    }

    return { list };
  },
  head: ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData
      ? generateMetadata({ title: content.list_detail({ name: loaderData.list.name }).value })
      : {};
  },
  component: ListDetailPage,
  ssr: false,
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
