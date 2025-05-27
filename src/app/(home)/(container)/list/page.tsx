import MyListRender from "@/components/list/my-list";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My List`,
  };
}

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  api.list.myList.prefetch();

  return (
    <div className="flex flex-col pb-36 pt-2">
      <HydrateClient>
        <MyListRender />
      </HydrateClient>
    </div>
  );
}
