import ProgressRender from "@/components/profile/progress/progress-render";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import {
  getArtistsWithMembers,
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
    title: `${profile.nickname}'s Progress`,
  };
}

export default async function UserProgressPage(props: Props) {
  const params = await props.params;

  const [targetUser, artists] = await Promise.all([
    getUserByIdentifier(params.nickname),
    getArtistsWithMembers(),
  ]);

  return (
    <CosmoArtistProvider artists={artists}>
      <ProgressRender profile={targetUser} artists={artists} />
    </CosmoArtistProvider>
  );
}
