import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_container/activity")({
  head: () => ({
    meta: [{ title: "Activity · Objekt Tracker" }],
  }),
  component: ActivityPage,
});

function ActivityPage() {
  return <div>Activity</div>;
}
