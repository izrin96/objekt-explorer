import type { Metadata, Route } from "next";
import { useIntlayer } from "next-intlayer/server";
import { redirect } from "next/navigation";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getList, getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";
import type { PublicList } from "@/lib/universal/user";

export async function generateMetadata(props: PageProps<"/list/[slug]">): Promise<Metadata> {
  const params = await props.params;
  const data = await getList(params.slug);
  const content = useIntlayer("page_titles");

  return {
    title: content.list_detail({ name: data.name }).value,
  };
}

export default async function Page(props: PageProps<"/list/[slug]">) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const result = await getList(params.slug);

  const { ownerId, ...safeList } = result;
  const list: PublicList = {
    ...safeList,
    isOwned: ownerId && session?.user.id ? ownerId === session.user.id : false,
  };

  // Redirect normal lists bound to a profile
  if (list.profileAddress && (list.profileSlug || list.slug)) {
    const profile = await getUserByIdentifier(list.profileAddress);
    redirect(
      `/@${profile.nickname || profile.address}/list/${list.profileSlug || list.slug}` as Route,
    );
  }

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: list.slug,
      },
    }),
  );

  return (
    <ProfileProvider targetList={list}>
      <HydrateClient client={queryClient}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </HydrateClient>
    </ProfileProvider>
  );
}
