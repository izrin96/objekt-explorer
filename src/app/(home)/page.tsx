import IndexView from "@/components/index/index-view";
import { CosmoArtistProvider } from "@/hooks/use-cosmo-artist";
import { getArtistsWithMembers } from "@/lib/client-fetching";

export const revalidate = 0;

export default async function Home() {
  const [artists] = await Promise.all([getArtistsWithMembers()]);

  return (
    <>
      <div className="py-1"></div>
      <CosmoArtistProvider artists={artists}>
        <IndexView artists={artists} />
      </CosmoArtistProvider>
    </>
  );
}
