import { Addresses } from "@repo/lib";
import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ProfileObjektRender from "@/components/profile/profile-objekt";
import ProfileObjektServer from "@/components/profile/profile-objekt-server";
import { generateMetadata } from "@/lib/meta";
import { profileByNicknameQuery } from "@/lib/queries/profile";
import { parseNickname } from "@/lib/utils";

export const Route = createFileRoute("/@{$nickname}/")({
  loader: async ({ params, context: { queryClient } }) => {
    const profile = await queryClient.ensureQueryData(
      profileByNicknameQuery({ nickname: params.nickname }),
    );
    return { profile };
  },
  head: async ({ loaderData }) => {
    const content = getIntlayer("page_titles");
    return loaderData?.profile
      ? generateMetadata({
          title: content.profile_collection({
            nickname: parseNickname(loaderData.profile.address, loaderData.profile.nickname),
          }).value,
        })
      : {};
  },
  component: ProfileCollectionPage,
  ssr: false,
});

function ProfileCollectionPage() {
  const { profile } = Route.useLoaderData();

  if (profile.address.toLowerCase() === Addresses.SPIN) {
    return <ProfileObjektServer />;
  }

  return <ProfileObjektRender />;
}
