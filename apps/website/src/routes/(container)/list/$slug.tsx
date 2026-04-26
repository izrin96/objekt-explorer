import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { getListBySlug } from "@/lib/functions/list";

export const Route = createFileRoute("/(container)/list/$slug")({
  loader: async ({ params }) => {
    const list = await getListBySlug({ data: { slug: params.slug, redirect: true } });
    return { list };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.list?.name ?? "List"} · Objekt Tracker` }],
  }),
  component: ListDetailPage,
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
