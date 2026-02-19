import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import ActivityRender from "@/components/activity/activity-render";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("page_titles");
  return {
    title: t("activity"),
  };
}

export default function Page() {
  return <ActivityRender />;
}
