import MyLinkRender from "@/components/link/my-link";
import { cachedSession } from "@/lib/server/auth";
import { api, HydrateClient } from "@/lib/trpc/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import React from "react";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Cosmo Link",
  };
}

export default async function Page() {
  const session = await cachedSession();

  if (!session) redirect("/");

  api.profile.getAll.prefetch();

  return (
    <div className="flex flex-col pb-36 pt-2">
      <div className="flex flex-col gap-4">
        <div className="text-xl font-semibold">My Cosmo</div>
        <HydrateClient>
          <MyLinkRender />
        </HydrateClient>
      </div>
    </div>
  );
}
