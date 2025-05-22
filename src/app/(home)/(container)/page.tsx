import IndexView from "@/components/index/index-view";
import { UserProvider } from "@/hooks/use-user";
import { getQueryClient } from "@/lib/query-client";
import { collectionOptions } from "@/lib/query-options";
import { cachedSession, toPublicUser } from "@/lib/server/auth";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

export const revalidate = 0;

export default async function Home() {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery(collectionOptions);
  const session = await cachedSession();

  return (
    <div className="flex flex-col pb-8 pt-2">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <UserProvider user={toPublicUser(session)}>
          <IndexView />
        </UserProvider>
      </HydrationBoundary>
    </div>
  );
}
