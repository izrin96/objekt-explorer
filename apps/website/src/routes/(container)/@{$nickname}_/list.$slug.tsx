import { createFileRoute } from "@tanstack/react-router";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ListProvider } from "@/hooks/use-list-target";
import { ProfileProvider } from "@/hooks/use-profile-target";
import { getListBySlug } from "@/lib/functions/list";
import { getProfileByNickname } from "@/lib/functions/profile";

export const Route = createFileRoute("/(container)/@{$nickname}_/list/$slug")({
  loader: async ({ params }) => {
    const profile = await getProfileByNickname({ data: { nickname: params.nickname } });
    const list = await getListBySlug({
      data: { slug: params.slug, profileAddress: profile.address },
    });
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
