import { createFileRoute } from "@tanstack/react-router";

import { filterSearchSchema } from "@/features/filters/search-schema";
import { CollectionView } from "@/features/profile/collection-view";
import { profileQuery } from "@/features/profile/queries";
import { displayNickname } from "@/lib/address";
import { generateMetadata } from "@/lib/meta";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/@{$nickname}/")({
  validateSearch: filterSearchSchema,
  // another profile starts fresh, so an open objekt drawer does not carry over to it
  remountDeps: ({ params }) => params.nickname,
  loader: ({ params, context: { queryClient } }) =>
    queryClient.query({ ...profileQuery({ nickname: params.nickname }), staleTime: "static" }),
  head: ({ loaderData }) =>
    loaderData
      ? generateMetadata({
          title: m.page_titles_profile_collection({
            nickname: displayNickname(loaderData.address, loaderData.nickname),
          }),
        })
      : {},
  component: CollectionView,
});
