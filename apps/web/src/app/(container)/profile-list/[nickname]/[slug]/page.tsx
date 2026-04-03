import type { Metadata } from "next";
import { useIntlayer } from "next-intlayer/server";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getUserByIdentifier, getList } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

export async function generateMetadata(
  props: PageProps<"/profile-list/[nickname]/[slug]">,
): Promise<Metadata> {
  const params = await props.params;
  const profile = await getUserByIdentifier(params.nickname);
  const list = await getList(params.slug, profile.address);
  const content = useIntlayer("page_titles");

  return {
    title: content.list_detail({ name: list.name }).value,
  };
}

export default async function ProfileListPage(props: PageProps<"/profile-list/[nickname]/[slug]">) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const profile = await getUserByIdentifier(params.nickname);
  const list = await getList(params.slug, profile.address);

  profile.isOwned =
    profile.ownerId && session?.user.id ? profile.ownerId === session.user.id : false;
  list.isOwned = list.ownerId && session?.user.id ? list.ownerId === session.user.id : false;

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
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
