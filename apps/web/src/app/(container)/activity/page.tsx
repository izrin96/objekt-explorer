import type { Metadata } from "next";
import { ActivityRenderDynamic } from "@/components/activity/activity-render";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Activity",
  };
}

export default function Page() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery(orpc.filterData.queryOptions());

  return (
    <HydrateClient client={queryClient}>
      <ActivityRenderDynamic />
    </HydrateClient>
  );
}
