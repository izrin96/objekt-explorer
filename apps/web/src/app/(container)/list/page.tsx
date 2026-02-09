import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

import MyListRender from "@/components/list/my-list";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { getSession } from "@/lib/server/auth";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("page_titles");
  return {
    title: t("my_list"),
  };
}

export default async function Page() {
  const queryClient = getQueryClient();
  const session = await getSession();

  if (!session) redirect("/");

  void queryClient.prefetchQuery(orpc.list.list.queryOptions());

  return (
    <div className="flex flex-col pt-2 pb-36">
      <HydrateClient client={queryClient}>
        <MyListRender />
      </HydrateClient>
    </div>
  );
}
