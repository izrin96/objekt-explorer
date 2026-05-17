import { createFileRoute } from "@tanstack/react-router";

import ProfileStatsRender from "@/components/profile/stats/stats-render";
import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

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
  return <ProfileStatsRender />;
}
