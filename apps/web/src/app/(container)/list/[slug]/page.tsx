import type { Metadata } from "next";
import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { TargetProvider } from "@/hooks/use-target";
import { UserProvider } from "@/hooks/use-user";
import { getList } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchOwnedLists } from "@/lib/server/api/routers/list";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getList(params.slug);
  return {
    title: `${data.name}${data.user ? ` · ${data.user.name}'s` : ""} List`,
  };
}

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([
    props.params,
    queryClient.ensureQueryData(orpc.session.queryOptions()),
  ]);

  const [list, lists] = await Promise.all([
    getList(params.slug),
    session ? fetchOwnedLists(session.user.id) : undefined,
  ]);

  queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
      },
    }),
  );

  queryClient.prefetchQuery(orpc.filterData.queryOptions());

  return (
    <UserProvider lists={lists}>
      <TargetProvider list={list}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <HydrateClient client={queryClient}>
            <ListRender />
          </HydrateClient>
        </div>
      </TargetProvider>
    </UserProvider>
  );
}
