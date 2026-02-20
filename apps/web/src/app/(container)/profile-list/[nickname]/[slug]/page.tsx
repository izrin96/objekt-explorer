import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getUserByIdentifier, getList } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import { parseNickname } from "@/lib/utils";

type Props = {
  params: Promise<{
    nickname: string;
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);
  const list = await getList(params.slug, profile.address);

  return {
    title: `${list.name} - ${parseNickname(profile.address, profile.nickname)}`,
  };
}

export default async function ProfileListPage(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const profile = await getUserByIdentifier(params.nickname);
  const list = await getList(params.slug, profile.address);

  profile.isOwned =
    profile.ownerId && session?.user.id ? profile.ownerId === session.user.id : false;
  list.isOwned = list.ownerId && session?.user.id ? list.ownerId === session.user.id : false;

  // Validate list belongs to this profile
  const isProfileList =
    list.listType === "profile" &&
    list.profileAddress?.toLowerCase() === profile.address.toLowerCase();
  const isBoundNormalList =
    list.listType === "normal" &&
    list.profileAddress?.toLowerCase() === profile.address.toLowerCase();

  if (!isProfileList && !isBoundNormalList) {
    // If it's a normal list that's not bound to this profile, redirect to normal list route
    if (list.listType === "normal") {
      redirect(`/list/${params.slug}`);
    }
    notFound();
  }

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
        profileAddress: profile.address,
      },
    }),
  );

  return (
    <ProfileProvider targetProfile={profile} targetList={list}>
      <HydrateClient client={queryClient}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </HydrateClient>
    </ProfileProvider>
  );
}
