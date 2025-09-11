import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MyListRender from "@/components/list/my-list";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My List`,
  };
}

export default async function Page() {
  const queryClient = getQueryClient();
  const session = await getSession();

  if (!session) redirect("/");

  queryClient.prefetchQuery(orpc.list.list.queryOptions());

  return (
    <div className="flex flex-col pt-2 pb-36">
      <HydrateClient client={queryClient}>
        <MyListRender />
      </HydrateClient>
    </div>
  );
}
