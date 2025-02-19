import IndexView from "@/components/index/index-view";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { getArtistsWithMembers } from "@/lib/client-fetching";
import { getQueryClient } from "@/lib/query-client";
import { collectionOptions } from "@/lib/query-options";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const revalidate = 0;

export default async function Home() {
  const [artists] = await Promise.all([getArtistsWithMembers()]);

  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(collectionOptions);

  return (
    <>
      <div className="py-1"></div>
      <CosmoArtistProvider artists={artists}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IndexView artists={artists} />
        </HydrationBoundary>
      </CosmoArtistProvider>
    </>
  );
}
