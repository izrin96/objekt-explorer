import type { Metadata } from "next";
import { ProfileTradesRenderDynamic } from "@/components/profile/trades/profile-trades";
import { getUserByIdentifier } from "@/lib/client-fetching";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);

  return {
    title: `${profile.nickname}'s Trades`,
  };
}

export default async function UserTransfersPage() {
  return <ProfileTradesRenderDynamic />;
}
