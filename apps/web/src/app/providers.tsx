import { type PropsWithChildren } from "react";

import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

export async function Providers({ children }: PropsWithChildren) {
  const queryClient = getQueryClient();

  const filterData = await queryClient.ensureQueryData(orpc.config.getFilterData.queryOptions());
  const artists = await queryClient.ensureQueryData(orpc.config.getArtists.queryOptions());

  void queryClient.prefetchQuery(orpc.config.getSelectedArtists.queryOptions());

  void queryClient.prefetchQuery({
    queryKey: ["session"],
    queryFn: () => getSession(),
  });

  return (
    <HydrateClient client={queryClient}>
      <CosmoArtistProvider artists={artists}>
        <FilterDataProvider data={filterData}>{children}</FilterDataProvider>
      </CosmoArtistProvider>
    </HydrateClient>
  );
}
