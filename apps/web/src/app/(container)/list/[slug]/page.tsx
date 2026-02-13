import type { Metadata } from "next";

import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

import ListHeader from "@/components/list/list-header";
import ListRender from "@/components/list/list-view";
import { ProfileProvider } from "@/components/profile-provider";
import { getList, getUserByIdentifier } from "@/lib/data-fetching";
import { orpc } from "@/lib/orpc/client";
import { getQueryClient, HydrateClient } from "@/lib/query/hydration";
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

  const list = await getList(params.slug, session?.user.id);

  if (list.listType === "profile") {
    notFound();
  }

  // Redirect normal lists bound to a profile
  if (list.displayProfileAddress) {
    const profile = await getUserByIdentifier(list.displayProfileAddress);
    const urlSlug = list.profileSlug || params.slug; // Use profileSlug if available
    redirect(`/@${profile.nickname || profile.address}/list/${urlSlug}`);
  }

  void queryClient.prefetchQuery(
    orpc.list.listEntries.queryOptions({
      input: {
        slug: params.slug,
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
