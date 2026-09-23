import { createFileRoute } from "@tanstack/react-router";

import { filterSearchSchema } from "@/features/filters/search-schema";
import { profileQuery } from "@/features/profile/queries";
import { StatsView } from "@/features/profile/stats/stats-view";
import { displayNickname } from "@/lib/address";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/stats")({
  validateSearch: filterSearchSchema,
  loader: ({ params, context: { queryClient } }) =>
    queryClient.ensureQueryData(profileQuery({ nickname: params.nickname })),
  head: ({ loaderData }) =>
    loaderData
      ? generateMetadata({
          title: m.page_titles_profile_stats({
            nickname: displayNickname(loaderData.address, loaderData.nickname),
          }),
        })
      : {},
  component: StatsView,
});
