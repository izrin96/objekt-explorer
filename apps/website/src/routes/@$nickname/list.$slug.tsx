import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { getListBySlug } from "@/lib/server/functions/list.server";
import { getProfileByNickname } from "@/lib/server/functions/profile.server";

export const Route = createFileRoute("/@$nickname/list/$slug")({
  loader: async ({ params }) => {
    const [profile, list] = await Promise.all([
      getProfileByNickname({ data: { nickname: params.nickname } }),
      getListBySlug({ data: { slug: params.slug } }),
    ]);
    return { profile, list };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.list?.name ?? "List"} · Objekt Tracker` }],
  }),
  component: ProfileListDetailPage,
});

function ProfileListDetailPage() {
  const { profile, list } = Route.useLoaderData();

  return (
    <ProfileProvider profile={profile}>
      <ListProvider list={list}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </ListProvider>
    </ProfileProvider>
  );
}
