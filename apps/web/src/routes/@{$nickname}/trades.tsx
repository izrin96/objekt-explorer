import { createFileRoute } from "@tanstack/react-router";

import { profileQuery } from "@/features/profile/queries";
import { tradesSearchSchema } from "@/features/profile/trades/search-schema";
import { TradesView } from "@/features/profile/trades/trades-view";
import { displayNickname } from "@/lib/address";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/trades")({
  validateSearch: tradesSearchSchema,
  loader: ({ params, context: { queryClient } }) =>
    queryClient.ensureQueryData(profileQuery({ nickname: params.nickname })),
  head: ({ loaderData }) =>
    loaderData
      ? generateMetadata({
          title: m.page_titles_profile_trades({
            nickname: displayNickname(loaderData.address, loaderData.nickname),
          }),
        })
      : {},
  component: TradesView,
});
