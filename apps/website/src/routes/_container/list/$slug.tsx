import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getListBySlug } from "@/lib/server/functions/list.server";

export const Route = createFileRoute("/_container/list/$slug")({
  loader: async ({ params }) => {
    const list = await getListBySlug({ data: { slug: params.slug } });
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
    <ProfileProvider targetList={list}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ProfileProvider>
  );
}
