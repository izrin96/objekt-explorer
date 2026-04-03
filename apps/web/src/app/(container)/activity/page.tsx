import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import ActivityRender from "@/components/activity/activity-render";

export async function generateMetadata(): Promise<Metadata> {
  const content = useIntlayer("page_titles");
  return {
    title: content.activity.value,
  };
}

export default function Page() {
  return <ActivityRender />;
}
