import type { Metadata } from "next";

import { ActivityRenderDynamic } from "@/components/activity/activity-render";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Activity",
  };
}

export default function Page() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  return (
    <HydrateClient client={queryClient}>
      <ActivityRenderDynamic />
    </HydrateClient>
  );
}
