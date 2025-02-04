import IndexView from "@/components/index/index-view";
import { getArtistsWithMembers } from "@/lib/client-fetching";

export const revalidate = 0;

export default async function Home() {
  const [artists] = await Promise.all([getArtistsWithMembers()]);

  return (
    <>
      <div className="py-1"></div>
      <IndexView artists={artists} />
    </>
  );
}
