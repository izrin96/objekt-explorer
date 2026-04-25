import { createFileRoute } from "@tanstack/react-router";

import ProfileStatsRender from "@/components/profile/stats/stats-render";

export const Route = createFileRoute("/@{$nickname}/stats")({
  head: () => ({
    meta: [{ title: "Stats · Objekt Tracker" }],
  }),
  component: ProfileStatsPage,
});

function ProfileStatsPage() {
  return <ProfileStatsRender />;
}
