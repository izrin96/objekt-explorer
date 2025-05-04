import MyList from "@/components/list/my-list";
import { api, HydrateClient } from "@/lib/trpc/server";
import { Metadata } from "next";
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `My List`,
  };
}

export default async function Page() {
  await api.list.myList.prefetch();

  return (
    <HydrateClient>
      <MyList />
    </HydrateClient>
  );
}
