import { IntlayerClientProvider } from "next-intlayer";
import { type PropsWithChildren } from "react";

import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { FilterDataProvider } from "@/hooks/use-filter-data";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

type ProvidersProps = PropsWithChildren<{ locale: string }>;

export async function Providers({ children, locale }: ProvidersProps) {
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
      <IntlayerClientProvider locale={locale}>
        <CosmoArtistProvider artists={artists}>
          <FilterDataProvider data={filterData}>{children}</FilterDataProvider>
        </CosmoArtistProvider>
      </IntlayerClientProvider>
    </HydrateClient>
  );
}
