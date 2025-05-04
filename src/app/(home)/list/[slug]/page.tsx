import ListRender from "@/components/list/list-view";
import { Avatar } from "@/components/ui";
import { api, HydrateClient } from "@/lib/trpc/server";
import { TRPCError } from "@trpc/server";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { auth } from "@/lib/server/auth";
import { headers } from "next/headers";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { user, name } = await api.list.get(params.slug);
  return {
    title: `${name} - ${user.name}'s List`,
  };
}

async function fetchData(params: Awaited<Props["params"]>) {
  try {
    return await api.list.get(params.slug);
  } catch (err) {
    if (err instanceof TRPCError && err.code == "NOT_FOUND") {
      // todo: maybe trpc not a good idea for rsc
      // or back to classic /api route
      notFound();
    }
    throw new Error();
  }
}

export default async function Page(props: Props) {
  const params = await props.params;
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const data = await fetchData(params);
  const { user, name } = data;

  api.list.getEntries.prefetch(params.slug);

  return (
    <div className="flex flex-col pb-8 pt-2 gap-4">
      <div className="flex gap-3">
        <Avatar
          size="extra-large"
          className="self-center"
          src={user.image}
          alt={user.name}
        />
        <div className="flex flex-col">
          <div className="text-lg font-semibold">{name}</div>
          <div className="text-sm text-muted-fg inline-flex items-center gap-1">
            <span>{user.name}</span>
            <DiscordLogo />
          </div>
        </div>
      </div>

      <HydrateClient>
        <ListRender
          slug={params.slug}
          isOwned={(session && session.user.id === user.id) ?? false}
        />
      </HydrateClient>
    </div>
  );
}
