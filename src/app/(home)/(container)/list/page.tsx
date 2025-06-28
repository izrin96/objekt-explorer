import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MyListRender from "@/components/list/my-list";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";

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
    <div className="flex flex-col pt-2 pb-36">
      <HydrateClient>
        <MyListRender />
      </HydrateClient>
    </div>
  );
}
