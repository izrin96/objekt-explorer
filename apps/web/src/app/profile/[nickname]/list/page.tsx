import ProfileLists from "@/components/profile/profile-list";
import { getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";

type Props = {
  params: Promise<{
    nickname: string;
  }>;
};

export default async function ProfileListsPage(props: Props) {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery(
    orpc.list.profileLists.queryOptions({
      input: { profileAddress: profile.address },
    }),
  );

  return (
    <HydrateClient client={queryClient}>
      <ProfileLists />
    </HydrateClient>
  );
}
