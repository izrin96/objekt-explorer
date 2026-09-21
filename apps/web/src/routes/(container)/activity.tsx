import { createFileRoute } from "@tanstack/react-router";

import { ActivityView } from "@/features/activity/activity-view";
import { activitySearchSchema } from "@/features/activity/search-schema";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/(container)/activity")({
  validateSearch: activitySearchSchema,
  head: () => generateMetadata({ title: m.activity_title() }),
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityView />;
}
