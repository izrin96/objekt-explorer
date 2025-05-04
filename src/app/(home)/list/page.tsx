import MyList from "@/components/list/my-list";
import { auth } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";
import { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import React from "react";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My List`,
  };
}

export default async function Page() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/");

  await api.list.myList.prefetch();

  return (
    <HydrateClient>
      <MyList />
    </HydrateClient>
  );
}
