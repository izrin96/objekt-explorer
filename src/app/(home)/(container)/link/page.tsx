import type { Metadata } from "next";
import { redirect } from "next/navigation";
import MyLinkRender from "@/components/link/my-link";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Cosmo Link",
  };
}

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  api.profile.list.prefetch();

  return (
    <div className="flex flex-col pt-2 pb-36">
      <div className="flex flex-col gap-4">
        <div className="font-semibold text-xl">My Cosmo</div>
        <HydrateClient>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
