import { createFileRoute } from "@tanstack/react-router";
import ProfileTradesRender from "@/components/profile/trades/profile-trades";
import { seo } from "@/lib/seo";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/(profile)/@{$nickname}/trades")({
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
          title: `${parseNickname(loaderData.profile.address, loaderData.profile.nickname)}'s trades`,
        })
      : undefined,
  }),
});

function RouteComponent() {
  return <ProfileTradesRender />;
}
