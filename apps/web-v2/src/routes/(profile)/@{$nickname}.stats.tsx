import { createFileRoute } from "@tanstack/react-router";
import ProfileStatsRender from "@/components/profile/stats/stats-render";
import { seo } from "@/lib/seo";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/(profile)/@{$nickname}/stats")({
  component: RouteComponent,
  loader: async ({ context, params: { nickname } }) => {
    const profile = await context.queryClient.ensureQueryData(
      context.orpc.profile.findPublic.queryOptions({ input: { nickname } }),
    );
    return { profile };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${parseNickname(loaderData.profile.address, loaderData.profile.nickname)}'s stats`,
        })
      : undefined,
  }),
});

function RouteComponent() {
  return <ProfileStatsRender />;
}
