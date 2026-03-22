import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/@$nickname/stats")({
  head: () => ({
    meta: [{ title: "Stats · Objekt Tracker" }],
  }),
  component: ProfileStatsPage,
});

function ProfileStatsPage() {
  return <div>Profile Stats</div>;
}
