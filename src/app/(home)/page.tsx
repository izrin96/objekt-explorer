import IndexView from "@/components/index/index-view";
import { getQueryClient } from "@/lib/query-client";
import { collectionOptions } from "@/lib/query-options";
import { auth } from "@/lib/server/auth";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { headers } from "next/headers";

export const revalidate = 0;

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery(collectionOptions);

  return (
    <div className="flex flex-col pb-8 pt-2">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <IndexView loggedIn={!!session} />
      </HydrationBoundary>
    </div>
  );
}
