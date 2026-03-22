import { createFileRoute } from "@tanstack/react-router";

import ActivityRender from "@/components/activity/activity-render";

export const Route = createFileRoute("/_container/activity")({
  head: () => ({
    meta: [{ title: "Activity · Objekt Tracker" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return <ActivityRender />;
}
