import type { Metadata } from "next";

import ProfileTradesRender from "@/components/profile/trades/profile-trades";
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
    title: `${parseNickname(profile.address, profile.nickname)}'s Trades`,
  };
}

export default async function UserTransfersPage() {
  return <ProfileTradesRender />;
}
