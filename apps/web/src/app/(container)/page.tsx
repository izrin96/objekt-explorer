import { IndexRenderDynamic } from "@/components/index/index-view";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

export default async function Home() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery(orpc.filterData.queryOptions());

  return (
    <div className="flex flex-col pt-2 pb-36">
      <HydrateClient client={queryClient}>
        <IndexRenderDynamic />
      </HydrateClient>
    </div>
  );
}
