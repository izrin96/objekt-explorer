import IndexView from "@/components/index/index-view";
import { getArtistsWithMembers, getObjektsIndex } from "@/lib/client-fetching";

export const revalidate = 0;

export default async function Home() {
  const [objekts, artists] = await Promise.all([
    getObjektsIndex(),
    getArtistsWithMembers(),
  ]);

  return (
    <>
      <div className="py-1"></div>
      <IndexView objekts={objekts} artists={artists} />
    </>
  );
}
