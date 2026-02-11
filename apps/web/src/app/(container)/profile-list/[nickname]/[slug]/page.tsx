import type { Metadata } from "next";

import { notFound } from "next/navigation";

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
  const [list, profile] = await Promise.all([
    getList(params.slug),
    getUserByIdentifier(params.nickname),
  ]);

  return {
    title: `${list.name} - ${parseNickname(profile.address, profile.nickname)}`,
  };
}

export default async function ProfileListPage(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const [list, profile] = await Promise.all([
    getList(params.slug, session?.user.id),
    getUserByIdentifier(params.nickname, session?.user.id),
  ]);

  if (list.listType !== "profile") {
    notFound();
  }

  // Verify the list belongs to this profile
  if (list.profileAddress?.toLowerCase() !== profile.address.toLowerCase()) {
    notFound();
  }

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
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
