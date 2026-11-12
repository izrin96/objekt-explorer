import { noop, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ProfileLists, ProfileListsSkeleton } from "@/features/list/profile-lists";
import { profileListsOptions, profilePreviewsOptions } from "@/features/list/queries";
import { profileQuery } from "@/features/profile/queries";
import { loadProfile, profileTabHead } from "@/features/profile/tab-route";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/list")({
  loader: async (match) => {
    const { queryClient } = match.context;
    const profile = await loadProfile(match);
    await Promise.all([
      queryClient.query({ ...profileListsOptions(profile.address), staleTime: "static" }),
      // a failed preview read leaves the rows to fetch it again, not the page to fail
      queryClient
        .query({ ...profilePreviewsOptions(profile.address), staleTime: "static" })
        .catch(noop),
    ]);
    return profile;
  },
  head: profileTabHead(m.page_titles_profile_lists),
  component: ProfileListsPage,
  pendingComponent: ProfileListsSkeleton,
});

function ProfileListsPage() {
  const { nickname } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname }));

  return <ProfileLists address={profile.address} />;
}
