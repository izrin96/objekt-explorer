import { createFileRoute } from "@tanstack/react-router";

import ProfileTradesRender from "@/components/profile/trades/profile-trades";
import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/trades")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    return { profile };
  },
  head: async ({ loaderData }) => {
    return loaderData
      ? generateMetadata({
          title: m.page_titles_profile_trades({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }),
        })
      : {};
  },
  component: ProfileTradesPage,
});

function ProfileTradesPage() {
  return <ProfileTradesRender />;
}
