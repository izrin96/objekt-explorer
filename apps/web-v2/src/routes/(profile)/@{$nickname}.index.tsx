import { createFileRoute } from "@tanstack/react-router";
import ProfileObjektRender from "@/components/profile/profile-objekt";
import { orpc } from "@/lib/orpc/client";
import { seo } from "@/lib/seo";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/(profile)/@{$nickname}/")({
  component: RouteComponent,
  loader: async ({ context, params: { nickname } }) => {
    const profile = await context.queryClient.ensureQueryData(
      context.orpc.profile.findPublic.queryOptions({ input: { nickname } }),
    );

    context.queryClient.prefetchQuery(
      orpc.pins.list.queryOptions({
        input: { address: profile.address },
      }),
    );

    context.queryClient.prefetchQuery(
      orpc.lockedObjekt.list.queryOptions({
        input: { address: profile.address },
      }),
    );

    return { profile };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? seo({
          title: `${parseNickname(loaderData.profile.address, loaderData.profile.nickname)}'s collection`,
        })
      : undefined,
  }),
});

function RouteComponent() {
  return <ProfileObjektRender />;
}
