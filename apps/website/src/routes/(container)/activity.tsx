import { createFileRoute } from "@tanstack/react-router";

import ActivityRender from "@/components/activity/activity-render";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/activity")({
  head: () => {
    return generateMetadata({ title: m.page_titles_activity() });
  },
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityRender />;
}
