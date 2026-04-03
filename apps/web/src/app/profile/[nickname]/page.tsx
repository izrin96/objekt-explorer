import { Addresses } from "@repo/lib";
import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import ProfileObjektRender from "@/components/profile/profile-objekt";
import ProfileObjektServer from "@/components/profile/profile-objekt-server";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);
  const content = useIntlayer("page_titles");

  return {
    title: content.profile_collection({
      nickname: parseNickname(profile.address, profile.nickname),
    }).value,
  };
}

export default async function UserCollectionPage(props: Props) {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);

  if (profile.address.toLowerCase() === Addresses.SPIN) {
    return <ProfileObjektServer />;
  }

  return <ProfileObjektRender />;
}
