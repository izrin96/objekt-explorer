import ProfileStatsRender from "@/components/profile/stats/stats-render";
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
    title: `${profile.nickname}'s Stats`,
  };
}

export default async function UserChartPage() {
  return <ProfileStatsRender />;
}
