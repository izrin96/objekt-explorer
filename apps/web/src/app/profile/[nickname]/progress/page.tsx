import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import ProgressRender from "@/components/profile/progress/progress-render";
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
    title: content.profile_progress({ nickname: parseNickname(profile.address, profile.nickname) })
      .value,
  };
}

export default async function UserProgressPage() {
  return <ProgressRender />;
}
