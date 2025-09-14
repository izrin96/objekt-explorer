import type { Metadata } from "next";
import { ProfileObjektRenderDynamic } from "@/components/profile/profile-objekt";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);

  return {
    title: `${parseNickname(profile.address, profile.nickname)}'s Collection`,
  };
}

export default async function UserCollectionPage() {
  return <ProfileObjektRenderDynamic />;
}
