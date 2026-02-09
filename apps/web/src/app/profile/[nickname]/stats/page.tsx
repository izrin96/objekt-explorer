import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import ProfileStatsRender from "@/components/profile/stats/stats-render";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const [profile, t] = await Promise.all([
    getUserByIdentifier(params.nickname),
    getTranslations("page_titles"),
  ]);

  return {
    title: t("profile_stats", {
      nickname: parseNickname(profile.address, profile.nickname),
    }),
  };
}

export default async function UserChartPage() {
  return <ProfileStatsRender />;
}
