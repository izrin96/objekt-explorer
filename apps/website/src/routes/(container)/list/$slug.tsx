import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { getListBySlug } from "@/lib/functions/list";
import { generateMetadata } from "@/lib/meta";

export const Route = createFileRoute("/(container)/list/$slug")({
  loader: async ({ params }) => {
    const list = await getListBySlug({ data: { slug: params.slug, redirect: true } });
    return { list };
  },
  head: ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData?.list
      ? generateMetadata({ title: content.list_detail({ name: loaderData.list.name }).value })
      : {};
  },
  component: ListDetailPage,
  ssr: false,
});

function ListDetailPage() {
  const { list } = Route.useLoaderData();

  return (
    <ListProvider list={list}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ListProvider>
  );
}
