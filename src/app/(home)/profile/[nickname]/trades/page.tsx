import type { Metadata } from "next";
import { ProfileTradesRenderDynamic } from "@/components/profile/trades/profile-trades";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);

  return {
    title: `${parseNickname(profile.address, profile.nickname)}'s Trades`,
  };
}

export default async function UserTransfersPage() {
  const queryClient = getQueryClient();

  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  return (
    <HydrateClient client={queryClient}>
      <ProfileTradesRenderDynamic />
    </HydrateClient>
  );
}
