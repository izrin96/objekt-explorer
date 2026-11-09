import { createFileRoute } from "@tanstack/react-router";

import { filterSearchSchema } from "@/features/filters/search-schema";
import { StatsView } from "@/features/profile/stats/stats-view";
import { loadProfile, profileTabHead } from "@/features/profile/tab-route";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/stats")({
  validateSearch: filterSearchSchema,
  loader: loadProfile,
  head: profileTabHead(m.page_titles_profile_stats),
  component: StatsView,
});
