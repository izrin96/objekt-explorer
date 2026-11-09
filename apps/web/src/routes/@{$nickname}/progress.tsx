import { createFileRoute } from "@tanstack/react-router";

import { filterSearchSchema } from "@/features/filters/search-schema";
import { ProgressView } from "@/features/profile/progress/progress-view";
import { loadProfile, profileTabHead } from "@/features/profile/tab-route";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/progress")({
  validateSearch: filterSearchSchema,
  loader: loadProfile,
  head: profileTabHead(m.page_titles_profile_progress),
  component: ProgressView,
});
