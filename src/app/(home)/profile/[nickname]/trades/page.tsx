import ProfileTradesRender from "@/components/profile/profile-trades";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { Metadata } from "next";

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

export default async function UserTransfersPage(props: Props) {
  const params = await props.params;

  const [targetUser] = await Promise.all([
    getUserByIdentifier(params.nickname),
  ]);

  return <ProfileTradesRender profile={targetUser} />;
}
