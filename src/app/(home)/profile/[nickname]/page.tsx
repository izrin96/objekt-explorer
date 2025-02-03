import ProfileObjektRender from "@/components/profile/profile-objekt";
import {
  getArtistsWithMembers,
  getObjektsIndex,
  getUserByIdentifier,
} from "@/lib/client-fetching";
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
    title: `${profile.nickname}'s Collection`,
  };
}

export default async function UserCollectionPage(props: Props) {
  const params = await props.params;

  const [targetUser, artists, objekts] = await Promise.all([
    getUserByIdentifier(params.nickname),
    getArtistsWithMembers(),
    getObjektsIndex(),
  ]);

  return (
    <ProfileObjektRender
      objekts={objekts}
      profile={targetUser}
      artists={artists}
    />
  );
}
