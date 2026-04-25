import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";

export const Route = createFileRoute("/@$nickname/list/$slug")({
  loader: async ({ params, context: { orpc } }) => {
    // todo: move to serverFn
    const profile = await orpc.profile.get.call(params.nickname);
    const list = await orpc.list.get.call({ slug: params.slug });
    return { profile, list };
  },
  head: () => ({
    meta: [{ title: "List · Objekt Tracker" }],
  }),
  component: ProfileListDetailPage,
});

function ProfileListDetailPage() {
  const { profile, list } = Route.useLoaderData();

  return (
    <ProfileProvider targetList={list} targetProfile={profile}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <ListRender />
      </div>
    </ProfileProvider>
  );
}
