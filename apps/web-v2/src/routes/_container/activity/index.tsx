import { createFileRoute } from "@tanstack/react-router";
import ActivityRender from "@/components/activity/activity-render";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/_container/activity/")({
  component: RouteComponent,
  head: () => ({
    meta: seo({ title: "Activity" }),
  }),
});

function RouteComponent() {
  return <ActivityRender />;
}
