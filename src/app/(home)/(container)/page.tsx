import IndexView from "@/components/index/index-view";
import { UserProvider } from "@/hooks/use-user";
import { getQueryClient } from "@/lib/query-client";
import { collectionOptions } from "@/lib/query-options";
import { cachedSession, toPublicUser } from "@/lib/server/auth";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const revalidate = 0;

export default async function Home() {
  const queryClient = getQueryClient();
  const session = await cachedSession();
  queryClient.prefetchQuery(collectionOptions);

  return (
    <div className="flex flex-col pb-8 pt-2">
      <UserProvider user={toPublicUser(session)}>
        <HydrationBoundary state={dehydrate(queryClient)}>
          <IndexView />
        </HydrationBoundary>
      </UserProvider>
    </div>
  );
}
