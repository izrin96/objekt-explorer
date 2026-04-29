import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ProfileStatsRender from "@/components/profile/stats/stats-render";
import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/@{$nickname}/stats")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    return { profile };
  },
  head: async ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData
      ? generateMetadata({
          title: content.profile_stats({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }).value,
        })
      : {};
  },
  component: ProfileStatsPage,
  ssr: false,
});

function ProfileStatsPage() {
  return <ProfileStatsRender />;
}
