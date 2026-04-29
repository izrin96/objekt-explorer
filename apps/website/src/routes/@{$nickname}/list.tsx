import { createFileRoute } from "@tanstack/react-router";

import ProfileLists from "@/components/profile/profile-list";
import { orpc } from "@/lib/orpc/client";
import { profileQuery } from "@/lib/queries/profile";

export const Route = createFileRoute("/@{$nickname}/list")({
  // todo: head
  loader: async ({ context: { queryClient }, params }) => {
    const profile = await queryClient.ensureQueryData(profileQuery({ nickname: params.nickname }));
    void queryClient.prefetchQuery(
      orpc.list.profileLists.queryOptions({
        input: { profileAddress: profile.address },
      }),
    );
    return { profile };
  },
  component: ProfileListsPage,
});

function ProfileListsPage() {
  return <ProfileLists />;
}
