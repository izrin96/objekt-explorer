import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getList } from "@/lib/client-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchOwnedLists } from "@/lib/server/api/routers/list";
import { getSession, toPublicUser } from "@/lib/server/auth";
import { fetchFilterData } from "@/lib/server/objekts/filter-data";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getList(params.slug);
  if (!data) notFound();
  return {
    title: `${data.name}${data.user ? ` · ${data.user.name}'s` : ""} List`,
  };
}

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const [list, lists] = await Promise.all([
    getList(params.slug),
    session ? fetchOwnedLists(session.user.id) : undefined,
  ]);

  if (!list) notFound();

  queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
      },
    }),
  );

  queryClient.prefetchQuery({
    queryKey: ["filter-data"],
    queryFn: fetchFilterData,
  });

  return (
    <ProfileProvider targetList={list} lists={lists} user={toPublicUser(session)}>
      <div className="flex flex-col gap-4 pt-2 pb-36">
        <ListHeader />
        <HydrateClient client={queryClient}>
          <ListRender />
        </HydrateClient>
      </div>
    </ProfileProvider>
  );
}
