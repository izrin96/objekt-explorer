import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getList } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
import { fetchOwnedLists } from "@/lib/server/api/routers/list";
import { getSession } from "@/lib/server/auth";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const [data, t] = await Promise.all([getList(params.slug), getTranslations("page_titles")]);

  return {
    title: data.user
      ? t("list_detail_with_user", { name: data.name, user: data.user.name })
      : t("list_detail", { name: data.name }),
  };
}

export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const [params, session] = await Promise.all([props.params, getSession()]);

  const [list, lists] = await Promise.all([
    getList(params.slug),
    session ? fetchOwnedLists(session.user.id) : undefined,
  ]);

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
      },
    }),
  );

  return (
    <ProfileProvider targetList={list} lists={lists}>
      <HydrateClient client={queryClient}>
        <div className="flex flex-col gap-4 pt-2 pb-36">
          <ListHeader />
          <ListRender />
        </div>
      </HydrateClient>
    </ProfileProvider>
  );
}
