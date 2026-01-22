import { IndexRenderDynamic } from "@/components/index/index-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession, toPublicUser } from "@/lib/server/auth";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";

export default async function Home() {
  const queryClient = getQueryClient();
  const session = await getSession();

  void queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  return (
    <div className="flex flex-col pt-2 pb-36">
      <ProfileProvider user={toPublicUser(session)}>
        <HydrateClient client={queryClient}>
          <IndexRenderDynamic />
        </HydrateClient>
      </ProfileProvider>
    </div>
  );
}
