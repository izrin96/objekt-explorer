import ListRender from "@/components/list/list-view";
import { api, HydrateClient } from "@/lib/trpc/server";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { cachedSession } from "@/lib/server/auth";
import { fetchList, fetchOwnedLists } from "@/lib/server/api/routers/list";
import { UserProvider } from "@/hooks/use-user";
import ListHeader from "@/components/list/list-header";

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
  const params = await props.params;

  const data = await fetchList(params.slug);
  if (!data) notFound();

  const session = await cachedSession();

  const [lists] = await Promise.all([
    session ? fetchOwnedLists(session.user.id) : undefined,
  ]);

  api.list.getEntries.prefetch(params.slug);

  return (
    <UserProvider lists={lists}>
      <div className="flex flex-col pb-8 pt-2 gap-4">
        <ListHeader list={data} />

        <HydrateClient>
          <ListRender slug={params.slug} />
        </HydrateClient>
      </div>
    </UserProvider>
  );
}
