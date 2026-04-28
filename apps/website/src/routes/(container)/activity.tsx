import { createFileRoute } from "@tanstack/react-router";
import { getIntlayer } from "react-intlayer";

import ActivityRender from "@/components/activity/activity-render";
import { generateMetadata } from "@/lib/meta";

export const Route = createFileRoute("/(container)/activity")({
  head: () => {
    const content = getIntlayer("page_titles");
    return generateMetadata({ title: content.activity.value });
  },
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityRender />;
}
