import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ProgressRender from "@/components/profile/progress/progress-render";
import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/@{$nickname}/progress")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    return { profile };
  },
  head: async ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData
      ? generateMetadata({
          title: content.profile_progress({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }).value,
        })
      : {};
  },
  component: ProfileProgressPage,
  ssr: false,
});

function ProfileProgressPage() {
  return <ProgressRender />;
}
