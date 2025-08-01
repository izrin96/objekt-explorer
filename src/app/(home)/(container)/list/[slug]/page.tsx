import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchList, fetchOwnedLists } from "@/lib/server/api/routers/list";
import { cachedSession, toPublicUser } from "@/lib/server/auth";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await fetchList(params.slug);
  if (!data) notFound();
  return {
    title: `${data.name}${data.user ? ` · ${data.user.name}'s` : ""} List`,
  };
}

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const params = await props.params;

  const list = await fetchList(params.slug);
  if (!list) notFound();

  const session = await cachedSession();

  const [lists] = await Promise.all([session ? fetchOwnedLists(session.user.id) : undefined]);

  queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: params.slug,
    }),
  );

  return (
    <ProfileProvider targetList={list} lists={lists} user={toPublicUser(session)}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader list={list} />

        <HydrateClient client={queryClient}>
          <ListRender slug={params.slug} />
        </HydrateClient>
      </div>
    </ProfileProvider>
  );
}
