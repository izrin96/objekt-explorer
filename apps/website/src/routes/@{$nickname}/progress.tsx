import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { generateMetadata } from "@/lib/meta";
import { profileQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";
import { m } from "@/paraglide/messages";

const ProgressRender = lazy(() => import("@/components/profile/progress/progress-render"));

export const Route = createFileRoute("/@{$nickname}/progress")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    return { profile };
  },
  head: async ({ loaderData }) => {
    return loaderData
      ? generateMetadata({
          title: m.page_titles_profile_progress({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }),
        })
      : {};
  },
  component: ProfileProgressPage,
});

function ProfileProgressPage() {
  return (
    <Suspense>
      <ProgressRender />
    </Suspense>
  );
}
