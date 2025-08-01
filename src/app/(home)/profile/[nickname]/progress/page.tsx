import type { Metadata } from "next";
import { ProgressRenderDynamic } from "@/components/profile/progress/progress-render";
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
    title: `${profile.nickname}'s Progress`,
  };
}

export default async function UserProgressPage() {
  return <ProgressRenderDynamic />;
}
