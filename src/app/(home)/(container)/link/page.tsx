import MyLinkRender from "@/components/link/my-link";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";
import { redirect } from "next/navigation";
import React from "react";

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  api.profile.getAll.prefetch();

  return (
    <div className="flex flex-col pb-8 pt-2">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">My Cosmo</div>
        <HydrateClient>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
