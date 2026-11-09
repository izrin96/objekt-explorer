import { createFileRoute } from "@tanstack/react-router";

import { loadProfile, profileTabHead } from "@/features/profile/tab-route";
import { tradesSearchSchema } from "@/features/profile/trades/search-schema";
import { TradesView } from "@/features/profile/trades/trades-view";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/trades")({
  validateSearch: tradesSearchSchema,
  loader: loadProfile,
  head: profileTabHead(m.page_titles_profile_trades),
  component: TradesView,
});
