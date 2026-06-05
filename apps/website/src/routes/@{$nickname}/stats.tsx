import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const ProfileStatsRender = lazy(() => import("@/components/profile/stats/stats-render"));

export const Route = createFileRoute("/@{$nickname}/stats")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    return { profile };
  },
  head: async ({ loaderData }) => {
    return loaderData
      ? generateMetadata({
          title: m.page_titles_profile_stats({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }),
        })
      : {};
  },
  component: ProfileStatsPage,
});

function ProfileStatsPage() {
  return (
    <Suspense>
      <ProfileStatsRender />
    </Suspense>
  );
}
