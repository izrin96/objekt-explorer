import type { Metadata } from "next";

import { ProfileObjektRenderDynamic } from "@/components/profile/profile-objekt";
import { getUserByIdentifier } from "@/lib/client-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
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
    title: `${parseNickname(profile.address, profile.nickname)}'s Collection`,
  };
}

export default async function UserCollectionPage(props: Props) {
  const queryClient = getQueryClient();
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);

  void queryClient.prefetchQuery(
    orpc.pins.list.queryOptions({
      input: profile.address,
    }),
  );

  void queryClient.prefetchQuery(
    orpc.lockedObjekt.list.queryOptions({
      input: profile.address,
    }),
  );

  return (
    <HydrateClient client={queryClient}>
      <ProfileObjektRenderDynamic />
    </HydrateClient>
  );
}
