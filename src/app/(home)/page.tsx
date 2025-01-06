import IndexView from "@/components/index/index-view";
import { getArtistsWithMembers } from "@/lib/client-fetching";
import { fetchObjektsIndex } from "@/lib/server/objekts/objekt-index";

export const revalidate = 0;

export default async function Home() {
  const [objekts, artists] = await Promise.all([
    fetchObjektsIndex(),
    getArtistsWithMembers(),
  ]);

  return (
    <>
      <div className="py-1"></div>
      <IndexView objekts={objekts} artists={artists} />
    </>
  );
}
