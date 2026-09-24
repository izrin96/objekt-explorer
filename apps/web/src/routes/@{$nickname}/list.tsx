import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ProfileLists } from "@/features/list/profile-lists";
import { profileListsOptions } from "@/features/list/queries";
import { profileQuery } from "@/features/profile/queries";
import { displayNickname } from "@/lib/address";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/list")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.query({
      ...profileQuery({ nickname: params.nickname }),
      staleTime: "static",
    });
    await queryClient.query({ ...profileListsOptions(profile.address), staleTime: "static" });
    return profile;
  },
  head: ({ loaderData }) =>
    loaderData
      ? generateMetadata({
          title: m.page_titles_profile_lists({
            nickname: displayNickname(loaderData.address, loaderData.nickname),
          }),
        })
      : {},
  component: ProfileListsPage,
});

function ProfileListsPage() {
  const { nickname } = Route.useParams();
  const { data: profile } = useSuspenseQuery(profileQuery({ nickname }));

  return <ProfileLists address={profile.address} />;
}
